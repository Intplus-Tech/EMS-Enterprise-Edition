import mongoose, { Schema } from "mongoose";

const BudgetPeriodSchema = new Schema(
  {
    departmentId: { type: Schema.Types.ObjectId, ref: "Department", required: true },
    periodName: { type: String, required: true }, // e.g. "Q3-2026", "2026-July"
    totalBudget: { type: Number, required: true, default: 0 },
    utilisedBudget: { type: Number, required: true, default: 0 },
    pendingBudget: { type: Number, required: true, default: 0 }, // Locked for in-flight requests
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
  },
  { timestamps: true }
);

// Compound index to ensure uniqueness of period per department
BudgetPeriodSchema.index({ departmentId: 1, periodName: 1 }, { unique: true });

export const BudgetPeriod = mongoose.models.BudgetPeriod || mongoose.model("BudgetPeriod", BudgetPeriodSchema);
