"use client";

import React from "react";
import * as Icons from "lucide-react";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  editProfileForm: any;
  setEditProfileForm: React.Dispatch<React.SetStateAction<any>>;
  handleUpdateProfile: (e: React.FormEvent) => Promise<void>;
  onOpenUpdatePhotoModal: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  editProfileForm,
  setEditProfileForm,
  handleUpdateProfile,
  onOpenUpdatePhotoModal,
}) => {
  if (!isOpen) return null;

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem 1rem", overflowY: "auto" }}>
      <div className="glass-panel" style={{ width: "100%", maxWidth: "520px", maxHeight: "88vh", overflowY: "auto", padding: "2rem", margin: "auto", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h3 style={{ fontWeight: "700", fontSize: "1.25rem", color: "rgb(var(--color-text))" }}>Edit Profile</h3>
            <p style={{ color: "rgb(var(--color-text-dim))", fontSize: "0.8rem", marginTop: "0.15rem" }}>Manage your professional information and account details.</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgb(var(--color-text))", cursor: "pointer", padding: "0.25rem" }}>
            <Icons.X size={20} />
          </button>
        </div>

        <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.08)", margin: 0 }} />

        <form onSubmit={handleUpdateProfile} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Profile Photo Row */}
          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
            <div 
              onClick={onOpenUpdatePhotoModal}
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
                  onClick={onOpenUpdatePhotoModal}
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
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ background: "none", border: "none", color: "rgb(var(--color-text-muted))" }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ padding: "0.55rem 1.25rem", borderRadius: "8px", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              Save Changes <Icons.CheckCircle size={16} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
