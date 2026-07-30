/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { AdminUsersAndRolesTab } from "../../../components/admin/AdminUsersAndRolesTab";
import { useDashboard } from "../DashboardProvider";

export default function UsersRolesPage() {
  const {
    currentUser,
    systemUsers,
    departments,
    setSelectedAdminUser,
    setShowAdminAddUserModal,
    setShowAdminEditUserProfileModal,
    setSelectedAdminRole,
    setShowAdminEditRoleModal,
    setShowAdminSuspendUserModal,
    setShowAdminDeleteUserModal,
  } = useDashboard();

  if (currentUser?.role !== "ADMIN") return null;

  return (
    <AdminUsersAndRolesTab
      systemUsers={systemUsers}
      departments={departments}
      onOpenAddUser={() => setShowAdminAddUserModal(true)}
      onOpenEditUserProfile={(user: any) => {
        setSelectedAdminUser(user);
        setShowAdminEditUserProfileModal(true);
      }}
      onOpenEditRole={(roleData: any) => {
        setSelectedAdminRole(roleData);
        setShowAdminEditRoleModal(true);
      }}
      onOpenSuspendUser={(user: any) => {
        setSelectedAdminUser(user);
        setShowAdminSuspendUserModal(true);
      }}
      onOpenDeleteUser={(user: any) => {
        setSelectedAdminUser(user);
        setShowAdminDeleteUserModal(true);
      }}
    />
  );
}
