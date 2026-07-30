"use client";

/**
 * Approvals route. Supplies the tab with data and workflow callbacks; the tab
 * itself performs no I/O (engineering rule 1-D).
 */
import { ApprovalsTab } from "../../../components/ApprovalsTab";
import { useDashboard } from "../DashboardProvider";
import { SystemRole } from "../../../enums/roles";

export default function ApprovalsPage() {
  const {
    currentUser,
    expenses,
    approvalDateFilter, setApprovalDateFilter,
    approvalDatePicker, setApprovalDatePicker,
    amountSearchQuery, setAmountSearchQuery,
    selectedExpense, setSelectedExpense,
    expenseActions,
    setAdminNotice,
  } = useDashboard();

  // Finance Head reviews exceptions on its own route, not the approvals queue.
  if (currentUser?.role === SystemRole.FINANCE_HEAD) return null;

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
      actions={expenseActions}
      onNotify={setAdminNotice}
    />
  );
}
