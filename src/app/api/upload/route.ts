import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../config/db";
import { CloudinaryUploadService } from "../../../domains/upload/cloudinary-upload.service";
import { authenticate } from "../../../middlewares/auth";
import { withErrorHandling } from "../../../middlewares/errors";
import { MAX_ATTACHMENT_BYTES } from "../../../domains/attachments/attachment.rules";

/**
 * Uploads one file and returns the metadata needed to build an attachment.
 *
 * Now returns `size` and `mimeType` alongside the URL: the multi-document list
 * renders the size, and the viewer uses the type to decide how to display it.
 * The size limit is enforced here as well as in the browser, since the client
 * guard is only a convenience.
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  await connectToDatabase();
  await authenticate(req);

  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    throw new Error("Invalid request: No file attachment provided.");
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error(
      `Invalid request: '${file.name}' is ${(file.size / 1024 / 1024).toFixed(1)}MB. The maximum file size is 5MB.`
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const result = await CloudinaryUploadService.upload(buffer, file.name, file.type);

  return NextResponse.json({
    success: true,
    url: result.url,
    publicId: result.publicId,
    name: file.name,
    size: file.size,
    mimeType: file.type,
  });
});
