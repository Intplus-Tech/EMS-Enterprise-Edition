"use client";

import { AdminEnterpriseReportingTab } from "../../../components/admin/AdminEnterpriseReportingTab";
import { useDashboard } from "../DashboardProvider";

export default function ReportsPage() {
  const { currentUser, departments, budgets, expenses, metrics } = useDashboard();

  if (currentUser?.role !== "ADMIN") return null;

  return (
    <AdminEnterpriseReportingTab
      budgets={budgets}
      departments={departments}
      expenses={expenses}
      metrics={metrics}
    />
  );
}
