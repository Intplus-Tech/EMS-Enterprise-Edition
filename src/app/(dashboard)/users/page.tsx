"use client";

/**
 * Admin "User & Invitation Directory" route. Owns the resend-invite request so
 * the tab stays presentational (engineering rule 1-D).
 */
import { ResendInviteInput, UsersTab } from "../../../components/UsersTab";
import { useDashboard } from "../DashboardProvider";
import { AdminClient } from "../../../services/admin.client";
import { toErrorMessage } from "../../../services/http";
import { SystemRole } from "../../../enums/roles";

export default function UsersPage() {
  const {
    currentUser,
    systemUsers,
    setInviteResult,
    setShowInviteModal,
    setInviteForm,
    setAdminNotice,
    loadUsers,
  } = useDashboard();

  if (currentUser?.role !== SystemRole.ADMIN) return null;

  // Re-issuing an invite mints a fresh token, so the result modal is reopened
  // with the new link rather than the stale one from the original invitation.
  const handleResendInvite = async (input: ResendInviteInput) => {
    setInviteForm(input);
    try {
      const result = await AdminClient.inviteUser(input);
      setInviteResult(result);
      setShowInviteModal(true);
      await loadUsers();
    } catch (error) {
      setAdminNotice({ tone: "error", message: toErrorMessage(error, "Failed to generate invitation link.") });
    }
  };

  return (
    <UsersTab
      currentUser={currentUser}
      systemUsers={systemUsers}
      onOpenInvite={() => {
        setInviteResult(null);
        setShowInviteModal(true);
      }}
      onResendInvite={handleResendInvite}
    />
  );
}
