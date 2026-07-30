/**
 * AdminAddBudgetItemModal
 * Captures a single budget line item (category, justification, allocation) for a department.
 * Consumed by AdminSetBudgetModal and by the "Add Category" action in AdminEditDepartmentModal.
 * Design source: designs/system-admin/Admin_ Add Itemal.png
 */
import React, { useEffect, useState } from "react";
import { ModalShell } from "../../ui/ModalShell";

// Default catalogue keeps the picker useful before a category API exists.
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

  const canSubmit = category.trim().length > 0 && Number(amount) > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onAddItem({ category, description, amount: Number(amount) });
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
        <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Select a category</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
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
            ₦
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
