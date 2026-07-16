import { z } from "zod";
import { SystemRole } from "../enums/roles";

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
  action: z.enum(["APPROVE", "REJECT", "RETURN"]),
  comment: z.string().optional(),
  adjustedAmount: z.number().positive().optional(),
});

export const WorkflowActionSchema = z.object({
  action: z.enum(["APPROVE", "REJECT", "RETURN"]),
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
