import React, { useState } from "react";
import * as Icons from "lucide-react";

interface LineItem {
  id: string;
  name: string;
  description: string;
  amount: number;
}

interface AdminCreateDepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateDepartment: (deptData: any) => void;
}

export const AdminCreateDepartmentModal: React.FC<AdminCreateDepartmentModalProps> = ({
  isOpen,
  onClose,
  onCreateDepartment
}) => {
  const [deptName, setDeptName] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: "1", name: "Cloud Infrastructure", description: "AWS and Azure monthly hosting fees", amount: 4500000 },
    { id: "2", name: "Cybersecurity License", description: "Annual enterprise security suite renewal", amount: 2000000 },
    { id: "3", name: "Hardware Refresh", description: "Replacement of aging laptop fleet", amount: 2500000 }
  ]);

  if (!isOpen) return null;

  const totalAllocation = lineItems.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);

  const handleAddLineItem = () => {
    const newItem: LineItem = {
      id: Date.now().toString(),
      name: "New Budget Category",
      description: "Operational expenditure allocation",
      amount: 1000000
    };
    setLineItems([...lineItems, newItem]);
  };

  const handleItemChange = (id: string, field: keyof LineItem, value: any) => {
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
    onCreateDepartment({
      name: deptName,
      totalBudget: totalAllocation,
      lineItems
    });
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
        maxWidth: "600px",
        padding: "1.75rem",
        backgroundColor: "#1e293b",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "1rem",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        maxHeight: "90vh",
        overflowY: "auto"
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
          <div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "700", color: "#f8fafc" }}>Create New Department</h3>
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
          {/* Department Name */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "600", color: "#94a3b8", marginBottom: "0.35rem" }}>
              Department Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Global Research & Development"
              value={deptName}
              onChange={(e) => setDeptName(e.target.value)}
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
            />
          </div>

          {/* Budget Box Section */}
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

            {/* Line Items */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {lineItems.map((item) => (
                <div key={item.id} style={{
                  backgroundColor: "rgba(15, 23, 42, 0.5)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "0.5rem",
                  padding: "0.75rem 1rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "0.75rem"
                }}>
                  <div style={{ flexGrow: 1 }}>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleItemChange(item.id, "name", e.target.value)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#f8fafc",
                        fontWeight: "600",
                        fontSize: "0.85rem",
                        width: "100%",
                        outline: "none"
                      }}
                    />
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleItemChange(item.id, "description", e.target.value)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#94a3b8",
                        fontSize: "0.75rem",
                        width: "100%",
                        outline: "none"
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "0.85rem", color: "#94a3b8", fontWeight: "600" }}>₦</span>
                    <input
                      type="number"
                      value={item.amount}
                      onChange={(e) => handleItemChange(item.id, "amount", e.target.value)}
                      style={{
                        width: "110px",
                        padding: "0.35rem 0.6rem",
                        backgroundColor: "rgba(30, 41, 59, 0.8)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        borderRadius: "0.375rem",
                        color: "#f8fafc",
                        fontSize: "0.85rem",
                        textAlign: "right",
                        outline: "none"
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: "0.2rem" }}
                    >
                      <Icons.Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Line Item button */}
            <button
              type="button"
              onClick={handleAddLineItem}
              style={{
                width: "100%",
                marginTop: "1rem",
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
              Create Department
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
