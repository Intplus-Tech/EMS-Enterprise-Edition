"use client";

/**
 * RequestQueueTable — the request-centric pipeline table from
 * `designs/finance-officer/Processing Pipeline Dashboard.png` and
 * `designs/approval/Approval Req..png`.
 *
 * The Finance Officer and the departmental Approver read a queue: what the
 * request is, who raised it, who signed it off, and whether it breaches budget.
 * The Finance Manager reads a payment run instead, so that role keeps the
 * BANK ACCOUNT / INITIATOR table in `ApprovalsTab` — one component per layout
 * rather than one table with a role branch buried inside each cell.
 *
 * Presentational: the parent owns the list, its filters and the row action.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import React from "react";
import * as Icons from "lucide-react";
import { EmptyState } from "../ui/EmptyState";
import { formatNaira, humanizeStatus, statusBadgeClass } from "../ui/format";
import { OVER_BUDGET_STATUSES, isStatusIn } from "../../enums/statuses";

interface RequestQueueTableProps {
  rows: any[];
  /** Rendered when the current sub-tab and filters match nothing. */
  emptyTitle: string;
  emptyDescription: string;
  onOpenRequest: (expense: any) => void;
}

/** True when the request is flagged over budget, or was granted an expansion. */
function isOverBudget(expense: any): boolean {
  return isStatusIn(OVER_BUDGET_STATUSES, expense.status) || Boolean(expense.exceptionalBudgetApproved);
}

/** The approver who last signed the request off, for the "Approved by" line. */
function approvedBy(expense: any): string | null {
  const step = [...(expense.history ?? [])]
    .reverse()
    .find((h: any) => h.actorRole && h.actorRole !== "INITIATOR" && ["APPROVE", "APPROVED"].includes(h.action));
  return step?.actorName ?? null;
}

/**
 * The most recent reviewer note. The design shows an italic line under each row
 * explaining the request; the model has no separate field for it, so this is the
 * real comment from the audit trail rather than an invented sentence.
 */
function latestNote(expense: any): string | null {
  const entry = [...(expense.history ?? [])].reverse().find((h: any) => h.comment?.trim());
  return entry?.comment?.trim() ?? null;
}

export const RequestQueueTable: React.FC<RequestQueueTableProps> = ({
  rows,
  emptyTitle,
  emptyDescription,
  onOpenRequest,
}) => (
  <table className="data-table" style={{ width: "100%", fontSize: "0.85rem" }}>
    <thead>
      <tr>
        <th style={{ width: "110px" }}>ID</th>
        <th>REQUEST</th>
        <th style={{ width: "160px", textAlign: "right" }}>AMOUNT</th>
        <th style={{ width: "220px", textAlign: "right" }}>STATUS</th>
      </tr>
    </thead>
    <tbody>
      {rows.map((exp) => {
        const overBudget = isOverBudget(exp);
        const approver = approvedBy(exp);
        const note = latestNote(exp);
        // An over-budget row is coloured throughout in the design, which is the
        // only cue that separates it from a routine request at a glance.
        const accent = overBudget ? "rgb(var(--color-danger))" : undefined;

        return (
          <tr key={exp._id}>
            <td style={{ fontWeight: 700, color: accent ?? "rgb(var(--color-text-muted))" }}>
              {exp.requestNumber}
            </td>

            <td>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                <strong style={{ fontSize: "0.95rem", color: accent ?? "rgb(var(--color-text))" }}>
                  {exp.description}
                </strong>
                <span style={{ fontSize: "0.78rem", color: "rgb(var(--color-text-muted))" }}>
                  {[
                    exp.departmentId?.name,
                    exp.initiatorId?.name ? `Requested by ${exp.initiatorId.name}` : null,
                    approver ? `Approved by ${approver}` : null,
                  ]
                    .filter(Boolean)
                    .join("  •  ") || "—"}
                </span>
                {note && (
                  <span style={{ fontSize: "0.8rem", fontStyle: "italic", color: accent ?? "rgb(var(--color-text-muted))" }}>
                    {note}
                  </span>
                )}
              </div>
            </td>

            <td style={{ textAlign: "right" }}>
              <strong style={{ fontSize: "1rem", color: "rgb(var(--color-text))" }}>{formatNaira(exp.amount)}</strong>
              {overBudget && (
                <div style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.05em", color: "rgb(var(--color-danger))" }}>
                  OVER BUDGET
                </div>
              )}
            </td>

            <td style={{ textAlign: "right" }}>
              <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end", gap: "0.5rem" }}>
                <span className={`badge ${statusBadgeClass(exp.status)}`}>{humanizeStatus(exp.status)}</span>
                <button
                  onClick={() => onOpenRequest(exp)}
                  className="btn btn-primary"
                  style={{ padding: "0.4rem 0.9rem", fontSize: "0.78rem", fontWeight: 600 }}
                >
                  View Request
                </button>
              </div>
            </td>
          </tr>
        );
      })}

      {rows.length === 0 && (
        <tr>
          <td colSpan={4} style={{ padding: 0 }}>
            <EmptyState icon={<Icons.Inbox size={20} />} title={emptyTitle} description={emptyDescription} />
          </td>
        </tr>
      )}
    </tbody>
  </table>
);
