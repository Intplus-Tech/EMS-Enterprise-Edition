"use client";

/**
 * InviteResultModal — what actually happened to an invitation.
 *
 * Shown after `POST /api/admin/invite` returns. The account is created whether
 * or not the email is delivered, so this reports the two outcomes separately
 * instead of announcing "Invitation Successful" for both. When delivery failed
 * it names the provider's reason and offers a retry; the activation link is
 * always available so an admin can fall back to sharing it by hand.
 *
 * Consumed by `DashboardShell`. Presentational — the retry callback is wired by
 * the provider layer.
 */

import React from "react";
import * as Icons from "lucide-react";
import { ModalShell } from "../ui/ModalShell";
import { SubmitButton } from "../ui/SubmitButton";
import { InviteResultDto } from "../../types/api";

interface InviteResultModalProps {
  inviteResult: InviteResultDto | null;
  onClose: () => void;
  /** Re-issues the invitation (fresh token, fresh send) for the same person. */
  onRetry?: () => void;
  retrying?: boolean;
}

/** Presentation for each of the three delivery outcomes. */
function describeDelivery(result: InviteResultDto) {
  if (result.emailSimulated) {
    return {
      tone: "#EAB308",
      icon: <Icons.AlertTriangle size={20} />,
      title: "Account created — no email was sent",
      detail:
        "No email provider is configured on this environment, so the invitation was written to the server log only. Send the activation link below to the recipient yourself.",
      canRetry: false,
    };
  }

  if (!result.emailSent) {
    return {
      tone: "#EF4444",
      icon: <Icons.XCircle size={20} />,
      title: "Account created — invitation email failed",
      detail: result.emailError ?? "The email provider rejected the message but gave no reason.",
      canRetry: true,
    };
  }

  return {
    tone: "#10B981",
    icon: <Icons.CheckCircle size={20} />,
    title: "Invitation sent",
    detail: `The activation link is on its way to ${result.user?.email ?? "the recipient"}. It expires in 7 days.`,
    canRetry: false,
  };
}

export const InviteResultModal: React.FC<InviteResultModalProps> = ({
  inviteResult,
  onClose,
  onRetry,
  retrying = false,
}) => {
  if (!inviteResult) return null;

  const delivery = describeDelivery(inviteResult);

  return (
    <ModalShell
      isOpen
      onClose={onClose}
      title="Invitation result"
      subtitle={inviteResult.user?.name ? `${inviteResult.user.name} · ${inviteResult.user.role}` : undefined}
      maxWidth="580px"
      footer={
        <>
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Close
          </button>
          {delivery.canRetry && onRetry && (
            <SubmitButton
              type="button"
              onClick={onRetry}
              loading={retrying}
              loadingLabel="Resending…"
              icon={<Icons.RefreshCw size={15} />}
            >
              Retry sending
            </SubmitButton>
          )}
        </>
      }
    >
      {/* Delivery outcome — the headline of this dialog */}
      <div
        style={{
          display: "flex",
          gap: "0.85rem",
          padding: "1rem",
          borderRadius: "0.65rem",
          border: `1px solid ${delivery.tone}55`,
          background: `${delivery.tone}14`,
          marginBottom: "1.5rem",
        }}
      >
        <span style={{ color: delivery.tone, lineHeight: 0, marginTop: "0.15rem" }}>{delivery.icon}</span>
        <div>
          <p style={{ fontWeight: 700, fontSize: "0.92rem", color: "rgb(var(--color-text))" }}>
            {delivery.title}
          </p>
          <p
            style={{
              marginTop: "0.3rem",
              fontSize: "0.85rem",
              lineHeight: 1.5,
              color: "rgb(var(--color-text-muted))",
            }}
          >
            {delivery.detail}
          </p>
        </div>
      </div>

      {/* Activation link — the manual fallback, and the only copy of the token */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        <span
          style={{
            fontSize: "0.75rem",
            fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: "rgb(var(--color-text-dim))",
          }}
        >
          Setup activation link
        </span>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            type="text"
            readOnly
            value={inviteResult.inviteUrl}
            onFocus={(e) => e.currentTarget.select()}
            className="form-input"
            style={{ flexGrow: 1, fontSize: "0.82rem" }}
          />
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(inviteResult.inviteUrl)}
            className="btn btn-secondary"
            style={{ whiteSpace: "nowrap" }}
          >
            <Icons.Copy size={15} /> Copy
          </button>
        </div>

        <p style={{ fontSize: "0.78rem", color: "rgb(var(--color-text-dim))", lineHeight: 1.5 }}>
          Anyone holding this link can activate the account, so share it only with{" "}
          {inviteResult.user?.email ?? "the intended recipient"}. Retrying issues a new link and invalidates this one.
        </p>
      </div>
    </ModalShell>
  );
};
