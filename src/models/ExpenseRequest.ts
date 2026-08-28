import mongoose, { Schema } from "mongoose";
import { RequestStatus } from "../enums/statuses";
import { SystemRole } from "../enums/roles";
import { fileNameFromUrl, isStoredUrl } from "../domains/attachments/attachment.rules";

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

    /**
     * The budget item this request draws on, chosen by the approver.
     *
     * Points at a `lineItems` subdocument of the department's budget period.
     * Everything downstream keys off it: the item's ledger is only moved for
     * attached requests, and a Finance Head can only expand an item a request
     * is actually attached to.
     */
    budgetItemId: { type: Schema.Types.ObjectId },
    /** Denormalised for display, so tables need not resolve the period. */
    budgetItemName: { type: String },

    /**
     * Shortfall the budget check found at submission, if any.
     *
     * The check runs early so the overrun is visible from the start, but the
     * request still travels the normal approval chain — nobody is asked to fund
     * an exception until the business approvals have passed. The Finance
     * Officer's approval reads this to decide whether the request goes on to
     * the Finance Head or straight to the Finance Manager.
     */
    budgetShortfall: { type: Number, default: 0 },

    /**
     * Held because no budget period covered the required payment date.
     *
     * Distinct from an ordinary overrun: there is no period to reserve against,
     * so the request cannot travel the approval chain and no amount is locked.
     * It parks here until an administrator creates a period covering the date,
     * at which point `releaseRequestsAwaitingBudget` re-runs the check and
     * routes it. Submission used to abort with an error in this case, leaving
     * the request at INSUFFICIENT_BUDGET with no way back — `submitRequest`
     * accepts only DRAFT and RETURNED, so the initiator could not retry.
     */
    awaitingBudgetPeriod: { type: Boolean, default: false },

    // Exceptional Approval parameters
    exceptionalBudgetApproved: { type: Boolean, default: false },
    exceptionalApprovedBy: { type: Schema.Types.ObjectId, ref: "User" },
    /**
     * The shortfall the Finance Head covered, captured at the moment of
     * approval. Without it the exception history has no way to report what was
     * granted and was reporting the whole request amount instead.
     */
    exceptionalBudgetAmount: { type: Number },
    exceptionalApprovedAt: { type: Date },
    originalAmount: { type: Number },

    // Payment release logs
    /**
     * @deprecated Superseded by `paymentReceiptDocument`.
     *
     * Held nothing but the receipt's Cloudinary URL, so every screen that
     * showed it printed a URL where a filename belonged and had no size, type
     * or uploader to report. Kept and auto-synced by the pre-save hook below so
     * seeded and pre-existing records keep resolving; the `paymentReceiptFile`
     * virtual reads through to it when the document is absent.
     */
    paymentReceipt: { type: String },
    /** The transfer evidence the Finance Manager uploaded, as a stored file. */
    paymentReceiptDocument: { type: AttachmentSchema, required: false },
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

/**
 * The payment receipt every reader renders — initiator, approver, finance
 * officer, finance manager and finance head alike.
 *
 * Returns the stored document when present, and otherwise synthesises one from
 * the legacy `paymentReceipt` URL so releases recorded before the document
 * field existed still open. Deriving it here rather than at each screen is what
 * lets one viewer serve them all, exactly as `attachments` does above.
 */
ExpenseRequestSchema.virtual("paymentReceiptFile").get(function () {
  const stored = this.paymentReceiptDocument;
  if (stored?.url) return stored;

  const legacy = this.paymentReceipt;
  if (!legacy) return null;

  return {
    _id: null,
    name: fileNameFromUrl(legacy),
    url: legacy,
    uploadedAt: this.paymentDate ?? this.get("updatedAt"),
    // A seeded or pre-upload record holds a bare filename, so there is no file
    // to open; the viewer says so rather than offering a dead link.
    isLegacy: !isStoredUrl(legacy),
  };
});

// Keep the deprecated single-document fields pointing at their replacements.
ExpenseRequestSchema.pre("save", function () {
  const documents = this.supportingDocuments ?? [];
  if (documents.length > 0) {
    this.supportingDocument = documents[0].name;
  }

  if (this.paymentReceiptDocument?.url) {
    this.paymentReceipt = this.paymentReceiptDocument.url;
  }
});

export const ExpenseRequest =
  mongoose.models.ExpenseRequest || mongoose.model("ExpenseRequest", ExpenseRequestSchema);
