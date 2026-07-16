import { NextRequest, NextResponse } from "next/server";
import { runDatabaseSeed } from "../../../domains/auth/seed";
import { withErrorHandling } from "../../../middlewares/errors";

export const POST = withErrorHandling(async (req: NextRequest) => {
  const result = await runDatabaseSeed();
  return NextResponse.json(result);
});

// Also allow GET for simple browser seeding trigger if needed
export const GET = withErrorHandling(async (req: NextRequest) => {
  const result = await runDatabaseSeed();
  return NextResponse.json(result);
});
