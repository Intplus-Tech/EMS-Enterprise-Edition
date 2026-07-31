"use client";

/**
 * Admin "Users & Roles" route. Wires the dashboard context to the presentational
 * tab — the tab itself performs no I/O (engineering rule 1-D).
 */
import { AdminUsersAndRolesTab } from "../../../components/admin/AdminUsersAndRolesTab";
import { useDashboard } from "../DashboardProvider";
import { AdminUserDto, RolePermissionDto } from "../../../types/api";
import { SystemRole } from "../../../enums/roles";

export default function UsersRolesPage() {
  const {
    currentUser,
    systemUsers,
    departments,
    budgets,
    rolePermissions,
    adminBusy,
    saveRolePermissions,
    updateUser,
    setSelectedAdminUser,
    setShowAdminAddUserModal,
    setShowAdminEditUserProfileModal,
    setSelectedAdminRole,
    setShowAdminEditRoleModal,
    setShowAdminSuspendUserModal,
    setShowAdminDeleteUserModal,
  } = useDashboard();

  if (currentUser?.role !== SystemRole.ADMIN) return null;

  return (
    <AdminUsersAndRolesTab
      systemUsers={systemUsers}
      departments={departments}
      budgets={budgets}
      rolePermissions={rolePermissions}
      busy={adminBusy}
      // The inline role select persists through the same mutation the Edit
      // Profile dialog uses, so both paths refetch and report failures.
      onChangeUserRole={(user: AdminUserDto, role: SystemRole) => updateUser(user.id, { role })}
      onOpenAddUser={() => setShowAdminAddUserModal(true)}
      onOpenEditUserProfile={(user: AdminUserDto) => {
        setSelectedAdminUser(user);
        setShowAdminEditUserProfileModal(true);
      }}
      onOpenEditRole={(roleData: RolePermissionDto) => {
        setSelectedAdminRole(roleData);
        setShowAdminEditRoleModal(true);
      }}
      onOpenSuspendUser={(user: AdminUserDto) => {
        setSelectedAdminUser(user);
        setShowAdminSuspendUserModal(true);
      }}
      onOpenDeleteUser={(user: AdminUserDto) => {
        setSelectedAdminUser(user);
        setShowAdminDeleteUserModal(true);
      }}
      onSaveRolePermissions={saveRolePermissions}
    />
  );
}
