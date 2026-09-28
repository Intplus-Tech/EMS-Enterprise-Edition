/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useRef } from "react";
import * as Icons from "lucide-react";

interface NotificationsPanelProps {
  notifications: any[];
  onClose: () => void;
  onDismiss: (id: string) => void;
  onMarkAllRead: () => void;
  onPrimaryAction: (notification: any) => void;
}

const TYPE_STYLES: Record<string, { color: string; background: string; Icon: any; action: string }> = {
  RETURNED: { color: "#DC2626", background: "rgba(220, 38, 38, 0.12)", Icon: Icons.Undo2, action: "Review & Resubmit" },
  REJECTED: { color: "#DC2626", background: "rgba(220, 38, 38, 0.12)", Icon: Icons.XCircle, action: "View Details" },
  APPROVED: { color: "#16A34A", background: "rgba(22, 163, 74, 0.12)", Icon: Icons.CheckCircle2, action: "View Details" },
  PAID: { color: "#0EA5E9", background: "rgba(14, 165, 233, 0.12)", Icon: Icons.Banknote, action: "View Receipt" },
  ACTION_REQUIRED: { color: "#2563EB", background: "rgba(37, 99, 235, 0.12)", Icon: Icons.ClipboardCheck, action: "Review Request" },
  // Cancelled by someone else — in practice a department deletion, which is why
  // the request has also vanished from the initiator's lists.
  CANCELLED: { color: "#DC2626", background: "rgba(220, 38, 38, 0.12)", Icon: Icons.Ban, action: "View Details" },
  // Progress the initiator can watch but not act on (over-budget review, bank
  // upload). Neutral so it does not compete with the items needing attention.
  IN_PROGRESS: { color: "#D97706", background: "rgba(217, 119, 6, 0.12)", Icon: Icons.Clock, action: "View Details" },
};

const FALLBACK_STYLE = { color: "#2563EB", background: "rgba(37, 99, 235, 0.12)", Icon: Icons.Info, action: "View Details" };

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({
  notifications,
  onClose,
  onDismiss,
  onMarkAllRead,
  onPrimaryAction,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      className="glass-panel"
      style={{
        position: "absolute",
        top: "calc(100% + 0.85rem)",
        right: 0,
        width: "390px",
        maxWidth: "calc(100vw - 2rem)",
        maxHeight: "460px",
        overflowY: "auto",
        borderRadius: "12px",
        padding: 0,
        zIndex: 60,
        boxShadow: "0 12px 32px rgba(0, 0, 0, 0.18)",
        cursor: "default",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1rem 1.15rem",
          borderBottom: "1px solid rgb(var(--color-card-border) / 0.6)",
          position: "sticky",
          top: 0,
          background: "rgb(var(--color-surface))",
          zIndex: 1,
        }}
      >
        <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "rgb(var(--color-text))" }}>Notifications</span>
        {notifications.length > 0 && (
          <button
            onClick={onMarkAllRead}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#2563EB", fontSize: "0.8rem", fontWeight: 600 }}
          >
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div style={{ padding: "2.5rem 1.25rem", textAlign: "center", color: "rgb(var(--color-text-dim))", fontSize: "0.85rem" }}>
          <Icons.BellOff size={24} style={{ marginBottom: "0.6rem", opacity: 0.6 }} />
          <p>You&apos;re all caught up.</p>
        </div>
      ) : (
        notifications.map((notification) => {
          const style = TYPE_STYLES[notification.type] || FALLBACK_STYLE;
          const { Icon } = style;

          return (
            <div
              key={notification.id}
              style={{
                display: "flex",
                gap: "0.75rem",
                padding: "1rem 1.15rem",
                borderBottom: "1px solid rgb(var(--color-card-border) / 0.4)",
                background: notification.read ? "transparent" : `${style.background.replace("0.12", "0.06")}`,
              }}
            >
              <div
                style={{
                  flexShrink: 0,
                  width: 34,
                  height: 34,
                  borderRadius: "8px",
                  background: style.background,
                  color: style.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon size={17} />
              </div>

              <div style={{ flexGrow: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.6rem", alignItems: "flex-start" }}>
                  <h4 style={{ fontSize: "0.87rem", fontWeight: 700, color: style.color, margin: 0, lineHeight: 1.35 }}>
                    {notification.title}
                  </h4>
                  <span style={{ fontSize: "0.72rem", color: "rgb(var(--color-text-dim))", whiteSpace: "nowrap", flexShrink: 0 }}>
                    {notification.time}
                  </span>
                </div>

                <p style={{ fontSize: "0.8rem", color: "rgb(var(--color-text-muted))", margin: "0.35rem 0 0", lineHeight: 1.5 }}>
                  {notification.message}
                </p>

                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.7rem" }}>
                  <button
                    onClick={() => onPrimaryAction(notification)}
                    className="btn btn-primary"
                    style={{ padding: "0.35rem 0.75rem", fontSize: "0.75rem", borderRadius: "6px", background: style.color, fontWeight: 600 }}
                  >
                    {style.action}
                  </button>
                  <button
                    onClick={() => onDismiss(notification.id)}
                    className="btn btn-secondary"
                    style={{ padding: "0.35rem 0.75rem", fontSize: "0.75rem", borderRadius: "6px", fontWeight: 600 }}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};
