import { NextRequest, NextResponse } from "next/server";
import { LoggerService } from "../domains/logs/logger.service";
import { AuditAction } from "../enums/auditActions";

type ApiHandler = (req: NextRequest, params?: any) => Promise<NextResponse>;

/**
 * Turns a ZodError into one readable sentence for the UI's error banner.
 * Raw Zod output is a nested array the forms cannot render, so callers were
 * previously left showing the useless literal "Invalid input".
 */
function summariseZodError(error: any): string {
  const issues: any[] = error.issues ?? error.errors ?? [];
  if (issues.length === 0) return "Invalid request payload.";

  return issues
    .map((issue) => {
      const field = Array.isArray(issue.path) ? issue.path.join(".") : "";
      return field ? `${field}: ${issue.message}` : issue.message;
    })
    .join("; ");
}

/**
 * Higher-Order Function wrapper to handle exceptions cleanly in API routes.
 * Performs database log entry for exceptions and formats output safely.
 */
export function withErrorHandling(handler: ApiHandler): ApiHandler {
  return async (req: NextRequest, params?: any) => {
    try {
      return await handler(req, params);
    } catch (error: any) {
      const errorMessage = error.message || "An unexpected system error occurred";
      const isZodError = error.name === "ZodError";
      let statusCode = 500;

      // Determine status code based on common error patterns
      if (errorMessage.includes("Unauthorized")) {
        statusCode = 401;
      } else if (errorMessage.includes("Forbidden") || errorMessage.includes("Unauthorized role")) {
        statusCode = 403;
      } else if (errorMessage.includes("not found")) {
        statusCode = 404;
      } else if (
        errorMessage.includes("mandatory") || 
        errorMessage.includes("Invalid") || 
        errorMessage.includes("exceeds") ||
        errorMessage.includes("Must") ||
        isZodError
      ) {
        statusCode = 400;
      }

      // Log the exception in the Database audit/error system
      // Extract IP address if available
      const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined;
      
      await LoggerService.logException(
        AuditAction.API_ROUTE_ERROR,
        `Error in API [${req.method}] ${req.nextUrl.pathname}: ${errorMessage}`,
        error,
        { ipAddress: ip }
      );

      return NextResponse.json(
        {
          success: false,
          // Zod v4 renamed `.errors` to `.issues`; both are read so the field
          // survives a future major bump rather than silently going undefined.
          error: isZodError ? summariseZodError(error) : errorMessage,
          details: isZodError ? error.issues ?? error.errors : undefined
        },
        { status: statusCode }
      );
    }
  };
}
