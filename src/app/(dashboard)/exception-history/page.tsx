"use client";

import { ExceptionHistoryTab } from "../../../components/ExceptionHistoryTab";
import { useDashboard } from "../DashboardProvider";

export default function ExceptionHistoryPage() {
  const { currentUser, expenses, setSelectedExpense } = useDashboard();

  return (
    <ExceptionHistoryTab
      currentUser={currentUser}
      expenses={expenses}
      setSelectedExpense={setSelectedExpense}
    />
  );
}
