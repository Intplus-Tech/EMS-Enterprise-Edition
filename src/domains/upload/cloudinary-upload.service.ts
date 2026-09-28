import { v2 as cloudinary } from "cloudinary";
import { IFileUploadService } from "./file-upload.interface";
import { ENV } from "../../config/env";

const isConfigured = ENV.isCloudinaryConfigured;

if (isConfigured) {
  cloudinary.config({
    cloud_name: ENV.CLOUDINARY_CLOUD_NAME,
    api_key: ENV.CLOUDINARY_API_KEY,
    api_secret: ENV.CLOUDINARY_API_SECRET,
  });
}

/**
 * Translates a Cloudinary SDK error into something a human can act on.
 *
 * The upload endpoint returns its JSON error body brotli-compressed, which the
 * Node SDK does not decode — so every failure arrives as the opaque
 * "Server returned unexpected status code - <code>" with the real reason
 * (e.g. `x-cld-error: missing permissions (actions=["create"])`) discarded.
 * Mapping the status codes back to a cause is the only way these surface
 * usefully in the UI banner and the audit log.
 */
function describeCloudinaryError(error: any): string {
  switch (error?.http_code) {
    case 401:
      return "Cloudinary rejected the credentials (401). Verify CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET belong to CLOUDINARY_CLOUD_NAME.";
    case 403:
      return 'Cloudinary refused the upload (403): the API key is authenticated but lacks the "create" permission. Grant that key upload access under Console → Settings → API Keys, or issue a full-access key.';
    case 420:
    case 429:
      return `Cloudinary rate limit reached (${error.http_code}). Please retry shortly.`;
    default:
      return `Cloudinary storage error: ${error?.message || "unknown failure"}`;
  }
}

export class CloudinaryUploadServiceClass implements IFileUploadService {
  /**
   * Uploads a file buffer to Cloudinary.
   */
  public async upload(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    folder: string = ENV.CLOUDINARY_UPLOAD_FOLDER
  ): Promise<{ url: string; publicId: string }> {
    if (!isConfigured) {
      console.warn(
        "[CloudinaryUploadService] Credentials not set. Falling back to mock URL."
      );
      const mockPublicId = `mock_${Date.now()}_${fileName.replace(/\s+/g, "_")}`;
      return {
        url: `/uploads/${mockPublicId}`,
        publicId: mockPublicId,
      };
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: "auto",
          filename_override: fileName,
        },
        (error, result) => {
          if (error) {
            const reason = describeCloudinaryError(error);
            if (!ENV.isProduction) {
              console.warn(
                `[CloudinaryUploadService] ${reason} Falling back to mock URL in development.`
              );
              const mockPublicId = `mock_${Date.now()}_${fileName.replace(/\s+/g, "_")}`;
              return resolve({
                url: `/uploads/${mockPublicId}`,
                publicId: mockPublicId,
              });
            }
            return reject(new Error(reason));
          }
          if (!result) {
            return reject(new Error("Upload returned undefined result"));
          }
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        }
      );
      uploadStream.end(fileBuffer);
    });
  }

  /**
   * Reads metadata of a file stored in Cloudinary.
   */
  public async read(
    publicId: string
  ): Promise<{ url: string; bytes: number; format: string; createdAt: Date }> {
    if (!isConfigured || publicId.startsWith("mock_")) {
      return {
        url: `/uploads/${publicId}`,
        bytes: 1024 * 150, // Mock 150KB
        format: "pdf",
        createdAt: new Date(),
      };
    }

    try {
      const resource = await cloudinary.api.resource(publicId);
      return {
        url: resource.secure_url,
        bytes: resource.bytes,
        format: resource.format,
        createdAt: new Date(resource.created_at),
      };
    } catch (error: any) {
      throw new Error(`Failed to read file. ${describeCloudinaryError(error)}`);
    }
  }

  /**
   * Replaces an existing file in Cloudinary.
   */
  public async update(
    publicId: string,
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<{ url: string; publicId: string }> {
    if (!isConfigured || publicId.startsWith("mock_")) {
      console.warn("[CloudinaryUploadService] Mock file update action.");
      return {
        url: `/uploads/${publicId}`,
        publicId,
      };
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          public_id: publicId,
          overwrite: true,
          resource_type: "auto",
        },
        (error, result) => {
          if (error) {
            return reject(new Error(describeCloudinaryError(error)));
          }
          if (!result) {
            return reject(new Error("Update returned undefined result"));
          }
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        }
      );
      uploadStream.end(fileBuffer);
    });
  }

  /**
   * Deletes a file from Cloudinary.
   */
  public async delete(publicId: string): Promise<boolean> {
    if (!isConfigured || publicId.startsWith("mock_")) {
      console.warn("[CloudinaryUploadService] Mock file delete action.");
      return true;
    }

    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === "ok";
    } catch (error: any) {
      throw new Error(`Failed to delete file. ${describeCloudinaryError(error)}`);
    }
  }
}

export const CloudinaryUploadService = new CloudinaryUploadServiceClass();
