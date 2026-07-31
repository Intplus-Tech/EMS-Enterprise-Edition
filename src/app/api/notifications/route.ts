import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../config/db";
import { User } from "../../../models/User";
import { authenticate } from "../../../middlewares/auth";
import { withErrorHandling } from "../../../middlewares/errors";
import { NotificationStateSchema } from "../../../validators/validation";

/**
 * Per-user notification read/dismissed state.
 *
 * The notifications themselves are derived from expense workflow history, so
 * there is nothing to store for them — only which ones this user has read or
 * dismissed. That was previously kept in `localStorage`, so marking something
 * read on a laptop left it unread on a phone.
 */

/** Caps the stored arrays so they cannot grow without bound. */
const MAX_TRACKED_IDS = 500;

export const GET = withErrorHandling(async (req: NextRequest) => {
  await connectToDatabase();
  const session = await authenticate(req);

  const user = await User.findById(session.id)
    .select("notificationsRead notificationsDismissed")
    .lean();

  return NextResponse.json({
    success: true,
    readIds: user?.notificationsRead ?? [],
    dismissedIds: user?.notificationsDismissed ?? [],
  });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  await connectToDatabase();
  const session = await authenticate(req);

  const { readIds, dismissedIds } = NotificationStateSchema.parse(await req.json());

  const user = await User.findById(session.id).select(
    "notificationsRead notificationsDismissed"
  );
  if (!user) throw new Error("User not found");

  // Merge rather than replace: two tabs open at once must not clobber each
  // other's state. Newest ids win when the cap trims the list.
  const merge = (existing: string[], incoming: string[]) =>
    Array.from(new Set([...existing, ...incoming])).slice(-MAX_TRACKED_IDS);

  if (readIds) user.notificationsRead = merge(user.notificationsRead ?? [], readIds);
  if (dismissedIds) {
    user.notificationsDismissed = merge(user.notificationsDismissed ?? [], dismissedIds);
  }

  await user.save();

  return NextResponse.json({
    success: true,
    readIds: user.notificationsRead,
    dismissedIds: user.notificationsDismissed,
  });
});
