"use client";

/**
 * InitiateExpenseRequestModal — "Expense Request Details" from
 * `designs/initiator/New Request.png`.
 *
 * Field order follows the design: department (read-only), payee and bank
 * details, business purpose, amount and required date, then the document
 * dropzone. Neither the category select nor the currency select the earlier
 * versions carried appears in the design — currency because every amount in
 * the system is Naira, category because an initiator does not classify their
 * own spend. The server now applies the default category (see
 * ExpenseService.initiateRequest), so reporting still groups these requests.
 */

import React, { RefObject, useState } from "react";
import * as Icons from "lucide-react";
import { AttachmentInput } from "../../types/api";
import { formatFileSize, MAX_ATTACHMENTS_PER_REQUEST } from "../../domains/attachments/attachment.rules";
import {
  ACCOUNT_NAME_MAX,
  ACCOUNT_NUMBER_MAX_DIGITS,
  ACCOUNT_NUMBER_MIN_DIGITS,
  BANK_NAME_MAX,
  DESCRIPTION_MAX,
  NEW_REQUEST_FIELDS,
  NewRequestField,
  NewRequestFormValues,
  toDigits,
  todayIsoDate,
  validateNewRequestForm,
  VENDOR_NAME_MAX,
} from "../../domains/expense/request-form.rules";
import { CURRENCY_SYMBOL } from "../ui/format";
import { FieldError } from "../ui/FieldError";
import { SubmitButton } from "../ui/SubmitButton";

interface InitiateExpenseRequestModalProps extends InitiateExpenseRequestFormProps {
  isOpen: boolean;
}

interface InitiateExpenseRequestFormProps {
  onClose: () => void;
  formError: string;
  /** Typed, not `any` (rule 1-I) — the validator and the provider share this shape. */
  newRequest: NewRequestFormValues;
  setNewRequest: React.Dispatch<React.SetStateAction<NewRequestFormValues>>;
  /** Read-only department shown at the top of the form, per the design. */
  departmentName?: string;
  fileInputRef: RefObject<HTMLInputElement | null>;
  handleFileUpload: (files: FileList | File[] | null, isResubmit?: boolean) => Promise<void>;
  isUploadingDoc: boolean;
  uploadDocError: string;
  /** Drops a not-yet-submitted upload from the form. */
  removeDraftAttachment: (url: string, isResubmit?: boolean) => void;
  handleCreateRequest: (e: React.FormEvent, shouldSubmit?: boolean) => Promise<void>;
  /**
   * Which write is in flight, so the button the initiator pressed is the one
   * that spins. Narrowed to the two this dialog can start (rule 1-I) — the
   * provider's wider phase type also covers the Reply dialog.
   */
  submitting?: "draft" | "submit" | null;
}

/**
 * Open/closed gate only.
 *
 * The form below is mounted rather than hidden, so its "which fields have been
 * touched" state starts clean on every open — a dialog reopened after a failed
 * attempt would otherwise come up pre-reddened against a blank form.
 */
export const InitiateExpenseRequestModal: React.FC<InitiateExpenseRequestModalProps> = ({
  isOpen,
  ...formProps
}) => (isOpen ? <InitiateExpenseRequestForm {...formProps} /> : null);

const InitiateExpenseRequestForm: React.FC<InitiateExpenseRequestFormProps> = ({
  onClose,
  formError,
  newRequest,
  setNewRequest,
  departmentName,
  fileInputRef,
  handleFileUpload,
  isUploadingDoc,
  uploadDocError,
  removeDraftAttachment,
  handleCreateRequest,
  submitting = null,
}) => {
  /**
   * Which fields the initiator has left, so a message appears once they have
   * had their turn at a field rather than the form turning red on open. A
   * submit attempt marks every field touched at once.
   */
  const [touched, setTouched] = useState<Partial<Record<NewRequestField, boolean>>>({});

  const set = (patch: Partial<NewRequestFormValues>) => setNewRequest({ ...newRequest, ...patch });
  const touch = (field: NewRequestField) => setTouched((prev) => ({ ...prev, [field]: true }));

  // Either write locks the whole dialog: a request must not be dismissed or
  // edited while the create/submit pair is still in flight against the server.
  const isBusy = submitting !== null;

  // Derived, not stored: the errors are a pure function of the form, so keeping
  // them in state would only create a second copy that can fall out of step.
  const errors = validateNewRequestForm(newRequest);
  const errorFor = (field: NewRequestField) => (touched[field] ? errors[field] : undefined);
  const invalidClass = (field: NewRequestField) => (errorFor(field) ? " is-invalid" : "");
  const describedBy = (field: NewRequestField) => (errorFor(field) ? `${field}-error` : undefined);

  /**
   * Reveals every outstanding message before delegating.
   *
   * The handler re-runs the same rules and refuses an invalid form, so this is
   * purely about showing the initiator *which* fields it stopped on — the
   * dialog previously reported one unnamed "required fields" line.
   */
  const attemptSubmit = (e: React.FormEvent | React.MouseEvent, shouldSubmit: boolean) => {
    setTouched(Object.fromEntries(NEW_REQUEST_FIELDS.map((f) => [f, true])));
    handleCreateRequest(e as React.FormEvent, shouldSubmit);
  };

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem 1rem", overflowY: "auto" }}>
      <div className="glass-panel" style={{ width: "100%", maxWidth: "640px", maxHeight: "88vh", overflowY: "auto", padding: 0, margin: "auto", display: "flex", flexDirection: "column" }}>

        {/* Header band, matching the tinted header in the design */}
        <div style={{ padding: "1.75rem 2rem 1.25rem", background: "rgba(37, 99, 235, 0.06)", borderBottom: "1px solid rgb(var(--color-card-border) / 0.5)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
          <div>
            <h3 style={{ fontWeight: 700, fontSize: "1.25rem", margin: 0 }}>Expense Request Details</h3>
            <p style={{ color: "rgb(var(--color-text-muted))", fontSize: "0.85rem", margin: "0.25rem 0 0" }}>
              Submit your financial request for departmental approval and budget verification.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isBusy}
            aria-label="Close"
            style={{ background: "none", border: "none", color: "rgb(var(--color-text-muted))", cursor: isBusy ? "not-allowed" : "pointer", opacity: isBusy ? 0.5 : 1, flexShrink: 0 }}
          >
            <Icons.X size={22} />
          </button>
        </div>

        {/* `noValidate`: the footer buttons sit outside this form, so native
            validation never ran for them and only Enter-to-submit saw it. One
            rule set for both paths beats two that disagree. */}
        <form
          noValidate
          onSubmit={(e) => attemptSubmit(e, true)}
          style={{ display: "flex", flexDirection: "column", gap: "1.15rem", padding: "1.75rem 2rem" }}
        >
          {formError && (
            <div className="glass-card" style={{ borderLeft: "4px solid rgb(var(--color-danger))", padding: "0.75rem", background: "rgba(239,68,68,0.05)" }}>
              <p style={{ color: "rgb(var(--color-danger))", fontSize: "0.85rem", margin: 0 }}>{formError}</p>
            </div>
          )}

          {/* Department — derived from the session, not chosen. The server
              re-derives it too, so this is display only. */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Department</label>
            <input
              type="text"
              value={departmentName || "Not assigned"}
              readOnly
              disabled
              className="form-input"
              style={{ background: "rgba(37, 99, 235, 0.06)", cursor: "not-allowed" }}
            />
          </div>

          {/* Vendor / payee */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="vendorName">Vendor/Payee Details</label>
            <input
              id="vendorName"
              type="text"
              required
              maxLength={VENDOR_NAME_MAX}
              placeholder="e.g. Acme Corp Int, AWS, Staples"
              value={newRequest.vendorName}
              onChange={(e) => set({ vendorName: e.target.value })}
              onBlur={() => touch("vendorName")}
              aria-invalid={Boolean(errorFor("vendorName"))}
              aria-describedby={describedBy("vendorName")}
              className={`form-input${invalidClass("vendorName")}`}
            />
            <FieldError id="vendorName-error" message={errorFor("vendorName")} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", alignItems: "start" }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="bankName">Bank Name</label>
              <input
                id="bankName"
                type="text"
                required
                maxLength={BANK_NAME_MAX}
                placeholder="e.g. Zenith Bank"
                value={newRequest.bankName}
                onChange={(e) => set({ bankName: e.target.value })}
                onBlur={() => touch("bankName")}
                aria-invalid={Boolean(errorFor("bankName"))}
                aria-describedby={describedBy("bankName")}
                className={`form-input${invalidClass("bankName")}`}
              />
              <FieldError id="bankName-error" message={errorFor("bankName")} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="accountNumber">Account Number</label>
              {/* Stays a text input on purpose: `type="number"` drops the leading
                  zero most NUBAN numbers carry and offers a spinner on an
                  identifier that is not a quantity. Non-digits are stripped as
                  they are typed, so a pasted "0123-4567-89" is accepted. */}
              <input
                id="accountNumber"
                type="text"
                required
                inputMode="numeric"
                autoComplete="off"
                maxLength={ACCOUNT_NUMBER_MAX_DIGITS}
                placeholder={`${ACCOUNT_NUMBER_MIN_DIGITS}-digit number`}
                value={newRequest.accountNumber}
                onChange={(e) => set({ accountNumber: toDigits(e.target.value).slice(0, ACCOUNT_NUMBER_MAX_DIGITS) })}
                onBlur={() => touch("accountNumber")}
                aria-invalid={Boolean(errorFor("accountNumber"))}
                aria-describedby={describedBy("accountNumber")}
                className={`form-input${invalidClass("accountNumber")}`}
              />
              <FieldError id="accountNumber-error" message={errorFor("accountNumber")} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="accountName">Account Name</label>
              <input
                id="accountName"
                type="text"
                required
                maxLength={ACCOUNT_NAME_MAX}
                placeholder="Full name on account"
                value={newRequest.accountName}
                onChange={(e) => set({ accountName: e.target.value })}
                onBlur={() => touch("accountName")}
                aria-invalid={Boolean(errorFor("accountName"))}
                aria-describedby={describedBy("accountName")}
                className={`form-input${invalidClass("accountName")}`}
              />
              <FieldError id="accountName-error" message={errorFor("accountName")} />
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="description">Description / Business Purpose</label>
            <textarea
              id="description"
              required
              rows={4}
              maxLength={DESCRIPTION_MAX}
              value={newRequest.description}
              onChange={(e) => set({ description: e.target.value })}
              onBlur={() => touch("description")}
              placeholder="Please provide a detailed explanation for this expense request..."
              aria-invalid={Boolean(errorFor("description"))}
              aria-describedby={describedBy("description")}
              className={`form-textarea${invalidClass("description")}`}
            />
            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
              <FieldError id="description-error" message={errorFor("description")} />
              {/* Counter sits opposite the message so the ceiling is visible
                  before it is hit, not only once the field stops accepting. */}
              <span style={{ marginLeft: "auto", flexShrink: 0, fontSize: "0.72rem", color: "rgb(var(--color-text-dim))", marginTop: "0.35rem" }}>
                {(newRequest.description || "").length}/{DESCRIPTION_MAX}
              </span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", alignItems: "start" }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="amount">Amount Requested</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "0.85rem", top: "1.35rem", transform: "translateY(-50%)", color: "rgb(var(--color-text-dim))", fontWeight: 600 }}>
                  {CURRENCY_SYMBOL}
                </span>
                <input
                  id="amount"
                  type="number"
                  required
                  // Smallest amount the 2-decimal rule allows, so the spinner
                  // and the validator bottom out at the same value.
                  min="0.01"
                  step="0.01"
                  value={newRequest.amount}
                  onChange={(e) => set({ amount: e.target.value })}
                  onBlur={() => touch("amount")}
                  placeholder="0.00"
                  aria-invalid={Boolean(errorFor("amount"))}
                  aria-describedby={describedBy("amount")}
                  className={`form-input${invalidClass("amount")}`}
                  style={{ paddingLeft: "2rem" }}
                />
              </div>
              <FieldError id="amount-error" message={errorFor("amount")} />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="requiredPaymentDate">Required Payment Date</label>
              {/* `min` blocks the past in the native picker; the rule still runs
                  because a typed date bypasses it in several browsers. The date
                  decides which budget period the request is checked against, so
                  a back-dated one has nothing to reserve. */}
              <input
                id="requiredPaymentDate"
                type="date"
                required
                min={todayIsoDate()}
                value={newRequest.requiredPaymentDate}
                onChange={(e) => set({ requiredPaymentDate: e.target.value })}
                onBlur={() => touch("requiredPaymentDate")}
                aria-invalid={Boolean(errorFor("requiredPaymentDate"))}
                aria-describedby={describedBy("requiredPaymentDate")}
                className={`form-input${invalidClass("requiredPaymentDate")}`}
              />
              <FieldError id="requiredPaymentDate-error" message={errorFor("requiredPaymentDate")} />
            </div>
          </div>

          {/* Hidden input backing the dropzone */}
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            multiple
            accept="image/*,.pdf,.doc,.docx,.xlsx,.xls,.txt"
            onChange={(e) => {
              handleFileUpload(e.target.files, false);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
          />

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ marginBottom: "0.4rem" }}>
              Supporting Documents ({newRequest.supportingDocuments.length}/{MAX_ATTACHMENTS_PER_REQUEST}){" "}
              <span style={{ color: "#EF4444" }}>*</span>
            </label>

            {/* Locked mid-submit: the payload has already left, so a file added
                now would never reach the request that is being created. */}
            <div
              onClick={() => { if (!isBusy) fileInputRef.current?.click(); }}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isBusy) return;
                if (e.dataTransfer.files?.length) handleFileUpload(e.dataTransfer.files, false);
              }}
              style={{
                border: "2px dashed rgba(37, 99, 235, 0.35)",
                borderRadius: "10px",
                padding: "2rem 1rem",
                textAlign: "center",
                cursor: isBusy ? "not-allowed" : "pointer",
                opacity: isBusy ? 0.6 : 1,
                background: "rgba(37, 99, 235, 0.04)",
              }}
            >
              <Icons.FileUp size={26} style={{ color: "#2563EB", marginBottom: "0.5rem" }} />
              <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "rgb(var(--color-text))" }}>
                {isUploadingDoc ? "Uploading…" : "Click to upload or drag and drop"}
              </div>
              <span style={{ fontSize: "0.78rem", color: "rgb(var(--color-text-dim))" }}>
                PDF, PNG, JPG or DOCX (max. 5MB)
              </span>
            </div>

            {/* The upload's own failure, then the count rule. They are separate
                problems: a file can fail to upload while the request still has
                enough documents attached to be valid. */}
            {uploadDocError && (
              <p style={{ color: "#EF4444", fontSize: "0.75rem", margin: "0.5rem 0 0" }}>{uploadDocError}</p>
            )}
            <FieldError id="supportingDocuments-error" message={errorFor("supportingDocuments")} />

            {/* Attached files carry their real size and can be removed before
                the request is created. */}
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.75rem" }}>
              {newRequest.supportingDocuments.map((doc: AttachmentInput) => (
                <div
                  key={doc.url}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    padding: "0.3rem 0.6rem",
                    borderRadius: "6px",
                    background: "rgba(37, 99, 235, 0.1)",
                    border: "1px solid rgba(37, 99, 235, 0.25)",
                    fontSize: "0.75rem",
                    color: "rgb(var(--color-text))",
                  }}
                >
                  <Icons.Paperclip size={12} style={{ color: "#2563EB" }} />
                  <span style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {doc.name}
                  </span>
                  {doc.size ? <span style={{ color: "rgb(var(--color-text-dim))" }}>{formatFileSize(doc.size)}</span> : null}
                  <button
                    type="button"
                    aria-label={`Remove ${doc.name}`}
                    onClick={(e) => { e.stopPropagation(); removeDraftAttachment(doc.url, false); }}
                    style={{ background: "none", border: "none", padding: 0, marginLeft: "0.2rem", cursor: "pointer", color: "#EF4444", lineHeight: 0 }}
                  >
                    <Icons.X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </form>

        {/* Footer band — Save Draft and Submit Request, as in the design.
            Both are SubmitButtons: submitting runs create *then* submit, and
            the plain buttons here stayed pressable for the whole of it. */}
        <div style={{ padding: "1.25rem 2rem", background: "rgba(37, 99, 235, 0.05)", borderTop: "1px solid rgb(var(--color-card-border) / 0.5)", display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
          <SubmitButton
            type="button"
            variant="secondary"
            onClick={(e) => attemptSubmit(e, false)}
            loading={submitting === "draft"}
            loadingLabel="Saving…"
            // Disabled, not spinning, while the other button owns the request.
            disabled={isBusy}
          >
            Save Draft
          </SubmitButton>
          <SubmitButton
            type="button"
            onClick={(e) => attemptSubmit(e, true)}
            loading={submitting === "submit"}
            loadingLabel="Submitting…"
            disabled={isBusy}
            style={{ background: "#2563EB", border: "none" }}
          >
            Submit Request
          </SubmitButton>
        </div>
      </div>
    </div>
  );
};
