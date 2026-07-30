import React from "react";
import * as Icons from "lucide-react";
import { AdminUserDto } from "../types/api";

export interface ResendInviteInput {
  name: string;
  email: string;
  role: string;
  departmentId: string;
}

interface UsersTabProps {
  currentUser: any;
  systemUsers: AdminUserDto[];
  /** Opens a blank invitation dialog. */
  onOpenInvite: () => void;
  /** Re-issues an invitation; the page owns the request (engineering rule 1-D). */
  onResendInvite: (input: ResendInviteInput) => void;
}

export const UsersTab: React.FC<UsersTabProps> = ({
  currentUser,
  systemUsers,
  onOpenInvite,
  onResendInvite
}) => {
  if (currentUser?.role !== "ADMIN") return null;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h2>User & Invitation Directory</h2>
          <p style={{ color: "rgb(var(--color-text-muted))", fontSize: "0.9rem" }}>Manage organization access rights and track invitation status.</p>
        </div>
        <button
          onClick={() => onOpenInvite()}
          className="btn btn-primary"
        >
          <Icons.UserPlus size={16} /> Invite User
        </button>
      </div>

      <div className="glass-panel" style={{ padding: "1.5rem" }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Department</th>
                <th>Status</th>
                <th>Onboarding Link</th>
              </tr>
            </thead>
            <tbody>
              {systemUsers.map((user) => (
                <tr key={user.id}>
                  <td><strong>{user.name}</strong></td>
                  <td>{user.email}</td>
                  <td>
                    <span className="badge badge-draft" style={{ textTransform: "none" }}>{user.role}</span>
                  </td>
                  <td>{user.department ? user.department.name : <span style={{ color: "rgb(var(--color-text-dim))" }}>N/A</span>}</td>
                  <td>
                    {user.isActive ? (
                      <span className="badge badge-paid">Active</span>
                    ) : (
                      <span className="badge badge-warning">Pending Invite</span>
                    )}
                  </td>
                  <td>
                    {!user.isActive ? (
                      <button
                        onClick={() =>
                          onResendInvite({
                            name: user.name,
                            email: user.email,
                            role: user.role,
                            departmentId: user.department?.id || ""
                          })
                        }
                        className="btn btn-secondary"
                        style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                      >
                        <Icons.Mail size={12} style={{ marginRight: "0.25rem" }} /> Get Invite Link / Preview
                      </button>
                    ) : (
                      <span style={{ color: "rgb(var(--color-text-dim))", fontSize: "0.85rem" }}>Fully Setup</span>
                    )}
                  </td>
                </tr>
              ))}
              {systemUsers.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", color: "rgb(var(--color-text-dim))" }}>
                    No users found in the system.
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
