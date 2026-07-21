import React from "react";
import * as Icons from "lucide-react";

interface SettingsTabProps {
  currentUser: any;
  fetchSession: () => void;
  settingsForm: any;
  setSettingsForm: (form: any) => void;
  settingsMessage: string;
  setSettingsMessage: (msg: string) => void;
  settingsError: string;
  setSettingsError: (err: string) => void;
  handleChangePassword: (e: React.FormEvent) => void;
  
  showChangePasswordModal: boolean;
  setShowChangePasswordModal: (show: boolean) => void;
  showEditProfileModal: boolean;
  setShowEditProfileModal: (show: boolean) => void;
  showUpdatePhotoModal: boolean;
  setShowUpdatePhotoModal: (show: boolean) => void;
  
  editProfileForm: any;
  setEditProfileForm: (form: any) => void;
  showPasswordCurrentToggle: boolean;
  setShowPasswordCurrentToggle: (show: boolean) => void;
  showPasswordNewToggle: boolean;
  setShowPasswordNewToggle: (show: boolean) => void;
  handleUpdateProfile: (e: React.FormEvent) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  currentUser,
  fetchSession,
  settingsForm,
  setSettingsForm,
  settingsMessage,
  setSettingsMessage,
  settingsError,
  setSettingsError,
  handleChangePassword,
  showChangePasswordModal,
  setShowChangePasswordModal,
  showEditProfileModal,
  setShowEditProfileModal,
  showUpdatePhotoModal,
  setShowUpdatePhotoModal,
  editProfileForm,
  setEditProfileForm,
  showPasswordCurrentToggle,
  setShowPasswordCurrentToggle,
  showPasswordNewToggle,
  setShowPasswordNewToggle,
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
                  officialContact: currentUser?.officialContact || "0801-234-5678",
                  personalContact: currentUser?.personalContact || "0801-234-5678",
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
                  officialContact: currentUser?.officialContact || "0801-234-5678",
                  personalContact: currentUser?.personalContact || "0801-234-5678",
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
                <span className="settings-info-value">{currentUser?.officialContact || "0801-234-5678"}</span>
              </div>

              <div className="settings-info-item">
                <span className="settings-info-label">Role</span>
                <span className="settings-info-value">
                  {currentUser?.role === "INITIATOR" ? "Expense Initiator" : currentUser?.role === "APPROVER" ? "Department Approver" : currentUser?.role?.replace(/_/g, " ") || "Member"}
                </span>
              </div>

              <div className="settings-info-item">
                <span className="settings-info-label">Department</span>
                <span className="settings-info-value">{currentUser?.departmentName || "Operations"}</span>
              </div>

              <div className="settings-info-item">
                <span className="settings-info-label">Personal Contact</span>
                <span className="settings-info-value">{currentUser?.personalContact || "0801-234-5678"}</span>
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
                <span style={{ fontSize: "0.85rem", color: "rgb(var(--color-text-dim))" }}>Last updated 3 months ago</span>
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
                officialContact: currentUser?.officialContact || "0801-234-5678",
                personalContact: currentUser?.personalContact || "0801-234-5678",
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

      {/* EDIT PROFILE MODAL */}
      {showEditProfileModal && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: "520px", padding: "2rem", margin: "auto", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h3 style={{ fontWeight: "700", fontSize: "1.25rem", color: "rgb(var(--color-text))" }}>Edit Profile</h3>
                <p style={{ color: "rgb(var(--color-text-dim))", fontSize: "0.8rem", marginTop: "0.15rem" }}>Manage your professional information and account details.</p>
              </div>
              <button onClick={() => setShowEditProfileModal(false)} style={{ background: "none", border: "none", color: "rgb(var(--color-text))", cursor: "pointer", padding: "0.25rem" }}>
                <Icons.X size={20} />
              </button>
            </div>

            <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.08)", margin: 0 }} />

            <form onSubmit={handleUpdateProfile} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {/* Profile Photo Row */}
              <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
                <div 
                  onClick={() => {
                    setShowEditProfileModal(false);
                    setShowUpdatePhotoModal(true);
                  }}
                  style={{ position: "relative", cursor: "pointer" }}
                >
                  <img 
                    src={editProfileForm.avatar || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200&auto=format&fit=crop"} 
                    alt="Photo" 
                    style={{ width: 68, height: 68, borderRadius: "50%", objectFit: "cover" }}
                  />
                  <div className="avatar-camera-badge" style={{ bottom: 0, right: 0, width: 22, height: 22, border: "1.5px solid rgb(var(--color-surface))" }}>
                    <Icons.Camera size={12} />
                  </div>
                </div>
                <div>
                  <h4 style={{ fontSize: "0.9rem", fontWeight: "700", color: "rgb(var(--color-text))" }}>Profile Photo</h4>
                  <p style={{ color: "rgb(var(--color-text-dim))", fontSize: "0.75rem", marginTop: "0.1rem" }}>Update your photo for team recognition.</p>
                  <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem", alignItems: "center" }}>
                    <button 
                      type="button" 
                      onClick={() => {
                        setShowEditProfileModal(false);
                        setShowUpdatePhotoModal(true);
                      }}
                      className="btn btn-secondary" 
                      style={{ padding: "0.35rem 0.75rem", fontSize: "0.75rem", background: "none", border: "1px solid rgba(255,255,255,0.12)", color: "rgb(var(--color-text))" }}
                    >
                      Change Photo
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setEditProfileForm({ ...editProfileForm, avatar: "" })}
                      className="btn btn-link" 
                      style={{ border: "none", background: "none", color: "#EF4444", fontSize: "0.75rem", cursor: "pointer", padding: 0 }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>

              {/* Grid Fields */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: "700" }}>Full Name</label>
                  <input
                    type="text"
                    required
                    value={editProfileForm.name}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, name: e.target.value })}
                    className="form-input"
                    style={{ fontSize: "0.85rem", padding: "0.6rem 0.85rem" }}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: "700" }}>Email Address</label>
                  <div className="icon-input-wrapper">
                    <input
                      type="email"
                      required
                      value={editProfileForm.email}
                      onChange={(e) => setEditProfileForm({ ...editProfileForm, email: e.target.value })}
                      className="form-input icon-input-field"
                      style={{ fontSize: "0.85rem", padding: "0.6rem 2.25rem 0.6rem 0.85rem" }}
                    />
                    <div className="input-icon-right">
                      <Icons.Mail size={16} />
                    </div>
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: "700" }}>Role</label>
                  <div className="icon-input-wrapper">
                    <input
                      type="text"
                      disabled
                      value={currentUser?.role === "INITIATOR" ? "Expense Initiator" : currentUser?.role === "APPROVER" ? "Department Approver" : currentUser?.role?.replace(/_/g, " ") || "Member"}
                      className="form-input icon-input-field"
                      style={{ fontSize: "0.85rem", padding: "0.6rem 2.25rem 0.6rem 0.85rem", background: "rgba(99, 102, 241, 0.05)", cursor: "not-allowed" }}
                    />
                    <div className="input-icon-right">
                      <Icons.Lock size={16} />
                    </div>
                  </div>
                  <span style={{ fontSize: "0.7rem", color: "rgb(var(--color-text-dim))", marginTop: "0.25rem", display: "block", fontStyle: "italic" }}>Managed by Administration</span>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: "700" }}>Department</label>
                  <div className="icon-input-wrapper">
                    <input
                      type="text"
                      disabled
                      value={currentUser?.departmentName || "Operations"}
                      className="form-input icon-input-field"
                      style={{ fontSize: "0.85rem", padding: "0.6rem 2.25rem 0.6rem 0.85rem", background: "rgba(99, 102, 241, 0.05)", cursor: "not-allowed" }}
                    />
                    <div className="input-icon-right">
                      <Icons.Lock size={16} />
                    </div>
                  </div>
                  <span style={{ fontSize: "0.7rem", color: "rgb(var(--color-text-dim))", marginTop: "0.25rem", display: "block", fontStyle: "italic" }}>Fixed attribute</span>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: "700" }}>Official Contact</label>
                  <input
                    type="text"
                    value={editProfileForm.officialContact}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, officialContact: e.target.value })}
                    className="form-input"
                    style={{ fontSize: "0.85rem", padding: "0.6rem 0.85rem" }}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: "700" }}>Personal Contact</label>
                  <input
                    type="text"
                    value={editProfileForm.personalContact}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, personalContact: e.target.value })}
                    className="form-input"
                    style={{ fontSize: "0.85rem", padding: "0.6rem 0.85rem" }}
                  />
                </div>
              </div>

              {/* Info Banner */}
              <div className="info-box-banner">
                <Icons.Info size={16} style={{ color: "rgb(var(--color-primary))", flexShrink: 0, marginTop: "2px" }} />
                <span>Some fields are managed by your organization's directory service and cannot be changed manually. Contact HR for department or role updates.</span>
              </div>

              <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.08)", margin: 0 }} />

              <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setShowEditProfileModal(false)} className="btn btn-secondary" style={{ background: "none", border: "none", color: "rgb(var(--color-text-muted))" }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ padding: "0.55rem 1.25rem", borderRadius: "8px", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  Save Changes <Icons.CheckCircle size={16} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPDATE PROFILE PHOTO MODAL */}
      {showUpdatePhotoModal && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.6)", zIndex: 101, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: "460px", padding: "2rem", margin: "auto", display: "flex", flexDirection: "column", gap: "1.25rem", textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontWeight: "700", fontSize: "1.15rem", color: "rgb(var(--color-text))" }}>Update Profile Photo</h3>
              <button 
                onClick={() => {
                  setShowUpdatePhotoModal(false);
                  setShowEditProfileModal(true);
                }} 
                style={{ background: "none", border: "none", color: "rgb(var(--color-text))", cursor: "pointer", padding: "0.25rem" }}
              >
                <Icons.X size={20} />
              </button>
            </div>

            <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.08)", margin: 0 }} />

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", margin: "1rem 0" }}>
              <img 
                src={editProfileForm.avatar || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200&auto=format&fit=crop"} 
                alt="Avatar" 
                style={{ width: 120, height: 120, borderRadius: "50%", objectFit: "cover", border: "4px solid rgba(99,102,241,0.15)" }}
              />
              <span style={{ fontSize: "1.05rem", fontWeight: "700" }}>{currentUser?.name}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: "1.25rem", alignItems: "center" }}>
              <input 
                type="file"
                id="avatar-file-input"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.size > 5 * 1024 * 1024) {
                      alert("File is too large! Maximum allowed size is 5MB.");
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      if (event.target?.result) {
                        setEditProfileForm({ ...editProfileForm, avatar: event.target.result as string });
                      }
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
              <button 
                type="button" 
                onClick={() => document.getElementById("avatar-file-input")?.click()}
                className="btn btn-secondary" 
                style={{ padding: "0.45rem 1rem", fontSize: "0.85rem", background: "none", border: "1px solid rgba(255,255,255,0.15)" }}
              >
                Change Photo
              </button>
              <button 
                type="button" 
                onClick={() => setEditProfileForm({ ...editProfileForm, avatar: "" })}
                className="btn btn-link" 
                style={{ background: "none", border: "none", color: "#EF4444", fontSize: "0.85rem", fontWeight: "600", cursor: "pointer" }}
              >
                Remove
              </button>
            </div>

            <div className="info-box-banner" style={{ textAlign: "left" }}>
              <Icons.Info size={16} style={{ color: "rgb(var(--color-primary))", flexShrink: 0, marginTop: "2px" }} />
              <span>Max file size 5MB. Recommended square dimensions (1:1 ratio) for best results in the Precision dashboard and reports.</span>
            </div>

            <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.08)", margin: 0 }} />

            <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
              <button 
                type="button" 
                onClick={() => {
                  setShowUpdatePhotoModal(false);
                  setShowEditProfileModal(true);
                }} 
                className="btn btn-secondary" 
                style={{ background: "none", border: "none", color: "rgb(var(--color-text-muted))" }}
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setShowUpdatePhotoModal(false);
                  setShowEditProfileModal(true);
                }}
                className="btn btn-primary" 
                style={{ padding: "0.55rem 1.25rem", borderRadius: "8px", fontWeight: "600" }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UPDATE PASSWORD MODAL */}
      {showChangePasswordModal && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: "460px", padding: "2rem", margin: "auto", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontWeight: "700", fontSize: "1.15rem", color: "rgb(var(--color-text))" }}>Update Password</h3>
              <button onClick={() => setShowChangePasswordModal(false)} style={{ background: "none", border: "none", color: "rgb(var(--color-text))", cursor: "pointer", padding: "0.25rem" }}>
                <Icons.X size={20} />
              </button>
            </div>

            <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.08)", margin: 0 }} />

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

              <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.08)", margin: 0 }} />

              <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setShowChangePasswordModal(false)} className="btn btn-secondary" style={{ background: "none", border: "none", color: "rgb(var(--color-text-muted))" }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ padding: "0.55rem 1.25rem", borderRadius: "8px", fontWeight: "600" }}>
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
