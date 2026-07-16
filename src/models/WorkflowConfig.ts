import mongoose, { Schema } from "mongoose";
import { SystemRole } from "../enums/roles";

const WorkflowStepSchema = new Schema({
  stepIndex: { type: Number, required: true },
  stepName: { type: String, required: true },
  role: { type: String, enum: Object.values(SystemRole), required: true },
  minAmount: { type: Number, required: false, default: 0 },
  requiresAllApprovals: { type: Boolean, required: false, default: false },
});

const WorkflowConfigSchema = new Schema(
  {
    name: { type: String, required: true, default: "Default Expense Flow" },
    isActive: { type: Boolean, default: true },
    steps: { type: [WorkflowStepSchema], required: true },
  },
  { timestamps: true }
);

export const WorkflowConfig = mongoose.models.WorkflowConfig || mongoose.model("WorkflowConfig", WorkflowConfigSchema);
