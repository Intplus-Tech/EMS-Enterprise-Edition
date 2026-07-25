import React, { useState, useEffect } from "react";
import * as Icons from "lucide-react";

interface AdminEditDepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  department: any;
  onUpdateDepartment: (deptData: any) => void;
}

export const AdminEditDepartmentModal: React.FC<AdminEditDepartmentModalProps> = ({
  isOpen,
  onClose,
  department,
  onUpdateDepartment
}) => {
  const [deptName, setDeptName] = useState("");
  const [description, setDescription] = useState("");
  const [totalBudget, setTotalBudget] = useState<number>(0);

  useEffect(() => {
    if (department) {
      setDeptName(department.name || "");
      setDescription(department.description || "");
      setTotalBudget(department.totalBudget || department.budget || 250000);
    }
  }, [department]);

  if (!isOpen || !department) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateDepartment({
      ...department,
      name: deptName,
      description,
      totalBudget: Number(totalBudget)
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
        maxWidth: "520px",
        padding: "1.75rem",
        backgroundColor: "#1e293b",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "1rem",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
          <div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "700", color: "#f8fafc" }}>Edit Department</h3>
            <p style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: "0.25rem" }}>
              Update operational details and total budget allocation.
            </p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>
            <Icons.X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Department Name */}
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "600", color: "#94a3b8", marginBottom: "0.35rem" }}>
              Department Name
            </label>
            <input
              type="text"
              required
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

          {/* Description */}
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "600", color: "#94a3b8", marginBottom: "0.35rem" }}>
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Operational description..."
              style={{
                width: "100%",
                padding: "0.65rem 0.85rem",
                backgroundColor: "rgba(15, 23, 42, 0.6)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "0.5rem",
                color: "#f8fafc",
                fontSize: "0.9rem",
                outline: "none",
                resize: "none"
              }}
            />
          </div>

          {/* Budget Allocation */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "600", color: "#94a3b8", marginBottom: "0.35rem" }}>
              FY2026 Budget Allocation (₦)
            </label>
            <input
              type="number"
              required
              value={totalBudget}
              onChange={(e) => setTotalBudget(Number(e.target.value))}
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
              Update Department
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
