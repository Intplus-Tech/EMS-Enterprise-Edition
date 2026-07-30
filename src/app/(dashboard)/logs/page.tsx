"use client";

import { LogsTab } from "../../../components/LogsTab";
import { useDashboard } from "../DashboardProvider";

export default function LogsPage() {
  const {
    currentUser,
    systemLogs,
    logFilter, setLogFilter,
    loadLogs,
  } = useDashboard();

  if (currentUser?.role !== "ADMIN") return null;

  return (
    <LogsTab
      currentUser={currentUser}
      systemLogs={systemLogs}
      logFilter={logFilter}
      setLogFilter={setLogFilter}
      loadLogs={loadLogs}
    />
  );
}
