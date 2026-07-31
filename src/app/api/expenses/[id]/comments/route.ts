import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../../../config/db";
import { authenticate } from "../../../../../middlewares/auth";
import { withErrorHandling } from "../../../../../middlewares/errors";
import { CommentService } from "../../../../../domains/comments/comment.service";
import { RequestCommentCreateSchema } from "../../../../../validators/validation";

type RouteContext = { params: Promise<{ id: string }> };

/** Full communication thread: workflow transitions merged with comments. */
export const GET = withErrorHandling(async (req: NextRequest, { params }: RouteContext) => {
  await connectToDatabase();
  const user = await authenticate(req);
  const { id } = await params;

  const thread = await CommentService.getThread(id, user);
  return NextResponse.json({ success: true, thread });
});

export const POST = withErrorHandling(async (req: NextRequest, { params }: RouteContext) => {
  await connectToDatabase();
  const user = await authenticate(req);
  const { id } = await params;

  const { message, isInternal } = RequestCommentCreateSchema.parse(await req.json());
  const comment = await CommentService.addComment(id, user, message, isInternal);

  // Return the refreshed thread so the caller renders one consistent list.
  const thread = await CommentService.getThread(id, user);
  return NextResponse.json({ success: true, comment, thread });
});
