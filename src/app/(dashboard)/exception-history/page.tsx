"use client";

import { useState } from "react";
import { ExceptionHistoryTab } from "../../../components/ExceptionHistoryTab";
import { useDashboard } from "../DashboardProvider";
import { useRequestThread } from "../hooks/useRequestThread";

export default function ExceptionHistoryPage() {
  const { currentUser, expenses, setSelectedExpense, setAdminNotice } = useDashboard();

  // The row whose justification dialog is open. Held here because the thread is
  // server state and the tab performs no I/O (engineering rule 1-D).
  const [threadTargetId, setThreadTargetId] = useState<string | null>(null);
  const { thread, threadLoading } = useRequestThread(threadTargetId, (message) =>
    setAdminNotice({ tone: "error", message })
  );

  return (
    <ExceptionHistoryTab
      currentUser={currentUser}
      expenses={expenses}
      setSelectedExpense={setSelectedExpense}
      thread={thread}
      threadLoading={threadLoading}
      onFocusThreadRequest={setThreadTargetId}
    />
  );
}
