/**
 * The expense-category vocabulary.
 *
 * No longer offered as a picker: the New Request form does not ask the
 * initiator to classify their spend (designs/initiator/New Request.png shows no
 * such field), so `DEFAULT_EXPENSE_CATEGORY` is what new requests carry. The
 * list stays because seeded and pre-existing records use these labels, and the
 * reporting filters derive their options from stored values.
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
