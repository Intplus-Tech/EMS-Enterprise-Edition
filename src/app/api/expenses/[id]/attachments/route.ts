import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../config/db";
import { authenticate } from "../../../../../middlewares/auth";
import { withErrorHandling } from "../../../../../middlewares/errors";
import { AttachmentService } from "../../../../../domains/attachments/attachment.service";
import { AttachmentAddSchema } from "../../../../../validators/validation";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Attaches already-uploaded files to a request.
 *
 * Two steps by design: the browser uploads to `/api/upload` first, then records
 * the resulting references here. That keeps this route a small JSON write and
 * lets several files upload in parallel before a single attach call.
 */
export const POST = withErrorHandling(async (req: NextRequest, { params }: RouteContext) => {
  await connectToDatabase();
  const user = await authenticate(req);
  const { id } = await params;

  const { attachments } = AttachmentAddSchema.parse(await req.json());
  const request = await AttachmentService.addAttachments(id, user, attachments);

  return NextResponse.json({ success: true, attachments: request.attachments });
});
