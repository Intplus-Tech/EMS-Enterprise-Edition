import { NextRequest, NextResponse } from "next/server";
import { LoggerService } from "../domains/logs/logger.service";
import { SystemRole } from "../enums/roles";

type ApiHandler = (req: NextRequest, params?: any) => Promise<NextResponse>;

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
        error.name === "ZodError"
      ) {
        statusCode = 400;
      }

      // Log the exception in the Database audit/error system
      // Extract IP address if available
      const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined;
      
      await LoggerService.logException(
        "API_ROUTE_ERROR",
        `Error in API [${req.method}] ${req.nextUrl.pathname}: ${errorMessage}`,
        error,
        { ipAddress: ip }
      );

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          details: error.name === "ZodError" ? error.errors : undefined
        },
        { status: statusCode }
      );
    }
  };
}
