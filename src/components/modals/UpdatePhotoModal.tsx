"use client";

import React from "react";
import * as Icons from "lucide-react";

interface UpdatePhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  editProfileForm: any;
  setEditProfileForm: React.Dispatch<React.SetStateAction<any>>;
}

export const UpdatePhotoModal: React.FC<UpdatePhotoModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  editProfileForm,
  setEditProfileForm,
}) => {
  if (!isOpen) return null;

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.6)", zIndex: 101, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="glass-panel" style={{ width: "100%", maxWidth: "460px", padding: "2rem", margin: "auto", display: "flex", flexDirection: "column", gap: "1.25rem", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontWeight: "700", fontSize: "1.15rem", color: "rgb(var(--color-text))" }}>Update Profile Photo</h3>
          <button 
            onClick={onClose} 
            style={{ background: "none", border: "none", color: "rgb(var(--color-text))", cursor: "pointer", padding: "0.25rem" }}
          >
            <Icons.X size={20} />
          </button>
        </div>

        <hr style={{ border: "none", borderTop: "1px solid rgba(var(--color-card-border), 0.5)", margin: 0 }} />

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
            style={{ padding: "0.45rem 1rem", fontSize: "0.85rem", background: "none", border: "1px solid rgb(var(--color-card-border))" }}
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

        <hr style={{ border: "none", borderTop: "1px solid rgba(var(--color-card-border), 0.5)", margin: 0 }} />

        <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
          <button 
            type="button" 
            onClick={onClose} 
            className="btn btn-secondary" 
            style={{ background: "none", border: "none", color: "rgb(var(--color-text-muted))" }}
          >
            Cancel
          </button>
          <button 
            type="button" 
            onClick={onClose}
            className="btn btn-primary" 
            style={{ padding: "0.55rem 1.25rem", borderRadius: "8px", fontWeight: "600" }}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
