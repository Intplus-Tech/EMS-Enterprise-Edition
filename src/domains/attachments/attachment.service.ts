import { connectToDatabase } from "../../config/db";
import { ExpenseRequest } from "../../models/ExpenseRequest";
import { CloudinaryUploadService } from "../upload/cloudinary-upload.service";
import { LoggerService } from "../logs/logger.service";
import { AuditAction } from "../../enums/auditActions";
import { SystemRole } from "../../enums/roles";
import { RequestStatus } from "../../enums/statuses";
import { AuthenticatedRequestState } from "../../middlewares/auth";
import { IAttachment } from "../../types/domain";
import { AttachmentInput } from "../../types/api";
import {
  INITIATOR_EDITABLE,
  LOCKED_FOR_ATTACHMENTS,
  MAX_ATTACHMENTS_PER_REQUEST,
} from "./attachment.rules";

/**
 * Adding and removing supporting documents on an expense request.
 *
 * Requests previously held a single `supportingDocument` string, so the
 * "Upload Additional Files" affordance in the approval panel had nothing to
 * call. Reviewers can now attach evidence mid-workflow without disturbing the
 * initiator's originals.
 */
export class AttachmentService {
  /**
   * Loads a request the caller may see, applying the same visibility rules as
   * `/api/expenses/[id]`.
   */
  private static async loadVisible(requestId: string, user: AuthenticatedRequestState) {
    const request = await ExpenseRequest.findById(requestId);
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
   * Who may attach a document, and when.
   *
   * The initiator may attach only while the request is still theirs to edit
   * (draft or returned). Reviewers may attach supporting evidence at any point
   * before the request settles — that is the whole purpose of the button on the
   * approval screen — but never after payment or closure, when the document set
   * forms part of the audit record.
   */
  private static assertCanAttach(
    request: { status: RequestStatus; initiatorId: { toString(): string } },
    user: AuthenticatedRequestState
  ) {
    if (LOCKED_FOR_ATTACHMENTS.includes(request.status)) {
      throw new Error(
        `Forbidden: documents cannot be changed once a request is ${request.status}.`
      );
    }

    const isInitiator = request.initiatorId.toString() === user.id;
    if (isInitiator && user.role === SystemRole.INITIATOR) {
      if (!INITIATOR_EDITABLE.includes(request.status)) {
        throw new Error(
          "Forbidden: documents can only be changed while a request is a draft or has been returned to you."
        );
      }
    }
  }

  /** Appends one or more already-uploaded files to a request. */
  public static async addAttachments(
    requestId: string,
    user: AuthenticatedRequestState,
    inputs: AttachmentInput[]
  ) {
    await connectToDatabase();

    const request = await this.loadVisible(requestId, user);
    this.assertCanAttach(request, user);

    const existing: IAttachment[] = request.supportingDocuments ?? [];
    if (existing.length + inputs.length > MAX_ATTACHMENTS_PER_REQUEST) {
      throw new Error(
        `Invalid request: a request may carry at most ${MAX_ATTACHMENTS_PER_REQUEST} documents (this one already has ${existing.length}).`
      );
    }

    // Re-attaching the same file is almost always a double-click, not intent.
    const existingUrls = new Set(existing.map((a) => a.url));
    const fresh = inputs.filter((input) => !existingUrls.has(input.url));
    if (fresh.length === 0) {
      throw new Error("Invalid request: those documents are already attached.");
    }

    fresh.forEach((input) => {
      request.supportingDocuments.push({
        name: input.name,
        url: input.url,
        publicId: input.publicId,
        size: input.size,
        mimeType: input.mimeType,
        uploadedById: user.id,
        uploadedByName: user.name,
        uploadedAt: new Date(),
      });
    });

    await request.save();

    await LoggerService.logAudit(
      AuditAction.ATTACHMENT_ADDED,
      `${fresh.length} document(s) attached to request ${request.requestNumber} by ${user.name}`,
      { requestId, names: fresh.map((f) => f.name) },
      { id: user.id, name: user.name, role: user.role }
    );

    return request;
  }

  /**
   * Removes an attachment, and the stored file behind it.
   *
   * A reviewer may only withdraw their own upload — deleting someone else's
   * evidence mid-approval would undermine the audit trail — and the last
   * remaining document can never be removed, since at least one is mandatory.
   */
  public static async removeAttachment(
    requestId: string,
    user: AuthenticatedRequestState,
    attachmentId: string
  ) {
    await connectToDatabase();

    const request = await this.loadVisible(requestId, user);
    this.assertCanAttach(request, user);

    const attachment = request.supportingDocuments.id(attachmentId);
    if (!attachment) throw new Error("Attachment not found");

    if (request.supportingDocuments.length <= 1) {
      throw new Error(
        "Invalid request: a request must keep at least one supporting document."
      );
    }

    const isInitiator = request.initiatorId.toString() === user.id;
    const isUploader = attachment.uploadedById?.toString() === user.id;
    if (!isInitiator && !isUploader && user.role !== SystemRole.ADMIN) {
      throw new Error("Forbidden: you can only remove documents you attached yourself.");
    }

    const { name, publicId } = attachment;
    attachment.deleteOne();
    await request.save();

    // Best-effort storage cleanup: the record is already updated, so a failure
    // here must not surface as a failed delete.
    if (publicId) {
      try {
        await CloudinaryUploadService.delete(publicId);
      } catch (error) {
        await LoggerService.logException(
          AuditAction.ATTACHMENT_REMOVED,
          `Removed attachment '${name}' from ${request.requestNumber} but could not delete the stored file`,
          error
        );
      }
    }

    await LoggerService.logAudit(
      AuditAction.ATTACHMENT_REMOVED,
      `Document '${name}' removed from request ${request.requestNumber} by ${user.name}`,
      { requestId, attachmentId },
      { id: user.id, name: user.name, role: user.role }
    );

    return request;
  }
}
