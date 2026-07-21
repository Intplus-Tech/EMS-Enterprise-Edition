import React from "react";
import * as Icons from "lucide-react";

interface WorkflowTabProps {
  currentUser: any;
  workflowSteps: any[];
  workflowMessage: string;
  handleStepDetailChange: (idx: number, field: string, value: any) => void;
  moveWorkflowStep: (idx: number, direction: "UP" | "DOWN") => void;
  handleSaveWorkflowConfig: () => void;
}

export const WorkflowTab: React.FC<WorkflowTabProps> = ({
  currentUser,
  workflowSteps,
  workflowMessage,
  handleStepDetailChange,
  moveWorkflowStep,
  handleSaveWorkflowConfig
}) => {
  if (currentUser?.role !== "ADMIN") return null;

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h2>Dynamic Lifecycle Settings</h2>
        <p style={{ color: "rgb(var(--color-text-muted))", fontSize: "0.9rem" }}>Drag/Re-order approval steps and define conditional routing thresholds.</p>
      </div>

      {workflowMessage && (
        <div className="glass-card" style={{ marginBottom: "1.5rem", borderLeft: "4px solid rgb(var(--color-secondary))", padding: "1rem" }}>
          <p style={{ fontSize: "0.9rem", color: "rgb(var(--color-text))" }}>{workflowMessage}</p>
        </div>
      )}

      <div className="glass-panel" style={{ padding: "1.5rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "2rem" }}>
          {workflowSteps.map((step, idx) => (
            <div key={step.stepIndex} className="glass-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(15,23,42,0.4)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <div style={{ background: "rgba(var(--color-primary), 0.2)", borderRadius: "50%", width: "2.5rem", height: "2.5rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontWeight: "bold", color: "rgb(var(--color-primary))", margin: "auto" }}>{idx + 1}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <input
                    type="text"
                    value={step.stepName}
                    onChange={(e) => handleStepDetailChange(idx, "stepName", e.target.value)}
                    className="form-input"
                    style={{ padding: "0.3rem 0.5rem", fontSize: "0.9rem", background: "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.1)", width: "240px", fontWeight: "600" }}
                  />
                  <div style={{ display: "flex", gap: "1rem", fontSize: "0.8rem", color: "rgb(var(--color-text-muted))" }}>
                    <span>Actor Role: <strong>{step.role}</strong></span>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
                <div className="form-group" style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "0.8rem", color: "rgb(var(--color-text-muted))" }}>Min Amount Rule: $</span>
                  <input
                    type="number"
                    value={step.minAmount}
                    onChange={(e) => handleStepDetailChange(idx, "minAmount", Number(e.target.value))}
                    className="form-input"
                    style={{ width: "90px", padding: "0.3rem 0.5rem", fontSize: "0.8rem" }}
                  />
                </div>

                <div style={{ display: "flex", gap: "0.25rem" }}>
                  <button
                    onClick={() => moveWorkflowStep(idx, "UP")}
                    disabled={idx === 0}
                    className="btn btn-secondary"
                    style={{ padding: "0.3rem 0.5rem" }}
                  >
                    <Icons.ChevronUp size={16} />
                  </button>
                  <button
                    onClick={() => moveWorkflowStep(idx, "DOWN")}
                    disabled={idx === workflowSteps.length - 1}
                    className="btn btn-secondary"
                    style={{ padding: "0.3rem 0.5rem" }}
                  >
                    <Icons.ChevronDown size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={handleSaveWorkflowConfig} className="btn btn-primary">
            <Icons.Save size={16} /> Save Workflow Rules
          </button>
        </div>
      </div>
    </div>
  );
};
