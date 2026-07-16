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

const ExpenseRequestSchema = new Schema(
  {
    requestNumber: { type: String, required: true, unique: true },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department", required: true },
    initiatorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    category: { type: String, required: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    supportingDocument: { type: String, required: true }, // Mandatory invoice or receipt
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
  { timestamps: true }
);

export const ExpenseRequest = mongoose.models.ExpenseRequest || mongoose.model("ExpenseRequest", ExpenseRequestSchema);
