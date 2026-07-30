/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { PendingExceptionsOverviewTab } from "../../../components/PendingExceptionsOverviewTab";
import { PendingExceptionsTab } from "../../../components/PendingExceptionsTab";
import { useDashboard } from "../DashboardProvider";

export default function PendingExceptionsPage() {
  const { currentUser, expenses, setSelectedExpense, expenseActions } = useDashboard();
  const [pendingExceptionSubView, setPendingExceptionSubView] = useState<"list" | "details">("list");

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
      onBackToDashboard={() => setPendingExceptionSubView("list")}
    />
  );
}
