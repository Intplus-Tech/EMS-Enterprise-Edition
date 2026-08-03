/**
 * AdminSetBudgetModal
 * Assigns a fiscal allocation to a department by composing budget line items.
 * Line-item capture is delegated to AdminAddBudgetItemModal so both entry points
 * (Set Budget, Edit Department) collect identical fields.
 * Design source: designs/system-admin/Set Budget.png
 */
import React, { useState } from "react";
import * as Icons from "lucide-react";
import { ModalShell } from "../../ui/ModalShell";
import { formatNairaPrecise } from "../../ui/format";
import { AdminAddBudgetItemModal, BudgetItemPayload } from "./AdminAddBudgetItemModal";

interface AdminSetBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  departments: any[];
  onSetBudget: (departmentId: string, totalAmount: number, lineItems: any[]) => void;
}

export const AdminSetBudgetModal: React.FC<AdminSetBudgetModalProps> = ({
  isOpen,
  onClose,
  departments,
  onSetBudget
}) => {
  const [selectedDeptId, setSelectedDeptId] = useState(departments[0]?._id || departments[0]?.id || "");
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [showAddItem, setShowAddItem] = useState(false);

  if (!isOpen) return null;

  const totalAllocation = lineItems.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
  const selectedDept = departments.find((d: any) => (d._id || d.id) === selectedDeptId);

  const handleAddLineItem = (item: BudgetItemPayload) => {
    setLineItems([...lineItems, { id: Date.now().toString(), name: item.category, description: item.description, amount: item.amount }]);
  };

  const handleItemChange = (id: string, field: string, value: any) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        return { ...item, [field]: field === "amount" ? Number(value) || 0 : value };
      }
      return item;
    }));
  };

  const handleRemoveItem = (id: string) => {
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  const handleSubmit = () => {
    onSetBudget(selectedDeptId, totalAllocation, lineItems);
    onClose();
  };

  return (
    <>
      <ModalShell
        isOpen={isOpen}
        onClose={onClose}
        title="Set Budget"
        subtitle="Establish a new operational unit and assign resources."
        maxWidth="700px"
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "1.25rem" }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ background: "none", border: "none" }}>
              Cancel
            </button>
            <button type="button" onClick={handleSubmit} className="btn btn-primary" style={{ background: "#2563EB", border: "none" }}>
              Finish
            </button>
          </div>
        }
      >
        {/* Department Selection */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label className="form-label">Department Name</label>
          <select className="form-select" value={selectedDeptId} onChange={(e) => setSelectedDeptId(e.target.value)}>
            <option value="">Select Department</option>
            {departments.map((d: any) => (
              <option key={d._id || d.id} value={d._id || d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        {/* Budget box — running total plus the composed line items */}
        <div style={{
          border: "1px solid rgba(37, 99, 235, 0.2)",
          borderRadius: "0.75rem",
          overflow: "hidden"
        }}>
          <div style={{
            padding: "0.75rem 1.25rem",
            background: "rgba(37, 99, 235, 0.1)",
            fontSize: "0.72rem",
            fontWeight: 700,
            letterSpacing: "0.05em",
            color: "rgb(var(--color-text-muted))"
          }}>
            BUDGET
          </div>

          <div style={{ padding: "1.25rem" }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.05em", color: "rgb(var(--color-text-muted))" }}>
              TOTAL ALLOCATION
            </div>
            <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#2563EB", marginTop: "0.15rem" }}>
              {formatNairaPrecise(totalAllocation)}
            </div>

            {lineItems.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1rem" }}>
                {lineItems.map(item => (
                  <div key={item.id} style={{
                    background: "rgb(var(--color-surface-secondary) / 0.5)",
                    border: "1px solid rgb(var(--color-card-border))",
                    borderRadius: "0.5rem",
                    padding: "0.65rem 0.85rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "0.5rem"
                  }}>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleItemChange(item.id, "name", e.target.value)}
                      aria-label="Budget item name"
                      style={{ background: "none", border: "none", color: "rgb(var(--color-text))", fontWeight: 600, fontSize: "0.85rem", flexGrow: 1, outline: "none" }}
                    />
                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <span style={{ fontSize: "0.8rem", color: "rgb(var(--color-text-muted))" }}>₦</span>
                      <input
                        type="number"
                        value={item.amount}
                        onChange={(e) => handleItemChange(item.id, "amount", e.target.value)}
                        aria-label="Budget item amount"
                        className="form-input"
                        style={{ width: "120px", padding: "0.25rem 0.5rem", fontSize: "0.85rem", textAlign: "right" }}
                      />
                      <button type="button" onClick={() => handleRemoveItem(item.id)} aria-label={`Remove ${item.name}`} style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer" }}>
                        <Icons.Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add line item — opens the shared budget-item modal */}
          <button
            type="button"
            onClick={() => setShowAddItem(true)}
            style={{
              width: "100%",
              padding: "1rem",
              border: "none",
              borderTop: "1px dashed rgba(37, 99, 235, 0.35)",
              background: "transparent",
              color: "rgb(var(--color-text-muted))",
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.6rem",
              cursor: "pointer"
            }}
          >
            <Icons.PlusCircle size={16} />
            Click &quot;Add Line Item&quot; to define a new budget category
          </button>
        </div>
      </ModalShell>

      <AdminAddBudgetItemModal
        isOpen={showAddItem}
        onClose={() => setShowAddItem(false)}
        departmentName={selectedDept?.name}
        onAddItem={handleAddLineItem}
      />
    </>
  );
};
