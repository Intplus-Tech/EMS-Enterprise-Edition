/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { PendingExceptionsOverviewTab } from "../../../components/PendingExceptionsOverviewTab";
import { PendingExceptionsTab } from "../../../components/PendingExceptionsTab";
import { useDashboard } from "../DashboardProvider";
import { useBudgetContext } from "../hooks/useBudgetContext";

export default function PendingExceptionsPage() {
  const { currentUser, expenses, setSelectedExpense, expenseActions, setViewedAttachment } = useDashboard();
  const [pendingExceptionSubView, setPendingExceptionSubView] = useState<"list" | "details">("list");

  // The detail view resolves its own target request, so mirror that selection
  // here to load the matching budget figures.
  const targetRequestId = expenses?.find(
    (e: any) => e.status === "PENDING_EXCEPTIONAL" || e.status === "INSUFFICIENT_BUDGET"
  )?._id ?? expenses?.[0]?._id;
  const { budgetContext } = useBudgetContext(
    pendingExceptionSubView === "details" ? targetRequestId : null
  );

  if (currentUser?.role !== "FINANCE_HEAD") return null;

  return pendingExceptionSubView === "list" ? (
    <PendingExceptionsOverviewTab
      currentUser={currentUser}
      expenses={expenses}
      onReviewRequest={(req: any) => {
        setSelectedExpense(req);
        setPendingExceptionSubView("details");
      }}
    />
  ) : (
    <PendingExceptionsTab
      currentUser={currentUser}
      expenses={expenses}
      setSelectedExpense={setSelectedExpense}
      actions={expenseActions}
      budgetContext={budgetContext}
      onViewAttachment={setViewedAttachment}
      onBackToDashboard={() => setPendingExceptionSubView("list")}
    />
  );
}
