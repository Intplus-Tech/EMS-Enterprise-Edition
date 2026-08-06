"use client";

/**
 * Admin Budgets page route (/budgets).
 *
 * Provides system administrators and finance leaders with an enterprise view
 * of all department budgets, headroom ledgers, and allocation actions.
 */

import { useMemo } from "react";
import { AdminBudgetsTab, AdminBudgetRow } from "../../../components/admin/AdminBudgetsTab";
import { useDashboard } from "../DashboardProvider";

export default function BudgetsPage() {
  const {
    departments,
    budgets,
    budgetPeriods,
    expenses,
    loadDashboardData,
    currentUser,
    setSelectedAdminDept,
    setShowAdminSetBudgetModal,
  } = useDashboard();

  return (
    <AdminBudgetsTab
      departments={departments}
      budgets={budgets}
      budgetPeriods={budgetPeriods}
      expenses={expenses}
      onOpenSetBudget={(departmentId) => {
        if (departmentId) {
          const dept = departments.find((d) => d.id === departmentId);
          if (dept) setSelectedAdminDept(dept);
        } else {
          setSelectedAdminDept(null);
        }
        setShowAdminSetBudgetModal(true);
      }}
      onReload={() => loadDashboardData(currentUser)}
    />
  );
}
