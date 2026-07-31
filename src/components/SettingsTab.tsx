import React from "react";
import * as Icons from "lucide-react";
import { formatDate } from "./ui/format";

/**
 * SettingsTab — the Settings screen (designs/initiator/Settings.png).
 *
 * Renders the profile and security cards and opens the shared dialogs; it does
 * not own them. The prop list is only what the screen itself reads (rule 1-I):
 * the form/toggle state the inline modal copies used to need now lives with the
 * modals in DashboardShell.
 */
interface SettingsTabProps {
  currentUser: any;
  fetchSession: () => void;
  setSettingsForm: (form: any) => void;
  setSettingsMessage: (msg: string) => void;
  setSettingsError: (err: string) => void;
  setShowChangePasswordModal: (show: boolean) => void;
  setShowEditProfileModal: (show: boolean) => void;
  setShowUpdatePhotoModal: (show: boolean) => void;
  setEditProfileForm: (form: any) => void;
  handleUpdateProfile: (e: React.FormEvent) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  currentUser,
  fetchSession,
  setSettingsForm,
  setSettingsMessage,
  setSettingsError,
  setShowChangePasswordModal,
  setShowEditProfileModal,
  setShowUpdatePhotoModal,
  setEditProfileForm,
  handleUpdateProfile
}) => {
  return (
    <div style={{ maxWidth: "800px" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.75rem", fontWeight: "700" }}>Settings</h2>
        <p style={{ color: "rgb(var(--color-text-muted))", fontSize: "0.95rem", marginTop: "0.25rem" }}>
          Manage your account preferences, regional settings, and security.
        </p>
      </div>

      <div className="settings-grid">
        {/* Profile Information Card */}
        <div className="settings-card">
          <div className="settings-card-header">
            <span className="settings-card-title">
              <Icons.User size={20} style={{ color: "rgb(var(--color-primary))" }} /> Profile Information
            </span>
            <button 
              onClick={() => {
                setEditProfileForm({
                  name: currentUser?.name || "",
                  email: currentUser?.email || "",
                  officialContact: currentUser?.officialContact || "",
                  personalContact: currentUser?.personalContact || "",
                  avatar: currentUser?.avatar || ""
                });
                setShowEditProfileModal(true);
              }}
              className="btn btn-link" 
              style={{ background: "none", border: "none", color: "rgb(var(--color-primary))", fontWeight: "600", cursor: "pointer", fontSize: "0.9rem" }}
            >
              Edit Profile
            </button>
          </div>

          <div className="settings-profile-layout">
            {/* Left Column: Avatar */}
            <div 
              onClick={() => {
                setEditProfileForm({
                  name: currentUser?.name || "",
                  email: currentUser?.email || "",
                  officialContact: currentUser?.officialContact || "",
                  personalContact: currentUser?.personalContact || "",
                  avatar: currentUser?.avatar || ""
                });
                setShowUpdatePhotoModal(true);
              }}
              className="avatar-container"
            >
              <img 
                src={currentUser?.avatar || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200&auto=format&fit=crop"} 
                alt="Avatar" 
                className="settings-avatar-circle"
              />
              <span style={{ fontSize: "0.85rem", color: "rgb(var(--color-primary))", fontWeight: "600", marginTop: "0.25rem" }}>Update Avatar</span>
            </div>

            {/* Right Column: Grid Info Fields */}
            <div className="settings-fields-grid">
              <div className="settings-info-item">
                <span className="settings-info-label">Full Name</span>
                <span className="settings-info-value">{currentUser?.name}</span>
              </div>

              <div className="settings-info-item">
                <span className="settings-info-label">Email Address</span>
                <span className="settings-info-value">{currentUser?.email}</span>
              </div>

              <div className="settings-info-item">
                <span className="settings-info-label">Official Contact</span>
                <span className="settings-info-value">{currentUser?.officialContact || "—"}</span>
              </div>

              <div className="settings-info-item">
                <span className="settings-info-label">Role</span>
                <span className="settings-info-value">
                  {currentUser?.role === "INITIATOR" ? "Expense Initiator" : currentUser?.role === "APPROVER" ? "Department Approver" : currentUser?.role?.replace(/_/g, " ") || "Member"}
                </span>
              </div>

              <div className="settings-info-item">
                <span className="settings-info-label">Department</span>
                <span className="settings-info-value">{currentUser?.departmentName || "—"}</span>
              </div>

              <div className="settings-info-item">
                <span className="settings-info-label">Personal Contact</span>
                <span className="settings-info-value">{currentUser?.personalContact || "—"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Security Card */}
        <div className="settings-card">
          <div className="settings-card-header" style={{ marginBottom: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <span className="settings-card-title">
                <Icons.Shield size={20} style={{ color: "rgb(var(--color-primary))" }} /> Security
              </span>
              <div style={{ paddingLeft: "1.75rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <span style={{ fontWeight: "700", fontSize: "0.95rem" }}>Password</span>
                <span style={{ fontSize: "0.85rem", color: "rgb(var(--color-text-dim))" }}>
                  {/* Only stated when the account actually records it; this line
                      read "Last updated 3 months ago" for every user. */}
                  {currentUser?.passwordUpdatedAt
                    ? `Last updated ${formatDate(currentUser.passwordUpdatedAt)}`
                    : "Choose a strong, unique password"}
                </span>
              </div>
            </div>
            <button 
              onClick={() => {
                setSettingsMessage("");
                setSettingsError("");
                setSettingsForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
                setShowChangePasswordModal(true);
              }}
              className="btn btn-secondary" 
              style={{ padding: "0.5rem 1rem", fontSize: "0.85rem", fontWeight: "600" }}
            >
              Change Password
            </button>
          </div>
        </div>

        {/* Save & Discard Buttons */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem", alignItems: "center" }}>
          <button 
            onClick={() => {
              fetchSession();
            }}
            className="btn btn-secondary"
            style={{ background: "none", border: "none", color: "rgb(var(--color-text-muted))", fontWeight: "600" }}
          >
            Discard Changes
          </button>
          <button 
            onClick={() => {
              setEditProfileForm({
                name: currentUser?.name,
                email: currentUser?.email,
                officialContact: currentUser?.officialContact || "",
                personalContact: currentUser?.personalContact || "",
                avatar: currentUser?.avatar
              });
              handleUpdateProfile(null as any);
            }}
            className="btn btn-primary"
            style={{ padding: "0.6rem 1.5rem", borderRadius: "8px", fontWeight: "600" }}
          >
            Save Update
          </button>
        </div>
      </div>

      {/* The Edit Profile, Update Photo and Change Password dialogs are owned by
          DashboardShell (src/components/modals/). They were also duplicated
          inline here and driven by the same state, so opening any of them
          mounted two identical copies at once — engineering rule 1-S: a *Tab
          renders a screen and does not own modal markup. */}
    </div>
  );
};
