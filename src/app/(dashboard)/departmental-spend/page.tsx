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
    setSelectedExpense,
    setSelectedAdminDept,
    setShowAdminCreateDeptModal,
    setShowAdminEditDeptModal,
    setShowAdminDeleteDeptModal,
  } = useDashboard();

  // The directory (`departments`) and the ledger figures (`budgets`) come from
  // separate endpoints; the table needs them joined into one row per department.
  const departmentRows = useMemo<AdminDepartmentRow[]>(() => {
    const spendById = new Map(budgets.map((b) => [b.id, b]));
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
      };
    });
  }, [departments, budgets]);

  if (currentUser?.role === SystemRole.ADMIN) {
    return (
      <AdminDepartmentalSpendTab
        departments={departmentRows}
        onOpenCreateDept={() => setShowAdminCreateDeptModal(true)}
        onOpenEditDept={(dept) => {
          setSelectedAdminDept(dept);
          setShowAdminEditDeptModal(true);
        }}
        onOpenDeleteDept={(dept) => {
          setSelectedAdminDept(dept);
          setShowAdminDeleteDeptModal(true);
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
    />
  );
}
