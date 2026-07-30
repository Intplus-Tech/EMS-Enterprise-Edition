"use client";

import { SettingsTab } from "../../../components/SettingsTab";
import { useDashboard } from "../DashboardProvider";

export default function SettingsPage() {
  const {
    currentUser,
    fetchSession,
    settingsForm, setSettingsForm,
    settingsMessage, setSettingsMessage,
    settingsError, setSettingsError,
    handleChangePassword,
    showChangePasswordModal, setShowChangePasswordModal,
    showEditProfileModal, setShowEditProfileModal,
    showUpdatePhotoModal, setShowUpdatePhotoModal,
    editProfileForm, setEditProfileForm,
    showPasswordCurrentToggle, setShowPasswordCurrentToggle,
    showPasswordNewToggle, setShowPasswordNewToggle,
    handleUpdateProfile,
  } = useDashboard();

  return (
    <SettingsTab
      currentUser={currentUser}
      fetchSession={fetchSession}
      settingsForm={settingsForm}
      setSettingsForm={setSettingsForm}
      settingsMessage={settingsMessage}
      setSettingsMessage={setSettingsMessage}
      settingsError={settingsError}
      setSettingsError={setSettingsError}
      handleChangePassword={handleChangePassword}
      showChangePasswordModal={showChangePasswordModal}
      setShowChangePasswordModal={setShowChangePasswordModal}
      showEditProfileModal={showEditProfileModal}
      setShowEditProfileModal={setShowEditProfileModal}
      showUpdatePhotoModal={showUpdatePhotoModal}
      setShowUpdatePhotoModal={setShowUpdatePhotoModal}
      editProfileForm={editProfileForm}
      setEditProfileForm={setEditProfileForm}
      showPasswordCurrentToggle={showPasswordCurrentToggle}
      setShowPasswordCurrentToggle={setShowPasswordCurrentToggle}
      showPasswordNewToggle={showPasswordNewToggle}
      setShowPasswordNewToggle={setShowPasswordNewToggle}
      handleUpdateProfile={handleUpdateProfile}
    />
  );
}
