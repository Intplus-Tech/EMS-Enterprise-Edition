"use client";

import React from "react";
import * as Icons from "lucide-react";
import { SubmitButton } from "../ui/SubmitButton";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  settingsMessage: string;
  settingsError: string;
  settingsForm: any;
  setSettingsForm: React.Dispatch<React.SetStateAction<any>>;
  showPasswordCurrentToggle: boolean;
  setShowPasswordCurrentToggle: (show: boolean) => void;
  showPasswordNewToggle: boolean;
  setShowPasswordNewToggle: (show: boolean) => void;
  handleChangePassword: (e: React.FormEvent) => Promise<void>;
  /** True while the password change is in flight. */
  busy?: boolean;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  settingsMessage,
  settingsError,
  settingsForm,
  setSettingsForm,
  showPasswordCurrentToggle,
  setShowPasswordCurrentToggle,
  showPasswordNewToggle,
  setShowPasswordNewToggle,
  handleChangePassword,
  busy = false,
}) => {
  if (!isOpen) return null;

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="glass-panel" style={{ width: "100%", maxWidth: "460px", padding: "2rem", margin: "auto", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontWeight: "700", fontSize: "1.15rem", color: "rgb(var(--color-text))" }}>Update Password</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgb(var(--color-text))", cursor: "pointer", padding: "0.25rem" }}>
            <Icons.X size={20} />
          </button>
        </div>

        <hr style={{ border: "none", borderTop: "1px solid rgb(var(--color-card-border) / 0.5)", margin: 0 }} />

        {settingsMessage && (
          <div className="glass-card" style={{ borderLeft: "4px solid #10B981", background: "rgba(16,185,129,0.05)", padding: "0.75rem" }}>
            <p style={{ color: "#10B981", fontSize: "0.85rem", margin: 0 }}>{settingsMessage}</p>
          </div>
        )}
        {settingsError && (
          <div className="glass-card" style={{ borderLeft: "4px solid #EF4444", background: "rgba(239,68,68,0.05)", padding: "0.75rem" }}>
            <p style={{ color: "#EF4444", fontSize: "0.85rem", margin: 0 }}>{settingsError}</p>
          </div>
        )}

        <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: "700" }}>Current Password</label>
            <div className="icon-input-wrapper">
              <input
                type={showPasswordCurrentToggle ? "text" : "password"}
                required
                value={settingsForm.currentPassword}
                onChange={(e) => setSettingsForm({ ...settingsForm, currentPassword: e.target.value })}
                className="form-input icon-input-field"
                placeholder="Enter current password"
                style={{ fontSize: "0.85rem", padding: "0.6rem 2.25rem 0.6rem 0.85rem" }}
              />
              <div className="input-icon-right" onClick={() => setShowPasswordCurrentToggle(!showPasswordCurrentToggle)}>
                {showPasswordCurrentToggle ? <Icons.EyeOff size={16} /> : <Icons.Eye size={16} />}
              </div>
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: "700" }}>New Password</label>
            <div className="icon-input-wrapper">
              <input
                type={showPasswordNewToggle ? "text" : "password"}
                required
                value={settingsForm.newPassword}
                onChange={(e) => setSettingsForm({ ...settingsForm, newPassword: e.target.value })}
                className="form-input icon-input-field"
                placeholder="Enter new password"
                style={{ fontSize: "0.85rem", padding: "0.6rem 2.25rem 0.6rem 0.85rem" }}
              />
              <div className="input-icon-right" onClick={() => setShowPasswordNewToggle(!showPasswordNewToggle)}>
                {showPasswordNewToggle ? <Icons.EyeOff size={16} /> : <Icons.Eye size={16} />}
              </div>
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: "700" }}>Confirm New Password</label>
            <input
              type="password"
              required
              value={settingsForm.confirmPassword}
              onChange={(e) => setSettingsForm({ ...settingsForm, confirmPassword: e.target.value })}
              className="form-input"
              placeholder="Re-enter new password"
              style={{ fontSize: "0.85rem", padding: "0.6rem 0.85rem" }}
            />
          </div>

          <hr style={{ border: "none", borderTop: "1px solid rgb(var(--color-card-border) / 0.5)", margin: 0 }} />

          <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ background: "none", border: "none", color: "rgb(var(--color-text-muted))" }}>
              Cancel
            </button>
            <SubmitButton
              type="submit"
              loading={busy}
              loadingLabel="Updating…"
              style={{ padding: "0.55rem 1.25rem", borderRadius: "8px", fontWeight: 600 }}
            >
              Update Password
            </SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
};
