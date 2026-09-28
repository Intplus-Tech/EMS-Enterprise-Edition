import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../../config/db";
import { authenticate } from "../../../../middlewares/auth";
import { withErrorHandling } from "../../../../middlewares/errors";
import { LogQueryService } from "../../../../domains/logs/log.query.service";
import { LogQuerySchema } from "../../../../validators/validation";
import { SystemRole } from "../../../../enums/roles";

/**
 * Paged, filtered audit log feed.
 *
 * Filtering and paging are applied in the database rather than the browser: the
 * Audit Trail viewer previously fetched the newest 100 rows and filtered them in
 * React, so its pager could never reach anything older.
 */
export const GET = withErrorHandling(async (req: NextRequest) => {
  await connectToDatabase();
  await authenticate(req, [SystemRole.ADMIN]);

  // Never trust the client for anything beyond these read filters — the actor's
  // role is re-derived by `authenticate` above.
  const { searchParams } = new URL(req.url);
  const params = LogQuerySchema.parse(Object.fromEntries(searchParams));

  const { logs, total, page, limit, totalPages } = await LogQueryService.search({
    type: params.type,
    action: params.action,
    actorName: params.user,
    reference: params.reference,
    from: params.from ? new Date(params.from) : undefined,
    page: params.page,
    limit: params.limit,
  });

  return NextResponse.json({ success: true, logs, total, page, limit, totalPages });
});
