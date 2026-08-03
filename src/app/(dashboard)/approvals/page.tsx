"use client";

/**
 * Approvals route. Supplies the tab with data and workflow callbacks; the tab
 * itself performs no I/O (engineering rule 1-D).
 */
import { useState } from "react";
import { ApprovalsTab } from "../../../components/ApprovalsTab";
import { useDashboard } from "../DashboardProvider";
import { SystemRole } from "../../../enums/roles";
import { useBudgetContext } from "../hooks/useBudgetContext";
import { useRequestThread } from "../hooks/useRequestThread";

export default function ApprovalsPage() {
  const {
    currentUser,
    setViewedAttachment,
    addAttachments,
    removeAttachment,
    attachmentsUploading,
    expenses,
    approvalDateFilter, setApprovalDateFilter,
    approvalDatePicker, setApprovalDatePicker,
    amountSearchQuery, setAmountSearchQuery,
    selectedExpense, setSelectedExpense,
    expenseActions,
    setAdminNotice,
  } = useDashboard();

  // Real budget position for whichever request is open, so the approval and
  // expansion dialogs show the department's actual figures.
  const { budgetContext } = useBudgetContext(selectedExpense?._id);

  // The Completed list opens the release and communication-thread dialogs
  // without selecting a request, so the tab reports which one it is showing.
  const [threadTargetId, setThreadTargetId] = useState<string | null>(null);

  // Persisted communication thread for whichever request is in focus.
  const { thread, threadLoading, threadSending, addComment } = useRequestThread(
    threadTargetId ?? selectedExpense?._id,
    (message) => setAdminNotice({ tone: "error", message })
  );

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
      budgetContext={budgetContext}
      thread={thread}
      threadLoading={threadLoading}
      threadSending={threadSending}
      onFocusThreadRequest={setThreadTargetId}
      onAddComment={addComment}
      onViewAttachment={setViewedAttachment}
      onAddAttachments={addAttachments}
      onRemoveAttachment={removeAttachment}
      attachmentsUploading={attachmentsUploading}
      onNotify={setAdminNotice}
    />
  );
}
