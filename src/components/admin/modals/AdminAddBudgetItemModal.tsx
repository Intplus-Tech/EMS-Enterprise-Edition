/**
 * AdminAddBudgetItemModal
 * Captures a single budget line item (category, justification, allocation) for a department.
 * Consumed by AdminSetBudgetModal and by the "Add Category" action in AdminEditDepartmentModal.
 * Design source: designs/system-admin/Admin_ Add Itemal.png
 */
import React, { useEffect, useState } from "react";
import { ModalShell } from "../../ui/ModalShell";
import { CURRENCY_SYMBOL } from "../../ui/format";

// Mirrors BudgetLineItemSchema.name so the server never rejects what the form allowed.
const CATEGORY_MIN_LENGTH = 2;
const CATEGORY_MAX_LENGTH = 80;

// Suggestions only — administrators may type any category name.
const DEFAULT_CATEGORIES = [
  "Hardware & Infrastructure",
  "Software Subscriptions",
  "Training & Development",
  "Travel & Accommodation",
  "Professional Services",
  "Office Supplies",
  "Marketing & Events",
];

export interface BudgetItemPayload {
  category: string;
  description: string;
  amount: number;
}

interface AdminAddBudgetItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  departmentName?: string;
  categories?: string[];
  onAddItem: (item: BudgetItemPayload) => void;
}

export const AdminAddBudgetItemModal: React.FC<AdminAddBudgetItemModalProps> = ({
  isOpen,
  onClose,
  departmentName,
  categories = DEFAULT_CATEGORIES,
  onAddItem,
}) => {
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");

  // Reset on every open so a previous entry never leaks into the next one.
  useEffect(() => {
    if (isOpen) {
      setCategory("");
      setDescription("");
      setAmount("");
    }
  }, [isOpen]);

  const trimmedCategory = category.trim();
  const canSubmit = trimmedCategory.length >= CATEGORY_MIN_LENGTH && Number(amount) > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onAddItem({ category: trimmedCategory, description, amount: Number(amount) });
    onClose();
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Budget Item"
      subtitle={`Define a specific spending category for the ${departmentName || "selected"} department.`}
      maxWidth="560px"
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "1.25rem" }}>
          <button type="button" onClick={onClose} className="btn btn-secondary" style={{ background: "none", border: "none" }}>
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="btn btn-primary"
            style={{ background: "#2563EB", border: "none", opacity: canSubmit ? 1 : 0.5, cursor: canSubmit ? "pointer" : "not-allowed" }}
          >
            Add Item
          </button>
        </div>
      }
    >
      {/* Line Item Category */}
      <div style={{ marginBottom: "1.25rem" }}>
        <label className="form-label">Line Item Category</label>
        {/* Free-text so each department can name its own lines; the datalist only suggests, it never restricts. */}
        <input
          type="text"
          className="form-input"
          list="budget-item-category-suggestions"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="e.g. Cloud Hosting"
          maxLength={CATEGORY_MAX_LENGTH}
        />
        <datalist id="budget-item-category-suggestions">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>

      {/* Description / justification */}
      <div style={{ marginBottom: "1.25rem" }}>
        <label className="form-label">Description</label>
        <textarea
          rows={3}
          className="form-textarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter a brief justification for this allocation."
          style={{ resize: "vertical" }}
        />
      </div>

      {/* Allocated amount — the ₦ prefix mirrors the design's inline adornment */}
      <div>
        <label className="form-label">Allocated Amount (Naira)</label>
        <div style={{ position: "relative" }}>
          <span
            style={{
              position: "absolute",
              left: "0.85rem",
              top: "50%",
              transform: "translateY(-50%)",
              color: "rgb(var(--color-text-muted))",
              fontSize: "0.95rem",
              pointerEvents: "none",
            }}
          >
            {CURRENCY_SYMBOL}
          </span>
          <input
            type="number"
            min={0}
            step="0.01"
            className="form-input"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            style={{ paddingLeft: "2.1rem" }}
          />
        </div>
      </div>
    </ModalShell>
  );
};
