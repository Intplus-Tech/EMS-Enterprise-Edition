import { connectToDatabase } from "../../config/db";
import { Log } from "../../models/Log";
import { LogType } from "../../enums/logTypes";
import { SystemRole } from "../../enums/roles";

export interface ILogActor {
  id?: string;
  name?: string;
  role?: SystemRole;
  ipAddress?: string;
}

/**
 * Structured Logger Service following SOLID principles
 * Handles writing logs (App, Exception, Audit) to the database and standard console.
 */
export class LoggerService {
  private static async saveLog(
    type: LogType,
    action: string,
    message: string,
    details?: any,
    actor?: ILogActor
  ) {
    try {
      await connectToDatabase();
      
      const logEntry = new Log({
        type,
        action,
        message,
        details: details ? (details instanceof Error ? { stack: details.stack, message: details.message } : details) : undefined,
        actorId: actor?.id,
        actorName: actor?.name,
        actorRole: actor?.role,
        ipAddress: actor?.ipAddress,
        timestamp: new Date()
      });
      
      await logEntry.save();
    } catch (dbError) {
      // Fallback to console in case DB is unreachable
      console.error("[FATAL] LoggerService failed to write to database:", dbError);
    }
    
    // Output formatted console output for local development logging
    const consoleMsg = `[${type}] [${action}] ${message} ${actor ? `(User: ${actor.name} - ${actor.role})` : ""}`;
    if (type === LogType.EXCEPTION) {
      console.error(consoleMsg, details);
    } else {
      console.log(consoleMsg);
    }
  }

  /**
   * Log routing application messages
   */
  public static async logApp(action: string, message: string, details?: any, actor?: ILogActor) {
    await this.saveLog(LogType.APP, action, message, details, actor);
  }

  /**
   * Log caught exceptions/errors
   */
  public static async logException(action: string, message: string, error: Error | any, actor?: ILogActor) {
    await this.saveLog(LogType.EXCEPTION, action, message, error, actor);
  }

  /**
   * Log critical user actions and system changes (Audit Trail)
   */
  public static async logAudit(action: string, message: string, details?: any, actor?: ILogActor) {
    await this.saveLog(LogType.AUDIT, action, message, details, actor);
  }
}
