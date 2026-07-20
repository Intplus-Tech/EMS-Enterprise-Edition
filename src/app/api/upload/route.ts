import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../config/db";
import { CloudinaryUploadService } from "../../../domains/upload/cloudinary-upload.service";
import { authenticate } from "../../../middlewares/auth";
import { withErrorHandling } from "../../../middlewares/errors";

export const POST = withErrorHandling(async (req: NextRequest) => {
  await connectToDatabase();
  
  // Authenticate user session
  await authenticate(req);

  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    throw new Error("Invalid request: No file attachment provided.");
  }

  // Convert File structure to Node.js Buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Execute upload through decoupled Cloudinary service
  const result = await CloudinaryUploadService.upload(
    buffer,
    file.name,
    file.type
  );

  return NextResponse.json({
    success: true,
    url: result.url,
    publicId: result.publicId,
    name: file.name,
  });
});
