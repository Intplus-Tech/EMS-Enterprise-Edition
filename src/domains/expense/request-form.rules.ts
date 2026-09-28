/**
 * Field rules for the initiator's New Request form.
 *
 * Lives here rather than inside the dialog because these are business rules
 * (rule 1-S), and because two callers need the same answer: the modal renders
 * them per field as the initiator types, and `handleCreateRequest` re-runs them
 * as the submit gate. The gate used to be an ad-hoc if-chain in the provider
 * that checked four of the eight fields and reported "All required text fields
 * must be filled" without naming any of them.
 *
 * These are the *client's* rules. They are deliberately at least as strict as
 * `ExpenseInitiateSchema`, which remains the boundary that actually protects
 * the database (rule 5) — never treat this module as a substitute for it.
 */

import { MAX_ATTACHMENTS_PER_REQUEST } from "../attachments/attachment.rules";
import type { AttachmentInput } from "../../types/api";

/**
 * NUBAN account numbers are 10 digits. The ceiling is looser than the floor so
 * a domiciliary or correspondent-bank account is not rejected outright, but a
 * short number is: it cannot be paid and is caught here rather than by a bank
 * rejection days later.
 */
export const ACCOUNT_NUMBER_MIN_DIGITS = 10;
export const ACCOUNT_NUMBER_MAX_DIGITS = 20;

export const VENDOR_NAME_MAX = 120;
export const BANK_NAME_MAX = 80;
export const ACCOUNT_NAME_MAX = 120;
export const DESCRIPTION_MIN = 10;
export const DESCRIPTION_MAX = 1000;

/** Naira is quoted in kobo at most — three decimal places is a typo. */
export const AMOUNT_MAX_DECIMALS = 2;

/**
 * The shape the New Request form holds, and the single type the dialog and the
 * provider both speak. `amount` stays a string: it is raw input until submit,
 * and coercing early would lose the difference between "" and 0.
 */
export interface NewRequestFormValues {
  vendorName: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  description: string;
  amount: string;
  requiredPaymentDate: string;
  supportingDocuments: AttachmentInput[];
}

export type NewRequestField = keyof NewRequestFormValues;

/** Only the fields at fault appear; an empty object means the form is valid. */
export type NewRequestErrors = Partial<Record<NewRequestField, string>>;

/** Every field the form validates, in the order they appear on screen. */
export const NEW_REQUEST_FIELDS: NewRequestField[] = [
  "vendorName",
  "bankName",
  "accountNumber",
  "accountName",
  "description",
  "amount",
  "requiredPaymentDate",
  "supportingDocuments",
];

/**
 * Strips everything that is not a digit.
 *
 * Applied as the account-number field is typed, so "0123-4567-89" becomes
 * "0123456789" instead of being rejected after the fact. The field stays a text
 * input for exactly this reason — `type="number"` drops the leading zero that
 * most NUBAN numbers carry.
 */
export function toDigits(value: string): string {
  return (value ?? "").replace(/\D/g, "");
}

/**
 * Today as `YYYY-MM-DD` in the browser's own timezone. Also feeds the date
 * input's `min`, so the picker and the rule agree on where "past" starts.
 */
export function todayIsoDate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/** Decimal places in a raw numeric string, ignoring a trailing separator. */
function decimalPlaces(raw: string): number {
  const [, fraction = ""] = raw.split(".");
  return fraction.length;
}

/**
 * Validates one field. Returns "" when it passes, so callers can treat the
 * result as both the message and the boolean.
 */
export function validateNewRequestField(
  field: NewRequestField,
  values: NewRequestFormValues
): string {
  switch (field) {
    case "vendorName": {
      const value = (values.vendorName ?? "").trim();
      if (!value) return "Vendor or payee name is required.";
      if (value.length < 2) return "Enter the full vendor or payee name.";
      if (value.length > VENDOR_NAME_MAX) return `Keep this under ${VENDOR_NAME_MAX} characters.`;
      return "";
    }

    case "bankName": {
      const value = (values.bankName ?? "").trim();
      if (!value) return "Bank name is required.";
      if (value.length < 2) return "Enter the full bank name, e.g. Zenith Bank.";
      if (value.length > BANK_NAME_MAX) return `Keep this under ${BANK_NAME_MAX} characters.`;
      // Digits in a bank name almost always mean the account number went in the
      // wrong box — a mistake worth naming rather than passing to the payer.
      if (/\d/.test(value)) return "Bank name should not contain digits.";
      return "";
    }

    case "accountNumber": {
      const digits = toDigits(values.accountNumber ?? "");
      const raw = (values.accountNumber ?? "").trim();
      if (!raw) return "Account number is required.";
      if (digits.length !== raw.length) return "Account number must contain digits only.";
      if (digits.length < ACCOUNT_NUMBER_MIN_DIGITS) {
        return `Account number must be at least ${ACCOUNT_NUMBER_MIN_DIGITS} digits.`;
      }
      if (digits.length > ACCOUNT_NUMBER_MAX_DIGITS) {
        return `Account number cannot exceed ${ACCOUNT_NUMBER_MAX_DIGITS} digits.`;
      }
      return "";
    }

    case "accountName": {
      const value = (values.accountName ?? "").trim();
      if (!value) return "Account name is required.";
      if (value.length < 2) return "Enter the full name on the account.";
      if (value.length > ACCOUNT_NAME_MAX) return `Keep this under ${ACCOUNT_NAME_MAX} characters.`;
      return "";
    }

    case "description": {
      const value = (values.description ?? "").trim();
      if (!value) return "A business purpose is required.";
      if (value.length < DESCRIPTION_MIN) {
        return `Describe the purpose in at least ${DESCRIPTION_MIN} characters — an approver reads this to decide.`;
      }
      if (value.length > DESCRIPTION_MAX) return `Keep this under ${DESCRIPTION_MAX} characters.`;
      return "";
    }

    case "amount": {
      const raw = (values.amount ?? "").toString().trim();
      if (!raw) return "Amount requested is required.";
      // Signs are handled before the shape test so "-500" is answered with the
      // rule it actually broke rather than a generic "enter it in figures".
      if (raw.startsWith("-")) return "Amount must be greater than zero.";
      // The control is `type="number"`, so the browser hands back "" for text it
      // cannot parse — but paste and autofill still reach here with anything.
      if (!/^\d*\.?\d*$/.test(raw)) return "Enter the amount in figures, e.g. 250000.50";
      const amount = Number(raw);
      if (!Number.isFinite(amount)) return "Enter a valid amount.";
      if (amount <= 0) return "Amount must be greater than zero.";
      if (decimalPlaces(raw) > AMOUNT_MAX_DECIMALS) {
        return `Amount can have at most ${AMOUNT_MAX_DECIMALS} decimal places.`;
      }
      return "";
    }

    case "requiredPaymentDate": {
      const value = (values.requiredPaymentDate ?? "").trim();
      if (!value) return "A required payment date is needed.";
      if (Number.isNaN(Date.parse(value))) return "Enter a valid date.";
      // Compared as ISO strings, which sort correctly and — unlike `new Date()`
      // on a bare `YYYY-MM-DD`, which parses as UTC midnight — cannot slip a day
      // for anyone east or west of UTC.
      if (value < todayIsoDate()) return "The payment date cannot be in the past.";
      return "";
    }

    case "supportingDocuments": {
      const count = values.supportingDocuments?.length ?? 0;
      if (count === 0) return "Attach at least one supporting document.";
      if (count > MAX_ATTACHMENTS_PER_REQUEST) {
        return `Attach at most ${MAX_ATTACHMENTS_PER_REQUEST} documents.`;
      }
      return "";
    }

    default:
      return "";
  }
}

/** Every failing field, keyed by name. Empty object means the form is valid. */
export function validateNewRequestForm(values: NewRequestFormValues): NewRequestErrors {
  const errors: NewRequestErrors = {};
  for (const field of NEW_REQUEST_FIELDS) {
    const message = validateNewRequestField(field, values);
    if (message) errors[field] = message;
  }
  return errors;
}

/**
 * The first failure in screen order, for the summary banner at the top of the
 * dialog. Screen order matters: it points at the field the initiator will reach
 * first when they scroll back up.
 */
export function firstNewRequestError(errors: NewRequestErrors): string | undefined {
  const field = NEW_REQUEST_FIELDS.find((name) => errors[name]);
  return field ? errors[field] : undefined;
}
