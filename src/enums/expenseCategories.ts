/**
 * Selectable expense categories for the New Request form
 * (designs/initiator/New Request.png).
 *
 * Kept as a const array rather than a TS enum because the category is also a
 * free-text-ish label rendered directly in tables and grouped on the reporting
 * dashboard — the literal string *is* the display value.
 */
export const EXPENSE_CATEGORIES = [
  "Travel",
  "Accommodation",
  "Equipment & Hardware",
  "Software & Licenses",
  "Professional Services",
  "Training & Development",
  "Marketing & Events",
  "Facilities & Utilities",
  "Logistics",
  "Other",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

/** Category applied when a legacy or seeded request carries an unknown label. */
export const DEFAULT_EXPENSE_CATEGORY: ExpenseCategory = "Other";
