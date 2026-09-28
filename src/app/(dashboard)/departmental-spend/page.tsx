"use client";

/**
 * Departmental spend route. Admins get the department-management view; every
 * other permitted role gets the read-only oversight view.
 */
import { useMemo } from "react";
import {
  AdminDepartmentalSpendTab,
  AdminDepartmentRow,
} from "../../../components/admin/AdminDepartmentalSpendTab";
import { DepartmentalSpendTab } from "../../../components/DepartmentalSpendTab";
import { useDashboard } from "../DashboardProvider";
import { SystemRole } from "../../../enums/roles";

export default function DepartmentalSpendPage() {
  const {
    currentUser,
    expenses,
    departments,
    budgets,
    budgetPeriods,
    setSelectedExpense,
    loadDashboardData,
    setSelectedAdminDept,
    setShowAdminCreateDeptModal,
    setShowAdminSetBudgetModal,
    setShowAdminEditDeptModal,
    setShowAdminDeleteDeptModal,
    restoreDepartment,
  } = useDashboard();

  // The directory (`departments`) and the ledger figures (`budgets`) come from
  // separate endpoints; the table needs them joined into one row per department.
  const departmentRows = useMemo<AdminDepartmentRow[]>(() => {
    const spendById = new Map(budgets.map((b) => [b.id, b]));

    // Allocation lines, carried on the row so the Edit Department modal can
    // show them. Without this it opened with an empty list and its save wrote
    // that empty list back, erasing the department's budget breakdown.
    const linesByDept = new Map<string, { category: string; amount: number; description?: string; utilization: number }[]>();
    budgetPeriods.forEach((period) => {
      const existing = linesByDept.get(period.departmentId) ?? [];
      period.lineItems.forEach((item) =>
        existing.push({ category: item.name, amount: item.amount, description: item.description, utilization: 0 })
      );
      linesByDept.set(period.departmentId, existing);
    });

    return departments.map((dept) => {
      const spend = spendById.get(dept.id);
      return {
        ...dept,
        totalBudget: spend?.totalBudget ?? 0,
        utilised: spend?.utilised ?? 0,
        pending: spend?.pending ?? 0,
        remaining: spend?.remaining ?? 0,
        pctUsed: spend?.pctUsed ?? 0,
        topRequester: spend?.topRequester ?? "N/A",
        overBudgetCount: spend?.overBudgetCount ?? 0,
        hasBudget: spend?.hasBudget ?? false,
        budgetItems: linesByDept.get(dept.id) ?? [],
      };
    });
  }, [departments, budgets, budgetPeriods]);

  if (currentUser?.role === SystemRole.ADMIN) {
    return (
      <AdminDepartmentalSpendTab
        departments={departmentRows}
        expenses={expenses}
        onOpenCreateDept={() => setShowAdminCreateDeptModal(true)}
        onOpenSetBudget={(dept) => {
          if (dept) setSelectedAdminDept(dept);
          else setSelectedAdminDept(null);
          setShowAdminSetBudgetModal(true);
        }}
        onOpenEditDept={(dept) => {
          setSelectedAdminDept(dept);
          setShowAdminEditDeptModal(true);
        }}
        onOpenDeleteDept={(dept) => {
          setSelectedAdminDept(dept);
          setShowAdminDeleteDeptModal(true);
        }}
        // Restore undoes the deletion cascade, so the reinstated requests have
        // to be refetched alongside the department list.
        onRestoreDept={async (dept) => {
          await restoreDepartment(dept.id);
          await loadDashboardData(currentUser);
        }}
      />
    );
  }

  return (
    <DepartmentalSpendTab
      currentUser={currentUser}
      expenses={expenses}
      budgets={budgets}
      setSelectedExpense={setSelectedExpense}
      onReload={() => loadDashboardData(currentUser)}
    />
  );
}
