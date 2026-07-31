import { connectToDatabase } from "../../config/db";
import { RequestComment } from "../../models/RequestComment";
import { ExpenseRequest } from "../../models/ExpenseRequest";
import { LoggerService } from "../logs/logger.service";
import { AuditAction } from "../../enums/auditActions";
import { SystemRole } from "../../enums/roles";
import { AuthenticatedRequestState } from "../../middlewares/auth";
import { RequestCommentDto, ThreadEntryDto } from "../../types/api";

export class CommentService {
  /**
   * Confirms the caller may see a request's thread, reusing the same visibility
   * rules as `/api/expenses/[id]`: initiators see only their own requests and
   * approvers only their department's.
   */
  private static async assertCanAccess(requestId: string, user: AuthenticatedRequestState) {
    const request = await ExpenseRequest.findById(requestId).select(
      "initiatorId departmentId requestNumber"
    );
    if (!request) throw new Error("Request not found");

    if (user.role === SystemRole.INITIATOR && request.initiatorId.toString() !== user.id) {
      throw new Error("Forbidden: You do not have permission to view this request.");
    }
    if (user.role === SystemRole.APPROVER && request.departmentId.toString() !== user.departmentId) {
      throw new Error("Forbidden: You do not have permission to view this request.");
    }

    return request;
  }

  /**
   * The full thread for a request: workflow transitions and free-text comments
   * merged into one chronological list, which is how every design renders it.
   */
  public static async getThread(
    requestId: string,
    user: AuthenticatedRequestState
  ): Promise<ThreadEntryDto[]> {
    await connectToDatabase();
    await this.assertCanAccess(requestId, user);

    const request = await ExpenseRequest.findById(requestId).select("history");
    const comments = await RequestComment.find({ requestId }).sort({ createdAt: 1 });

    // Initiators must not see notes marked internal.
    const isInitiator = user.role === SystemRole.INITIATOR;

    const commentEntries: ThreadEntryDto[] = comments
      .filter((c) => !(isInitiator && c.isInternal))
      .map((c) => ({
        id: c._id.toString(),
        kind: "COMMENT" as const,
        authorName: c.authorName,
        authorRole: c.authorRole,
        message: c.message,
        isInternal: c.isInternal,
        timestamp: c.createdAt.toISOString(),
      }));

    const historyEntries: ThreadEntryDto[] = (request?.history ?? []).map(
      (h: {
        _id?: { toString(): string };
        actorName: string;
        actorRole: SystemRole;
        action: string;
        comment?: string;
        timestamp: Date;
      }, idx: number) => ({
        id: h._id?.toString() ?? `history-${idx}`,
        kind: "TRANSITION" as const,
        authorName: h.actorName,
        authorRole: h.actorRole,
        message: h.comment || h.action,
        action: h.action,
        isInternal: false,
        timestamp: new Date(h.timestamp).toISOString(),
      })
    );

    return [...historyEntries, ...commentEntries].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  /** Appends a message to the thread. */
  public static async addComment(
    requestId: string,
    user: AuthenticatedRequestState,
    message: string,
    isInternal = false
  ): Promise<RequestCommentDto> {
    await connectToDatabase();
    const request = await this.assertCanAccess(requestId, user);

    // An initiator has no "internal" audience to write to.
    const internal = user.role === SystemRole.INITIATOR ? false : isInternal;

    const comment = await RequestComment.create({
      requestId,
      authorId: user.id,
      authorName: user.name,
      authorRole: user.role,
      message: message.trim(),
      isInternal: internal,
    });

    await LoggerService.logAudit(
      AuditAction.REQUEST_COMMENT_ADDED,
      `Comment added to request ${request.requestNumber} by ${user.name}`,
      { requestId, isInternal: internal },
      { id: user.id, name: user.name, role: user.role }
    );

    return {
      id: comment._id.toString(),
      requestId,
      authorName: comment.authorName,
      authorRole: comment.authorRole,
      message: comment.message,
      isInternal: comment.isInternal,
      timestamp: comment.createdAt.toISOString(),
    };
  }
}
