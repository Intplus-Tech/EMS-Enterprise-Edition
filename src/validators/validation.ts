import { z } from "zod";
import { SystemRole } from "../enums/roles";
import { PermissionAction, PermissionResource } from "../enums/permissions";
import { WorkflowActionType } from "../enums/workflowActions";
import { LogType } from "../enums/logTypes";
import { MAX_ATTACHMENT_BYTES, MAX_ATTACHMENTS_PER_REQUEST } from "../domains/attachments/attachment.rules";

export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(4, "Password must be at least 4 characters long"),
  /** "Remember this device — trusted for 7 days" on the sign-in form. */
  rememberDevice: z.boolean().optional().default(false),
});

export const VendorBankDetailsSchema = z.object({
  accountNumber: z.string().min(5, "Account number must be at least 5 digits"),
  bankName: z.string().min(2, "Bank name is required"),
  accountName: z.string().min(2, "Account name is required"),
});

/** One already-uploaded file, as returned by `POST /api/upload`. */
export const AttachmentInputSchema = z.object({
  name: z.string().trim().min(1, "A document name is required").max(255),
  url: z.string().trim().min(1, "A document reference is required").max(1000),
  publicId: z.string().max(255).optional(),
  size: z.number().nonnegative().max(MAX_ATTACHMENT_BYTES, "Files may be at most 5MB").optional(),
  mimeType: z.string().max(150).optional(),
});

export const AttachmentAddSchema = z.object({
  attachments: z
    .array(AttachmentInputSchema)
    .min(1, "Select at least one file to attach")
    .max(MAX_ATTACHMENTS_PER_REQUEST),
});

export const ExpenseInitiateSchema = z.object({
  // Optional: the New Request form no longer asks the initiator to classify
  // their spend, so the service applies DEFAULT_EXPENSE_CATEGORY. Still accepted
  // for resubmissions and older clients, which carry the stored value.
  category: z.string().min(2, "Category is required").optional(),
  description: z.string().min(3, "Description is required"),
  amount: z.number().positive("Amount must be greater than zero"),
  // At least one supporting document is mandatory. `supportingDocument` is still
  // accepted so an older client (or a caller following the previous contract)
  // keeps working; the service normalises whichever form arrives.
  supportingDocuments: z
    .array(AttachmentInputSchema)
    .max(MAX_ATTACHMENTS_PER_REQUEST)
    .optional(),
  supportingDocument: z.string().min(1).optional(),
  vendorName: z.string().min(2, "Vendor name is required"),
  vendorBankDetails: VendorBankDetailsSchema,
  requiredPaymentDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid required payment date format",
  }),
}).refine(
  (data) => (data.supportingDocuments?.length ?? 0) > 0 || Boolean(data.supportingDocument),
  { message: "At least one supporting invoice or document is mandatory", path: ["supportingDocuments"] }
);

/**
 * Identity re-confirmation captured by the approval dialogs. Required on every
 * payload that commits a financial decision — the field is verified against the
 * caller's own password before the transition is applied.
 */
const SignatureSchema = z.string().min(1, "An electronic signature is required");

export const ExceptionalBudgetSchema = z.object({
  action: z.nativeEnum(WorkflowActionType),
  comment: z.string().optional(),
  adjustedAmount: z.number().positive().optional(),
  signature: SignatureSchema,
});

const ObjectIdString = z.string().regex(/^[a-f\d]{24}$/i, "Invalid identifier");

/** The approver booking a request against one of the department's budget items. */
export const BudgetItemAttachSchema = z.object({
  budgetItemId: ObjectIdString,
});

export const WorkflowActionSchema = z.object({
  action: z.nativeEnum(WorkflowActionType),
  comment: z.string().optional(),
  signature: SignatureSchema,
  /**
   * Set by the approver when approving: the request must be attached to a
   * budget item before it can travel on, so the decision and the attachment
   * arrive together rather than as two calls that can half-fail.
   */
  budgetItemId: ObjectIdString.optional(),
});

export const PaymentReleaseSchema = z.object({
  reference: z.string().min(3, "Payment transaction reference is required"),
  /** Stored document reference for the transfer evidence, never a bare filename. */
  receipt: z.string().optional(),
  signature: SignatureSchema,
});

export const WorkflowStepConfigSchema = z.object({
  stepIndex: z.number().int().nonnegative(),
  stepName: z.string().min(2),
  role: z.nativeEnum(SystemRole),
  minAmount: z.number().nonnegative().optional().default(0),
  requiresAllApprovals: z.boolean().optional().default(false),
});

export const WorkflowConfigUpdateSchema = z.object({
  steps: z.array(WorkflowStepConfigSchema),
});

export const RequestCommentCreateSchema = z.object({
  message: z.string().trim().min(1, "A comment cannot be empty").max(2000),
  /** Internal notes are withheld from the initiator. */
  isInternal: z.boolean().optional().default(false),
});

export const NotificationStateSchema = z.object({
  readIds: z.array(z.string().max(200)).max(500).optional(),
  dismissedIds: z.array(z.string().max(200)).max(500).optional(),
});

/* ------------------------------------------------------------------------- *
 * Admin administration payloads
 * ------------------------------------------------------------------------- */

/** Empty string is accepted and normalised to null so a "— none —" select works. */
const OptionalObjectId = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid identifier")
  .or(z.literal(""))
  .nullish()
  .transform((value) => value || null);

/** One budget item. Declared here because department creation also accepts a budget. */
export const BudgetLineItemSchema = z.object({
  /**
   * The item's own id, round-tripped by the Set Budget screen.
   *
   * Identity has to survive an edit: requests point at this id, and the item's
   * ledger is matched on it. Without it a rename reads as a delete plus an
   * insert — the new subdocument gets a fresh id, the spend recorded against
   * the old one is lost, and every request booked to it is orphaned. Absent for
   * an item the administrator has just added.
   */
  id: ObjectIdString.optional(),
  name: z.string().trim().min(2, "Line item name is required").max(80),
  description: z.string().trim().max(300).optional(),
  amount: z.number().nonnegative("Line item amount cannot be negative"),
});

export const DepartmentCreateSchema = z.object({
  name: z.string().trim().min(2, "Department name is required").max(80),
  description: z.string().trim().max(500).optional(),
  headUserId: OptionalObjectId,
  /**
   * The department's opening budget, created in the same step.
   *
   * Optional so an administrator can still stand a department up first and fund
   * it later, but offered here because a department with no budget period
   * cannot accept a single request — every submission fails the budget check
   * with "no active budget period configured".
   */
  budget: z
    .object({
      periodName: z.string().trim().min(2, "Period name is required").max(40),
      totalBudget: z.number().nonnegative("Budget allocation cannot be negative"),
      lineItems: z.array(BudgetLineItemSchema).optional().default([]),
      startDate: z.string().refine((v) => !isNaN(Date.parse(v)), "Invalid start date"),
      endDate: z.string().refine((v) => !isNaN(Date.parse(v)), "Invalid end date"),
    })
    .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
      message: "The period end date must fall after the start date",
      path: ["endDate"],
    })
    .optional(),
});

export const DepartmentUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(500).optional(),
  headUserId: OptionalObjectId,
  isActive: z.boolean().optional(),
});

/** Archive (`false`) / restore (`true`) for a department. */
export const DepartmentStatusSchema = z.object({
  isActive: z.boolean(),
});

export const UserUpdateSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(80).optional(),
  email: z.string().email("Invalid email address").optional(),
  role: z.nativeEnum(SystemRole).optional(),
  departmentId: OptionalObjectId,
  officialContact: z.string().trim().max(40).optional(),
  personalContact: z.string().trim().max(40).optional(),
  avatar: z.string().max(500).optional(),
});

export const UserStatusSchema = z.object({
  isActive: z.boolean(),
});

/**
 * Self-service profile edit (`POST /api/auth/me`).
 *
 * Deliberately narrower than `UserUpdateSchema`: role and department are
 * privilege, so a user editing their own profile must not be able to send them.
 * This endpoint previously ran no validation at all and assigned every field
 * straight onto the document.
 */
export const ProfileUpdateSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(80).optional(),
  email: z.string().trim().toLowerCase().email("Invalid email address").optional(),
  officialContact: z.string().trim().max(40).optional(),
  personalContact: z.string().trim().max(40).optional(),
  avatar: z.string().max(500).optional(),
});

export const BudgetPeriodUpsertSchema = z
  .object({
    departmentId: z.string().regex(/^[a-f\d]{24}$/i, "A department must be selected"),
    periodName: z.string().trim().min(2, "Period name is required").max(40),
    totalBudget: z.number().nonnegative("Budget allocation cannot be negative"),
    lineItems: z.array(BudgetLineItemSchema).optional().default([]),
    startDate: z.string().refine((v) => !isNaN(Date.parse(v)), "Invalid start date"),
    endDate: z.string().refine((v) => !isNaN(Date.parse(v)), "Invalid end date"),
  })
  .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    message: "The period end date must fall after the start date",
    path: ["endDate"],
  });

export const RolePermissionUpdateSchema = z.object({
  role: z.nativeEnum(SystemRole),
  description: z.string().trim().max(300).optional(),
  isActive: z.boolean().optional(),
  // `partialRecord`, not `record`: with an enum key Zod v4's `record` demands
  // every resource be present, so a caller sending only the rows it changed
  // would be rejected. Omitted resources are treated as fully denied.
  grants: z.partialRecord(
    z.enum(PermissionResource),
    z.array(z.enum(PermissionAction))
  ),
});

/** Blank query params are dropped so `?user=` behaves the same as omitting it. */
const OptionalSearchTerm = z
  .string()
  .trim()
  .max(120)
  .optional()
  .transform((value) => value || undefined);

/**
 * Query string for `GET /api/admin/logs` (Audit Trail filter bar + pager).
 *
 * `limit` is capped so a crafted `?limit=100000` cannot ask the database for the
 * whole collection; the export path uses the ceiling deliberately.
 */
export const LogQuerySchema = z.object({
  type: z.enum(LogType).optional(),
  action: OptionalSearchTerm,
  user: OptionalSearchTerm,
  reference: OptionalSearchTerm,
  from: z
    .string()
    .refine((v) => !isNaN(Date.parse(v)), "Invalid from date")
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
});
