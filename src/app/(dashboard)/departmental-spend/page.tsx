/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { AdminDepartmentalSpendTab } from "../../../components/admin/AdminDepartmentalSpendTab";
import { DepartmentalSpendTab } from "../../../components/DepartmentalSpendTab";
import { useDashboard } from "../DashboardProvider";

export default function DepartmentalSpendPage() {
  const {
    currentUser,
    expenses,
    departments,
    setSelectedExpense,
    setSelectedAdminDept,
    setShowAdminCreateDeptModal,
    setShowAdminEditDeptModal,
    setShowAdminDeleteDeptModal,
  } = useDashboard();

  if (currentUser?.role === "ADMIN") {
    return (
      <AdminDepartmentalSpendTab
        departments={departments}
        onOpenCreateDept={() => setShowAdminCreateDeptModal(true)}
        onOpenEditDept={(dept: any) => {
          setSelectedAdminDept(dept);
          setShowAdminEditDeptModal(true);
        }}
        onOpenDeleteDept={(dept: any) => {
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
      setSelectedExpense={setSelectedExpense}
    />
  );
}
