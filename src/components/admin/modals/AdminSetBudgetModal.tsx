import React, { useState } from "react";
import * as Icons from "lucide-react";

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

  if (!isOpen) return null;

  const totalAllocation = lineItems.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);

  const handleAddLineItem = () => {
    setLineItems([
      ...lineItems,
      { id: Date.now().toString(), name: "Operational Expense", description: "Budget item description", amount: 1500000 }
    ]);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSetBudget(selectedDeptId, totalAllocation, lineItems);
    onClose();
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      backgroundColor: "rgba(15, 23, 42, 0.75)",
      backdropFilter: "blur(4px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      padding: "1rem"
    }}>
      <div className="glass-panel" style={{
        width: "100%",
        maxWidth: "580px",
        padding: "1.75rem",
        backgroundColor: "#1e293b",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "1rem",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
          <div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "700", color: "#f8fafc" }}>Set Budget</h3>
            <p style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: "0.25rem" }}>
              Establish a new operational unit and assign resources.
            </p>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              padding: "0.25rem"
            }}
          >
            <Icons.X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Department Selection */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "600", color: "#94a3b8", marginBottom: "0.35rem" }}>
              Department Name
            </label>
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              style={{
                width: "100%",
                padding: "0.65rem 0.85rem",
                backgroundColor: "rgba(15, 23, 42, 0.6)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "0.5rem",
                color: "#f8fafc",
                fontSize: "0.9rem",
                outline: "none"
              }}
            >
              <option value="" disabled style={{ background: "#1e293b" }}>Select Department</option>
              {departments.map((d: any) => (
                <option key={d._id || d.id} value={d._id || d.id} style={{ background: "#1e293b" }}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Budget Box */}
          <div style={{
            backgroundColor: "rgba(59, 130, 246, 0.08)",
            border: "1px solid rgba(59, 130, 246, 0.2)",
            borderRadius: "0.75rem",
            padding: "1.25rem",
            marginBottom: "1.5rem"
          }}>
            <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
              BUDGET
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <div style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: "600" }}>TOTAL ALLOCATION</div>
              <div style={{ fontSize: "1.35rem", fontWeight: "800", color: "#38bdf8", marginTop: "0.15rem" }}>
                ₦{totalAllocation.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>

            {/* Line items list */}
            {lineItems.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1rem" }}>
                {lineItems.map(item => (
                  <div key={item.id} style={{
                    backgroundColor: "rgba(15, 23, 42, 0.5)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "0.5rem",
                    padding: "0.65rem 0.85rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "0.5rem"
                  }}>
                    <div style={{ flexGrow: 1 }}>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleItemChange(item.id, "name", e.target.value)}
                        style={{ background: "none", border: "none", color: "#f8fafc", fontWeight: "600", fontSize: "0.85rem", width: "100%", outline: "none" }}
                      />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>₦</span>
                      <input
                        type="number"
                        value={item.amount}
                        onChange={(e) => handleItemChange(item.id, "amount", e.target.value)}
                        style={{ width: "100px", padding: "0.25rem 0.5rem", backgroundColor: "rgba(30, 41, 59, 0.8)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "0.25rem", color: "#f8fafc", fontSize: "0.85rem", textAlign: "right", outline: "none" }}
                      />
                      <button type="button" onClick={() => handleRemoveItem(item.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}>
                        <Icons.Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add line item button */}
            <button
              type="button"
              onClick={handleAddLineItem}
              style={{
                width: "100%",
                padding: "0.65rem",
                borderRadius: "0.5rem",
                border: "1px dashed rgba(59, 130, 246, 0.4)",
                backgroundColor: "transparent",
                color: "#60a5fa",
                fontSize: "0.8rem",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                cursor: "pointer"
              }}
            >
              <Icons.PlusCircle size={16} />
              Click "Add Line Item" to define a new budget category
            </button>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "0.65rem 1.25rem",
                borderRadius: "0.5rem",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                backgroundColor: "transparent",
                color: "#f8fafc",
                fontWeight: "600",
                fontSize: "0.85rem",
                cursor: "pointer"
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: "0.65rem 1.25rem",
                borderRadius: "0.5rem",
                border: "none",
                backgroundColor: "#2563eb",
                color: "#ffffff",
                fontWeight: "600",
                fontSize: "0.85rem",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(37, 99, 235, 0.35)"
              }}
            >
              Finish
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
