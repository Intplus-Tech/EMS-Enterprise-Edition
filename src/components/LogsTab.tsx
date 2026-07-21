import React from "react";

interface LogsTabProps {
  currentUser: any;
  systemLogs: any[];
  logFilter: string;
  setLogFilter: (f: string) => void;
  loadLogs: (filter: string) => void;
}

export const LogsTab: React.FC<LogsTabProps> = ({
  currentUser,
  systemLogs,
  logFilter,
  setLogFilter,
  loadLogs
}) => {
  if (currentUser?.role !== "ADMIN") return null;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h2>Security Auditing Trails</h2>
          <p style={{ color: "rgb(var(--color-text-muted))", fontSize: "0.9rem" }}>Organization-wide immutable compliance logs.</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {["ALL", "AUDIT", "EXCEPTION", "APP"].map((f) => (
            <button
              key={f}
              onClick={() => { setLogFilter(f); loadLogs(f); }}
              className="btn"
              style={{
                padding: "0.4rem 0.8rem",
                fontSize: "0.8rem",
                background: logFilter === f ? "rgb(var(--color-primary))" : "rgba(255,255,255,0.05)",
                color: "#fff"
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-panel" style={{ padding: "1.5rem" }}>
        <div className="table-container" style={{ maxHeight: "600px", overflowY: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Type</th>
                <th>Action</th>
                <th>Message</th>
                <th>Actor</th>
              </tr>
            </thead>
            <tbody>
              {systemLogs.map((log) => (
                <tr key={log._id}>
                  <td style={{ fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td>
                    <span className={`badge badge-${log.type.toLowerCase()}`}>{log.type}</span>
                  </td>
                  <td style={{ fontSize: "0.85rem", fontWeight: "600" }}>{log.action}</td>
                  <td style={{ fontSize: "0.85rem" }}>
                    {log.message}
                    {log.details && (
                      <details style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "rgb(var(--color-text-dim))" }}>
                        <summary>View metadata</summary>
                        <pre style={{ marginTop: "0.25rem", padding: "0.5rem", background: "#0a0a0a", borderRadius: "4px", overflowX: "auto" }}>
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </td>
                  <td style={{ fontSize: "0.8rem" }}>
                    {log.actorName ? `${log.actorName} (${log.actorRole})` : "System"}
                  </td>
                </tr>
              ))}
              {systemLogs.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", color: "rgb(var(--color-text-dim))" }}>
                    No audit trails found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
