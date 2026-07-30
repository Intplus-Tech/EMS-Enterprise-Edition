"use client";

import { AdminAuditTrailViewerTab } from "../../../components/admin/AdminAuditTrailViewerTab";
import { useDashboard } from "../DashboardProvider";

export default function AuditTrailPage() {
  const { currentUser, systemLogs } = useDashboard();

  if (currentUser?.role !== "ADMIN") return null;

  return <AdminAuditTrailViewerTab logs={systemLogs} />;
}
