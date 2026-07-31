import mongoose, { Schema } from "mongoose";
import { SystemRole } from "../enums/roles";

/**
 * A message on a request's communication thread
 * (designs/finance-head/Request Detail with Budget & Communication Thread,
 *  designs/finance-manager/Full Communication Thread Modal,
 *  designs/approval/Comment Modal).
 *
 * Separate from `ExpenseRequest.history`: history records *status transitions*
 * made by the workflow engine and is immutable audit data, whereas these are
 * free-text messages people add without changing the request's state. Comments
 * were previously held in component state only and vanished on refresh.
 */
const RequestCommentSchema = new Schema(
  {
    requestId: { type: Schema.Types.ObjectId, ref: "ExpenseRequest", required: true, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    authorName: { type: String, required: true },
    authorRole: { type: String, enum: Object.values(SystemRole), required: true },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    // Internal notes are hidden from the initiator (the designs label these
    // "Add an internal comment to this audit trail").
    isInternal: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Threads are always read oldest-first for a single request.
RequestCommentSchema.index({ requestId: 1, createdAt: 1 });

export const RequestComment =
  mongoose.models.RequestComment || mongoose.model("RequestComment", RequestCommentSchema);
