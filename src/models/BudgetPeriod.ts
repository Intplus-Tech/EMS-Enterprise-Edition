import mongoose, { Schema } from "mongoose";

/**
 * A one-time budget increase a Finance Head granted against a budget item to
 * clear a specific over-budget request.
 *
 * Held apart from the item's `amount` on purpose: that field is the allocation
 * an administrator set, and an exception must not silently rewrite it. Keeping
 * the grants as their own rows is what lets an item report an honest ceiling
 * (allocation + expansions) while still showing what was originally budgeted
 * and who authorised each departure from it.
 *
 * Expansions live on the item rather than the period because that is the grain
 * the Finance Head actually rules at — a department is over budget only because
 * one of its items is, and reporting the overrun anywhere coarser loses which.
 * The department's ceiling rises with the item's; see `effectiveBudget`.
 */
const BudgetExpansionSchema = new Schema(
  {
    requestId: { type: Schema.Types.ObjectId, ref: "ExpenseRequest", required: true },
    /** The deficit covered — not the request total, which the allocation part-funds. */
    amount: { type: Number, required: true },
    approvedById: { type: Schema.Types.ObjectId, ref: "User" },
    approvedByName: { type: String },
    reason: { type: String },
    approvedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

/**
 * One budget item — the unit a department's budget is actually composed of.
 *
 * An approver attaches every request to one of these, so the item carries its
 * own ledger rather than being the display-only label it used to be: `amount`
 * is what was allocated, `pendingAmount` what attached in-flight requests have
 * reserved against it, and `utilisedAmount` what has actually been paid out.
 * The department's period totals are the roll-up of these.
 */
const BudgetItemSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  amount: { type: Number, required: true, default: 0 },
  utilisedAmount: { type: Number, required: true, default: 0 },
  pendingAmount: { type: Number, required: true, default: 0 },
  expansions: { type: [BudgetExpansionSchema], default: [] },
});

const BudgetPeriodSchema = new Schema(
  {
    departmentId: { type: Schema.Types.ObjectId, ref: "Department", required: true },
    periodName: { type: String, required: true }, // e.g. "Q3-2026", "2026-July"
    totalBudget: { type: Number, required: true, default: 0 },
    utilisedBudget: { type: Number, required: true, default: 0 },
    pendingBudget: { type: Number, required: true, default: 0 }, // Locked for in-flight requests
    // The budget items this department's budget is composed of. The sum of these
    // drives totalBudget, but totalBudget is stored so historical periods stay
    // accurate if an item is later removed. Each carries a stable `_id`, which
    // is what a request's `budgetItemId` points at.
    lineItems: { type: [BudgetItemSchema], default: [] },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
  },
  { timestamps: true }
);

// Compound index to ensure uniqueness of period per department
BudgetPeriodSchema.index({ departmentId: 1, periodName: 1 }, { unique: true });

export const BudgetPeriod = mongoose.models.BudgetPeriod || mongoose.model("BudgetPeriod", BudgetPeriodSchema);
