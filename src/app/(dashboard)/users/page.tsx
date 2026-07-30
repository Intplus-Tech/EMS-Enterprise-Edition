"use client";

import { UsersTab } from "../../../components/UsersTab";
import { useDashboard } from "../DashboardProvider";

export default function UsersPage() {
  const {
    currentUser,
    systemUsers,
    setInviteResult,
    setShowInviteModal,
    setInviteForm,
    setInviteError,
    setInviteSubmitting,
  } = useDashboard();

  if (currentUser?.role !== "ADMIN") return null;

  return (
    <UsersTab
      currentUser={currentUser}
      systemUsers={systemUsers}
      setInviteResult={setInviteResult}
      setShowInviteModal={setShowInviteModal}
      setInviteForm={setInviteForm}
      setInviteError={setInviteError}
      setInviteSubmitting={setInviteSubmitting}
    />
  );
}
