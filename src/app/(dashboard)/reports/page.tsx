"use client";

import { AdminEnterpriseReportingTab } from "../../../components/admin/AdminEnterpriseReportingTab";
import { useDashboard } from "../DashboardProvider";

export default function ReportsPage() {
  const { currentUser, departments, expenses, metrics } = useDashboard();

  if (currentUser?.role !== "ADMIN") return null;

  return (
    <AdminEnterpriseReportingTab
      departments={departments}
      expenses={expenses}
      metrics={metrics}
    />
  );
}
