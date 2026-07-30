"use client";

import { ApprovalsTab } from "../../../components/ApprovalsTab";
import { useDashboard } from "../DashboardProvider";

export default function ApprovalsPage() {
  const {
    currentUser,
    expenses,
    approvalDateFilter, setApprovalDateFilter,
    approvalDatePicker, setApprovalDatePicker,
    amountSearchQuery, setAmountSearchQuery,
    selectedExpense, setSelectedExpense,
    loadDashboardData,
  } = useDashboard();

  if (currentUser?.role === "FINANCE_HEAD") return null;

  return (
    <ApprovalsTab
      currentUser={currentUser}
      expenses={expenses}
      approvalDateFilter={approvalDateFilter}
      setApprovalDateFilter={setApprovalDateFilter}
      approvalDatePicker={approvalDatePicker}
      setApprovalDatePicker={setApprovalDatePicker}
      amountSearchQuery={amountSearchQuery}
      setAmountSearchQuery={setAmountSearchQuery}
      setSelectedExpense={setSelectedExpense}
      selectedExpense={selectedExpense}
      loadDashboardData={loadDashboardData}
    />
  );
}
