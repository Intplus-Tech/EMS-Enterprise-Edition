"use client";

import { SettingsTab } from "../../../components/SettingsTab";
import { useDashboard } from "../DashboardProvider";

export default function SettingsPage() {
  const {
    currentUser,
    fetchSession,
    setSettingsForm,
    setSettingsMessage,
    setSettingsError,
    setShowChangePasswordModal,
    setShowEditProfileModal,
    setShowUpdatePhotoModal,
    setEditProfileForm,
    editProfileForm,
    handleUpdateProfile,
  } = useDashboard();

  // The dialogs themselves are mounted once by DashboardShell; this page only
  // supplies what the screen renders and the setters that open them.
  return (
    <SettingsTab
      currentUser={currentUser}
      fetchSession={fetchSession}
      setSettingsForm={setSettingsForm}
      setSettingsMessage={setSettingsMessage}
      setSettingsError={setSettingsError}
      setShowChangePasswordModal={setShowChangePasswordModal}
      setShowEditProfileModal={setShowEditProfileModal}
      setShowUpdatePhotoModal={setShowUpdatePhotoModal}
      setEditProfileForm={setEditProfileForm}
      editProfileForm={editProfileForm}
      handleUpdateProfile={handleUpdateProfile}
    />
  );
}
