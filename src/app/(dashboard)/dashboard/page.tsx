"use client";

import { AdminSystemOverviewTab } from "../../../components/admin/AdminSystemOverviewTab";
import { DashboardTab } from "../../../components/DashboardTab";
import { useDashboard } from "../DashboardProvider";

export default function DashboardPage() {
  const {
    currentUser,
    expenses,
    chartViewMode, setChartViewMode,
    systemUsers,
    departments,
    budgets,
    budgetPeriods,
    systemLogs,
    setShowAdminAddUserModal,
    setShowAdminCreateDeptModal,
    setShowAdminSetBudgetModal,
  } = useDashboard();

  if (currentUser?.role === "ADMIN") {
    return (
      <AdminSystemOverviewTab
        currentUser={currentUser}
        systemUsersCount={systemUsers.length}
        departmentsCount={departments.length}
        budgets={budgets}
        budgetPeriods={budgetPeriods}
        systemLogs={systemLogs}
        onOpenAddUser={() => setShowAdminAddUserModal(true)}
        onOpenCreateDept={() => setShowAdminCreateDeptModal(true)}
        onOpenSetBudget={() => setShowAdminSetBudgetModal(true)}
      />
    );
  }

  return (
    <DashboardTab
      currentUser={currentUser}
      expenses={expenses}
      chartViewMode={chartViewMode}
      setChartViewMode={setChartViewMode}
    />
  );
}
