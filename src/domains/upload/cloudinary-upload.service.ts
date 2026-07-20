import { v2 as cloudinary } from "cloudinary";
import { IFileUploadService } from "./file-upload.interface";

const isConfigured = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (isConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

export class CloudinaryUploadServiceClass implements IFileUploadService {
  /**
   * Uploads a file buffer to Cloudinary.
   */
  public async upload(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    folder: string = "expense-manager"
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
            return reject(error);
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
      throw new Error(`Failed to read file from Cloudinary: ${error.message}`);
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
            return reject(error);
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
      throw new Error(`Failed to delete file from Cloudinary: ${error.message}`);
    }
  }
}

export const CloudinaryUploadService = new CloudinaryUploadServiceClass();
