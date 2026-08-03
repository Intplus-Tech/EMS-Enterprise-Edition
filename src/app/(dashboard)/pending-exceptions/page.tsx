/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { PendingExceptionsOverviewTab } from "../../../components/PendingExceptionsOverviewTab";
import { PendingExceptionsTab } from "../../../components/PendingExceptionsTab";
import { useDashboard } from "../DashboardProvider";
import { useBudgetContext } from "../hooks/useBudgetContext";
import { useRequestThread } from "../hooks/useRequestThread";

export default function PendingExceptionsPage() {
  const { currentUser, expenses, expenseActions, setViewedAttachment, loadDashboardData, setAdminNotice } =
    useDashboard();

  // The exception the Finance Head opened. This page used to hold only a
  // "list | details" flag and let the detail view re-derive its own target, so
  // pressing Review on any row opened — and decided — the first pending
  // exception instead.
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  // Resolved from the live list so a decision taken on the open request is
  // reflected as soon as the dashboard refetches.
  const request = reviewingId
    ? expenses.find((e: any) => String(e._id) === reviewingId) ?? null
    : null;

  const { budgetContext } = useBudgetContext(request?._id ?? null);

  // Backs the Request Justification dialog: the conversation so far, and the
  // channel the Finance Head's question is actually posted through.
  const { thread, threadLoading, threadSending, addComment } = useRequestThread(
    request?._id ?? null,
    (message) => setAdminNotice({ tone: "error", message })
  );

  if (currentUser?.role !== "FINANCE_HEAD") return null;

  return request ? (
    <PendingExceptionsTab
      currentUser={currentUser}
      request={request}
      actions={expenseActions}
      budgetContext={budgetContext}
      onViewAttachment={setViewedAttachment}
      onBackToDashboard={() => setReviewingId(null)}
      thread={thread}
      threadLoading={threadLoading}
      threadSending={threadSending}
      // Visible to the approver being asked, so it is not an internal note.
      onSendQuestion={(question: string) => addComment(question, false)}
    />
  ) : (
    <PendingExceptionsOverviewTab
      currentUser={currentUser}
      expenses={expenses}
      onReviewRequest={(expense: any) => setReviewingId(String(expense._id))}
      onReload={() => loadDashboardData(currentUser)}
    />
  );
}
