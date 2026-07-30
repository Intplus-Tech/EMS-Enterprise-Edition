"use client";

import { RequestsTab } from "../../../components/RequestsTab";
import { useDashboard } from "../DashboardProvider";

export default function RequestsPage() {
  const {
    currentUser,
    expenses,
    searchQuery, setSearchQuery,
    showNotifications, setShowNotifications,
    notifications, setNotifications,
    setSelectedResubmitExpense,
    setResubmitForm,
    setShowResubmitModal,
    setSelectedExpense,
    setSelectedReceiptData,
    setShowReceiptModal,
    setShowCreateModal,
    requestsSubTab, setRequestsSubTab,
    deptFilterInitiator, setDeptFilterInitiator,
    deptFilterStatus, setDeptFilterStatus,
    deptPage, setDeptPage,
    deptRowsPerPage, setDeptRowsPerPage,
  } = useDashboard();

  return (
    <RequestsTab
      currentUser={currentUser}
      expenses={expenses}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      showNotifications={showNotifications}
      setShowNotifications={setShowNotifications}
      notifications={notifications}
      setNotifications={setNotifications}
      setSelectedResubmitExpense={setSelectedResubmitExpense}
      setResubmitForm={setResubmitForm}
      setShowResubmitModal={setShowResubmitModal}
      setSelectedExpense={setSelectedExpense}
      setSelectedReceiptData={setSelectedReceiptData}
      setShowReceiptModal={setShowReceiptModal}
      setShowCreateModal={setShowCreateModal}
      requestsSubTab={requestsSubTab}
      setRequestsSubTab={setRequestsSubTab}
      deptFilterInitiator={deptFilterInitiator}
      setDeptFilterInitiator={setDeptFilterInitiator}
      deptFilterStatus={deptFilterStatus}
      setDeptFilterStatus={setDeptFilterStatus}
      deptPage={deptPage}
      setDeptPage={setDeptPage}
      deptRowsPerPage={deptRowsPerPage}
      setDeptRowsPerPage={setDeptRowsPerPage}
    />
  );
}
