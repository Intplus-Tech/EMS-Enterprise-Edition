import { z } from "zod";
import { SystemRole } from "../enums/roles";
import { PermissionAction, PermissionResource } from "../enums/permissions";
import { WorkflowActionType } from "../enums/workflowActions";

export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(4, "Password must be at least 4 characters long"),
});

export const VendorBankDetailsSchema = z.object({
  accountNumber: z.string().min(5, "Account number must be at least 5 digits"),
  bankName: z.string().min(2, "Bank name is required"),
  accountName: z.string().min(2, "Account name is required"),
});

export const ExpenseInitiateSchema = z.object({
  category: z.string().min(2, "Category is required"),
  description: z.string().min(3, "Description is required"),
  amount: z.number().positive("Amount must be greater than zero"),
  supportingDocument: z.string().min(1, "Supporting invoice or document is mandatory"),
  vendorName: z.string().min(2, "Vendor name is required"),
  vendorBankDetails: VendorBankDetailsSchema,
  requiredPaymentDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid required payment date format",
  }),
});

export const ExceptionalBudgetSchema = z.object({
  action: z.nativeEnum(WorkflowActionType),
  comment: z.string().optional(),
  adjustedAmount: z.number().positive().optional(),
});

export const WorkflowActionSchema = z.object({
  action: z.nativeEnum(WorkflowActionType),
  comment: z.string().optional(),
});

export const PaymentReleaseSchema = z.object({
  reference: z.string().min(3, "Payment transaction reference is required"),
  receipt: z.string().optional(),
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

export const DepartmentCreateSchema = z.object({
  name: z.string().trim().min(2, "Department name is required").max(80),
  description: z.string().trim().max(500).optional(),
  headUserId: OptionalObjectId,
});

export const DepartmentUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(500).optional(),
  headUserId: OptionalObjectId,
  isActive: z.boolean().optional(),
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

export const BudgetLineItemSchema = z.object({
  name: z.string().trim().min(2, "Line item name is required").max(80),
  description: z.string().trim().max(300).optional(),
  amount: z.number().nonnegative("Line item amount cannot be negative"),
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
