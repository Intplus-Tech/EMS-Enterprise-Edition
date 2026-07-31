import mongoose, { Schema } from "mongoose";
import { RequestStatus } from "../enums/statuses";
import { SystemRole } from "../enums/roles";

const WorkflowHistorySchema = new Schema({
  statusBefore: { type: String, enum: Object.values(RequestStatus), required: true },
  statusAfter: { type: String, enum: Object.values(RequestStatus), required: true },
  actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  actorName: { type: String, required: true },
  actorRole: { type: String, enum: Object.values(SystemRole), required: true },
  action: { type: String, required: true },
  comment: { type: String, required: false },
  timestamp: { type: Date, default: Date.now },
});

/**
 * A file attached to a request. Requests support several — the designs show
 * multiple documents per request and reviewers may add their own mid-workflow.
 */
const AttachmentSchema = new Schema({
  name: { type: String, required: true },
  // Cloudinary secure URL. Records created before the upload integration hold a
  // bare filename here instead; the viewer detects that and explains it.
  url: { type: String, required: true },
  // Retained so the stored file can be removed when the attachment is deleted.
  publicId: { type: String },
  size: { type: Number },
  mimeType: { type: String },
  uploadedById: { type: Schema.Types.ObjectId, ref: "User" },
  uploadedByName: { type: String },
  uploadedAt: { type: Date, default: Date.now },
});

const ExpenseRequestSchema = new Schema(
  {
    requestNumber: { type: String, required: true, unique: true },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department", required: true },
    initiatorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    category: { type: String, required: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true },

    // At least one supporting document is mandatory; enforced in the service and
    // validator rather than the schema so drafts can be built up incrementally.
    supportingDocuments: { type: [AttachmentSchema], default: [] },

    /**
     * @deprecated Superseded by `supportingDocuments`.
     *
     * Kept and auto-synced from the first attachment by the pre-save hook below
     * so historical records and any reader still expecting a single string keep
     * working. No migration is required: the `attachments` virtual reads through
     * to this field when the array is empty.
     */
    supportingDocument: { type: String },

    vendorName: { type: String, required: true },
    vendorBankDetails: {
      accountNumber: { type: String, required: true },
      bankName: { type: String, required: true },
      accountName: { type: String, required: true },
    },
    requiredPaymentDate: { type: Date, required: true },
    status: { type: String, enum: Object.values(RequestStatus), required: true, default: RequestStatus.DRAFT },

    // Exceptional Approval parameters
    exceptionalBudgetApproved: { type: Boolean, default: false },
    exceptionalApprovedBy: { type: Schema.Types.ObjectId, ref: "User" },
    originalAmount: { type: Number },

    // Payment release logs
    paymentReceipt: { type: String },
    paymentReference: { type: String },
    paymentDate: { type: Date },

    // Workflow state variables
    currentStepIndex: { type: Number, default: 0 },
    history: { type: [WorkflowHistorySchema], default: [] },
  },
  {
    timestamps: true,
    // Virtuals must be serialised, otherwise `attachments` would be absent from
    // the JSON every route returns.
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/**
 * The canonical attachment list for readers.
 *
 * Returns `supportingDocuments` when present, and otherwise synthesises a
 * single entry from the legacy `supportingDocument` string. This is what makes
 * pre-existing records display correctly without a data migration.
 */
ExpenseRequestSchema.virtual("attachments").get(function () {
  const documents = this.supportingDocuments ?? [];
  if (documents.length > 0) return documents;

  if (this.supportingDocument) {
    return [
      {
        _id: null,
        name: this.supportingDocument,
        url: this.supportingDocument,
        uploadedAt: this.get("createdAt"),
        // Flags a record whose file predates the upload integration, so the UI
        // can explain why there is nothing to open.
        isLegacy: true,
      },
    ];
  }

  return [];
});

// Keep the deprecated single-document field pointing at the primary attachment.
ExpenseRequestSchema.pre("save", function () {
  const documents = this.supportingDocuments ?? [];
  if (documents.length > 0) {
    this.supportingDocument = documents[0].name;
  }
});

export const ExpenseRequest =
  mongoose.models.ExpenseRequest || mongoose.model("ExpenseRequest", ExpenseRequestSchema);
