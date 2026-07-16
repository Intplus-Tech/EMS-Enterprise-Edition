import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "../../../../config/db";
import { Log } from "../../../../models/Log";
import { authenticate } from "../../../../middlewares/auth";
import { withErrorHandling } from "../../../../middlewares/errors";
import { SystemRole } from "../../../../enums/roles";

export const GET = withErrorHandling(async (req: NextRequest) => {
  await connectToDatabase();
  await authenticate(req, [SystemRole.ADMIN]);

  // Parse filters from query params
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const action = searchParams.get("action");
  
  let query: any = {};
  if (type) query.type = type;
  if (action) query.action = action;

  // Retrieve latest logs first
  const logs = await Log.find(query).sort({ timestamp: -1 }).limit(100);
  return NextResponse.json({ success: true, logs });
});
