import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../../config/db";
import { authenticate } from "../../../../../../middlewares/auth";
import { withErrorHandling } from "../../../../../../middlewares/errors";
import { AttachmentService } from "../../../../../../domains/attachments/attachment.service";

type RouteContext = { params: Promise<{ id: string; attachmentId: string }> };

/** Detaches a document and deletes the stored file behind it. */
export const DELETE = withErrorHandling(async (req: NextRequest, { params }: RouteContext) => {
  await connectToDatabase();
  const user = await authenticate(req);
  const { id, attachmentId } = await params;

  const request = await AttachmentService.removeAttachment(id, user, attachmentId);

  return NextResponse.json({ success: true, attachments: request.attachments });
});
