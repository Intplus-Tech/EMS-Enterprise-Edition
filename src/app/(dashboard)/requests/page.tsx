"use client";

import { RequestsTab } from "../../../components/RequestsTab";
import { useDashboard } from "../DashboardProvider";

export default function RequestsPage() {
  const {
    currentUser,
    expenses,
    searchQuery,
    amountSearchQuery, setAmountSearchQuery,
    requestsTodayOnly, setRequestsTodayOnly,
    requestsDateFilter, setRequestsDateFilter,
    setSelectedResubmitExpense,
    setResubmitForm,
    setShowResubmitModal,
    setSelectedExpense,
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
      amountSearchQuery={amountSearchQuery}
      setAmountSearchQuery={setAmountSearchQuery}
      todayOnly={requestsTodayOnly}
      setTodayOnly={setRequestsTodayOnly}
      dateFilter={requestsDateFilter}
      setDateFilter={setRequestsDateFilter}
      setSelectedResubmitExpense={setSelectedResubmitExpense}
      setResubmitForm={setResubmitForm}
      setShowResubmitModal={setShowResubmitModal}
      setSelectedExpense={setSelectedExpense}
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
