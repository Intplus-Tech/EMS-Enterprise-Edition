/**
 * Log types for App, Exception, and Audit logs
 */
export enum LogType {
  APP = "APP",             // Routine application logs, initialization events
  EXCEPTION = "EXCEPTION", // Server exceptions, connection failures, validation errors
  AUDIT = "AUDIT"          // Strict audit trails for critical business actions
}
