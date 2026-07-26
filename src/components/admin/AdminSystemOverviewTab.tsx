import React from "react";
import * as Icons from "lucide-react";

interface AdminSystemOverviewTabProps {
  currentUser: any;
  systemUsersCount?: number;
  departmentsCount?: number;
  systemLogs?: any[];
  onOpenAddUser: () => void;
  onOpenCreateDept: () => void;
  onOpenSetBudget: () => void;
}

export const AdminSystemOverviewTab: React.FC<AdminSystemOverviewTabProps> = ({
  currentUser,
  systemUsersCount = 0,
  departmentsCount = 0,
  systemLogs = [],
  onOpenAddUser,
  onOpenCreateDept,
  onOpenSetBudget
}) => {
  const userName = currentUser?.name || "System Admin";

  const recentActivities: any[] = systemLogs.slice(0, 5).map((l: any, idx: number) => ({
    id: l._id || `act-${idx}`,
    timestamp: l.timestamp ? new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "N/A",
    action: l.action || "System Event",
    subtext: l.message || "Action recorded in audit log",
    badge: l.actorName ? l.actorName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) : "SYS",
    context: l.actorRole || "System",
    icon: <Icons.Activity size={14} />
  }));

  return (
    <div>
      {/* Welcome Blue Banner */}
      <div style={{
        backgroundColor: "#2563eb",
        borderRadius: "1rem",
        padding: "2rem 2.5rem",
        color: "#ffffff",
        marginBottom: "2rem",
        boxShadow: "0 10px 25px -5px rgba(37, 99, 235, 0.4)"
      }}>
        <h1 style={{ fontSize: "2rem", fontWeight: "700", marginBottom: "0.5rem" }}>
          Welcome back, {userName}
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", fontSize: "0.9rem", color: "#bfdbfe" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Icons.Calendar size={16} /> Monday, May 12, 2025
          </span>
          <span>•</span>
          <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Icons.Clock size={16} /> Last login: Today, 07:15 AM
          </span>
        </div>
      </div>

      {/* System Overview Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <h2 style={{ fontSize: "1.35rem", fontWeight: "700", color: "rgb(var(--color-text))" }}>System Overview</h2>
        <span style={{ fontSize: "0.85rem", color: "rgb(var(--color-text-muted))", display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <Icons.RefreshCw size={14} /> Live data as of 09:00 AM
        </span>
      </div>

      {/* 4 Overview Stat Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "1.25rem",
        marginBottom: "2.5rem"
      }}>
        {/* Card 1: TOTAL USERS */}
        <div className="glass-panel" style={{ padding: "1.35rem", backgroundColor: "rgb(var(--color-surface))", borderRadius: "0.85rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              backgroundColor: "rgba(59, 130, 246, 0.15)",
              color: "#3b82f6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0
            }}>
              <Icons.Users size={22} />
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "rgb(var(--color-text-muted))", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                TOTAL USERS
              </div>
              <div style={{ fontSize: "1.65rem", fontWeight: "800", color: "rgb(var(--color-text))", marginTop: "0.15rem" }}>
                {systemUsersCount}
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: DEPARTMENTS */}
        <div className="glass-panel" style={{ padding: "1.35rem", backgroundColor: "rgb(var(--color-surface))", borderRadius: "0.85rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              backgroundColor: "rgba(139, 92, 246, 0.15)",
              color: "#a78bfa",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0
            }}>
              <Icons.Building2 size={22} />
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "rgb(var(--color-text-muted))", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                DEPARTMENTS
              </div>
              <div style={{ fontSize: "1.65rem", fontWeight: "800", color: "rgb(var(--color-text))", marginTop: "0.15rem" }}>
                {departmentsCount}
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: BUDGET PERIOD */}
        <div className="glass-panel" style={{ padding: "1.35rem", backgroundColor: "rgb(var(--color-surface))", borderRadius: "0.85rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              backgroundColor: "rgba(16, 185, 129, 0.15)",
              color: "#10b981",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0
            }}>
              <Icons.Calendar size={22} />
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "rgb(var(--color-text-muted))", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                BUDGET PERIOD
              </div>
              <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "rgb(var(--color-text))", marginTop: "0.15rem" }}>
                FY 2026
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: TOTAL BUDGET */}
        <div className="glass-panel" style={{ padding: "1.35rem", backgroundColor: "rgb(var(--color-surface))", borderRadius: "0.85rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              color: "#f87171",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0
            }}>
              <Icons.Lock size={22} />
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "rgb(var(--color-text-muted))", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                TOTAL BUDGET
              </div>
              <div style={{ fontSize: "1.45rem", fontWeight: "800", color: "rgb(var(--color-text))", marginTop: "0.15rem" }}>
                ₦250,000,000
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Quick Actions & Recent System Activity */}
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "1.5rem" }}>
        {/* Left Column: Quick Actions */}
        <div>
          <h3 style={{ fontSize: "1.15rem", fontWeight: "700", color: "rgb(var(--color-text))", marginBottom: "1rem" }}>
            Quick Actions
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Add New User button card */}
            <div 
              onClick={onOpenAddUser}
              className="glass-panel"
              style={{
                padding: "1.25rem",
                backgroundColor: "rgb(var(--color-surface))",
                borderRadius: "0.75rem",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                border: "1px solid rgba(var(--color-card-border), 0.5)",
                transition: "all 0.2s ease"
              }}
            >
              <div style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                backgroundColor: "rgba(59, 130, 246, 0.15)",
                color: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "0.75rem"
              }}>
                <Icons.UserPlus size={22} />
              </div>
              <span style={{ fontSize: "0.95rem", fontWeight: "700", color: "rgb(var(--color-text))" }}>
                Add New User
              </span>
            </div>

            {/* Create Dept card */}
            <div 
              onClick={onOpenCreateDept}
              className="glass-panel"
              style={{
                padding: "1.25rem",
                backgroundColor: "rgb(var(--color-surface))",
                borderRadius: "0.75rem",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                border: "1px solid rgba(var(--color-card-border), 0.5)",
                transition: "all 0.2s ease"
              }}
            >
              <div style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                backgroundColor: "rgba(16, 185, 129, 0.15)",
                color: "#10b981",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "0.75rem"
              }}>
                <Icons.Building size={22} />
              </div>
              <span style={{ fontSize: "0.95rem", fontWeight: "700", color: "rgb(var(--color-text))" }}>
                Create Dept.
              </span>
            </div>

            {/* Set Budget card */}
            <div 
              onClick={onOpenSetBudget}
              className="glass-panel"
              style={{
                padding: "1.25rem",
                backgroundColor: "rgb(var(--color-surface))",
                borderRadius: "0.75rem",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                border: "1px solid rgba(var(--color-card-border), 0.5)",
                transition: "all 0.2s ease"
              }}
            >
              <div style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                backgroundColor: "rgba(245, 158, 11, 0.15)",
                color: "#f59e0b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "0.75rem"
              }}>
                <Icons.Landmark size={22} />
              </div>
              <span style={{ fontSize: "0.95rem", fontWeight: "700", color: "rgb(var(--color-text))" }}>
                Set Budget
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Recent System Activity Table */}
        <div>
          <h3 style={{ fontSize: "1.15rem", fontWeight: "700", color: "rgb(var(--color-text))", marginBottom: "1rem" }}>
            Recent System Activity
          </h3>

          <div className="glass-panel" style={{ backgroundColor: "rgb(var(--color-surface))", borderRadius: "0.75rem", overflow: "hidden" }}>
            <table className="data-table" style={{ width: "100%" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(var(--color-card-border), 0.4)", backgroundColor: "rgba(var(--color-background), 0.5)" }}>
                  <th style={{ padding: "0.85rem 1.25rem", fontSize: "0.75rem", color: "rgb(var(--color-text-muted))" }}>TIMESTAMP</th>
                  <th style={{ padding: "0.85rem 1.25rem", fontSize: "0.75rem", color: "rgb(var(--color-text-muted))" }}>ACTION DESCRIPTION</th>
                  <th style={{ padding: "0.85rem 1.25rem", fontSize: "0.75rem", color: "rgb(var(--color-text-muted))" }}>INITIATOR / CONTEXT</th>
                </tr>
              </thead>
              <tbody>
                {recentActivities.map((act) => (
                  <tr key={act.id} style={{ borderBottom: "1px solid rgba(var(--color-card-border), 0.2)" }}>
                    <td style={{ padding: "1.1rem 1.25rem", fontSize: "0.85rem", color: "rgb(var(--color-text))", fontWeight: "600" }}>
                      {act.timestamp}
                    </td>
                    <td style={{ padding: "1.1rem 1.25rem" }}>
                      <div style={{ fontWeight: "700", color: "rgb(var(--color-text))", fontSize: "0.9rem" }}>{act.action}</div>
                      <div style={{ fontSize: "0.78rem", color: "rgb(var(--color-text-muted))", marginTop: "0.15rem" }}>{act.subtext}</div>
                    </td>
                    <td style={{ padding: "1.1rem 1.25rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                        {act.badge ? (
                          <div style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: "50%",
                            backgroundColor: "rgba(var(--color-card-border), 0.3)",
                            color: "rgb(var(--color-text))",
                            fontSize: "0.7rem",
                            fontWeight: "700",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                          }}>
                            {act.badge}
                          </div>
                        ) : (
                          <div style={{ color: "rgb(var(--color-text-muted))" }}>{act.icon}</div>
                        )}
                        <span style={{ fontSize: "0.85rem", color: "rgb(var(--color-text-muted))" }}>{act.context}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
