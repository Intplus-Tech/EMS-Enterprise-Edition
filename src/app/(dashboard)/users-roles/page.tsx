"use client";

/**
 * Admin "Users & Roles" route. Wires the dashboard context to the presentational
 * tab — the tab itself performs no I/O (engineering rule 1-D).
 */
import { AdminUsersAndRolesTab } from "../../../components/admin/AdminUsersAndRolesTab";
import { useDashboard } from "../DashboardProvider";
import { AdminClient } from "../../../services/admin.client";
import { toErrorMessage } from "../../../services/http";
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
    loadUsers,
    setInviteForm,
    setInviteResult,
    setShowInviteModal,
    setAdminNotice,
    setSelectedAdminUser,
    setShowAdminAddUserModal,
    setShowAdminEditUserProfileModal,
    setSelectedAdminRole,
    setShowAdminEditRoleModal,
    setShowAdminSuspendUserModal,
    setShowAdminDeleteUserModal,
  } = useDashboard();

  if (currentUser?.role !== SystemRole.ADMIN) return null;

  /**
   * Re-issuing an invite mints a fresh token, so the result dialog is reopened
   * with the new link rather than the stale one from the original invitation.
   * Moved here from the retired "Users & Invites" screen.
   */
  const handleResendInvite = async (user: AdminUserDto) => {
    const input = {
      name: user.name,
      email: user.email,
      role: user.role,
      departmentId: user.department?.id ?? "",
    };
    setInviteForm(input);
    try {
      setInviteResult(await AdminClient.inviteUser(input));
      setShowInviteModal(true);
      await loadUsers();
    } catch (error) {
      setAdminNotice({ tone: "error", message: toErrorMessage(error, "Failed to generate invitation link.") });
    }
  };

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
      onResendInvite={handleResendInvite}
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
