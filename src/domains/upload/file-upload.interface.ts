export interface IFileUploadService {
  /**
   * Uploads a file buffer to storage.
   * Returns secure URL and public storage identifier.
   */
  upload(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    folder?: string
  ): Promise<{ url: string; publicId: string }>;

  /**
   * Reads metadata of a previously stored file.
   */
  read(
    publicId: string
  ): Promise<{ url: string; bytes: number; format: string; createdAt: Date }>;

  /**
   * Updates/replaces an existing file.
   */
  update(
    publicId: string,
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<{ url: string; publicId: string }>;

  /**
   * Deletes a file from storage.
   */
  delete(publicId: string): Promise<boolean>;
}
