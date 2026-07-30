"use client";

import { HistoryTab } from "../../../components/HistoryTab";
import { useDashboard } from "../DashboardProvider";

export default function HistoryPage() {
  const {
    currentUser,
    expenses,
    historyFilterCategory, setHistoryFilterCategory,
    historyFilterStatus, setHistoryFilterStatus,
    historySearchQuery, setHistorySearchQuery,
    historySubTab, setHistorySubTab,
    setSelectedExpense,
  } = useDashboard();

  if (currentUser?.role === "FINANCE_HEAD") return null;

  return (
    <HistoryTab
      currentUser={currentUser}
      expenses={expenses}
      historyFilterCategory={historyFilterCategory}
      setHistoryFilterCategory={setHistoryFilterCategory}
      historyFilterStatus={historyFilterStatus}
      setHistoryFilterStatus={setHistoryFilterStatus}
      historySearchQuery={historySearchQuery}
      setHistorySearchQuery={setHistorySearchQuery}
      historySubTab={historySubTab}
      setHistorySubTab={setHistorySubTab}
      setSelectedExpense={setSelectedExpense}
    />
  );
}
