/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useTransition } from "react";
import * as Icons from "lucide-react";
import { BRANDING } from "../../config/branding";

import { DynamicIcon } from "../../components/DynamicIcon";
import { NotificationsPanel } from "../../components/NotificationsPanel";
import { SidebarNavItem } from "../../components/ui/SidebarNavItem";
import { PageLoader } from "../../components/ui/PageLoader";
import { getNavItemsForRole } from "./navItems";

// Modular Dialog Modals
import { InitiateExpenseRequestModal } from "../../components/modals/InitiateExpenseRequestModal";
import { ExpenseDetailModal } from "../../components/modals/ExpenseDetailModal";
import { ResubmitExpenseModal } from "../../components/modals/ResubmitExpenseModal";
import { ViewReceiptModal } from "../../components/modals/ViewReceiptModal";
import { InviteUserModal } from "../../components/modals/InviteUserModal";
import { InviteResultModal } from "../../components/modals/InviteResultModal";
import { EditProfileModal } from "../../components/modals/EditProfileModal";
import { UpdatePhotoModal } from "../../components/modals/UpdatePhotoModal";
import { ChangePasswordModal } from "../../components/modals/ChangePasswordModal";
import { GlobalAlertDialogModal } from "../../components/modals/GlobalAlertDialogModal";
import { NoticeBanner } from "../../components/ui/NoticeBanner";
import { AttachmentViewModal } from "../../components/modals/AttachmentViewModal";

// System Admin Modals
import { AdminAddUserModal } from "../../components/admin/modals/AdminAddUserModal";
import { AdminEditUserProfileModal } from "../../components/admin/modals/AdminEditUserProfileModal";
import { AdminCreateDepartmentModal } from "../../components/admin/modals/AdminCreateDepartmentModal";
import { AdminEditDepartmentModal } from "../../components/admin/modals/AdminEditDepartmentModal";
import { AdminDeleteDepartmentModal } from "../../components/admin/modals/AdminDeleteDepartmentModal";
import { AdminDeleteUserModal } from "../../components/admin/modals/AdminDeleteUserModal";
import { AdminSuspendUserModal } from "../../components/admin/modals/AdminSuspendUserModal";
import { AdminEditRoleModal } from "../../components/admin/modals/AdminEditRoleModal";
import { AdminSetBudgetModal } from "../../components/admin/modals/AdminSetBudgetModal";
import { FiscalPeriod } from "../../domains/budget/fiscalPeriod";

import { useDashboard } from "./DashboardProvider";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const {
    router,
    pathname,
    currentUser,
    loading,
    startupError,
    setStartupError,
    setLoading,
    fetchSession,
    expenses,
    notifications,
    unreadNotificationCount,
    dismissNotification,
    markAllNotificationsRead,
    searchQuery, setSearchQuery,
    showNotifications, setShowNotifications,
    setShowCreateModal,
    theme, toggleTheme,
    handleLogout,
    // modal state
    showCreateModal,
    formError,
    newRequest, setNewRequest,
    fileInputRef,
    handleFileUpload,
    removeDraftAttachment,
    isUploadingDoc,
    uploadDocError,
    handleCreateRequest,
    requestSubmitting,
    selectedExpense, setSelectedExpense,
    budgetItems, budgetItemsLoading,
    actionComment, setActionComment,
    adjustedAmount, setAdjustedAmount,
    decisionSignature, setDecisionSignature,
    handleCancelRequest,
    handleExceptionalBudgetAction,
    handleWorkflowAction,
    handleFinanceUpload,
    showResubmitModal, setShowResubmitModal,
    selectedResubmitExpense, setSelectedResubmitExpense,
    resubmitForm, setResubmitForm,
    resubmitFileInputRef,
    handleResubmitRequest,
    viewedAttachment, setViewedAttachment,
    addAttachments, removeAttachment, attachmentsUploading,
    showReceiptModal, setShowReceiptModal,
    selectedReceiptData, setSelectedReceiptData,
    showInviteModal, setShowInviteModal,
    inviteError,
    inviteForm, setInviteForm,
    departments,
    inviteSubmitting,
    handleInviteUser,
    inviteResult, setInviteResult,
    inviteAndReport, retryInvite, inviteRetrying,
    showEditProfileModal, setShowEditProfileModal,
    editProfileForm, setEditProfileForm,
    handleUpdateProfile,
    showUpdatePhotoModal, setShowUpdatePhotoModal,
    showChangePasswordModal, setShowChangePasswordModal,
    settingsMessage,
    settingsError,
    settingsForm, setSettingsForm,
    showPasswordCurrentToggle, setShowPasswordCurrentToggle,
    showPasswordNewToggle, setShowPasswordNewToggle,
    handleChangePassword,
    systemUsers,
    // Persisted admin mutations from useAdminAdministration.
    createDepartment, updateDepartment, deleteDepartment, loadDashboardData,
    updateUser, setUserActive, deleteUser, revokeUserSessions,
    saveBudgetPeriod, saveRolePermissions,
    adminNotice, setAdminNotice, adminBusy,
    accountBusy,
    showAdminAddUserModal, setShowAdminAddUserModal,
    showAdminEditUserProfileModal, setShowAdminEditUserProfileModal,
    selectedAdminUser,
    showAdminCreateDeptModal, setShowAdminCreateDeptModal,
    showAdminEditDeptModal, setShowAdminEditDeptModal,
    selectedAdminDept,
    showAdminDeleteDeptModal, setShowAdminDeleteDeptModal,
    showAdminDeleteUserModal, setShowAdminDeleteUserModal,
    showAdminSuspendUserModal, setShowAdminSuspendUserModal,
    showAdminEditRoleModal, setShowAdminEditRoleModal,
    selectedAdminRole,
    showAdminSetBudgetModal, setShowAdminSetBudgetModal,
    // Existing allocations, so Set Budget opens on the department's real items
    // instead of an empty list that would overwrite them on save.
    budgetPeriods,
    alertDialog, setAlertDialog,
  } = useDashboard();

  // Sidebar navigation runs inside a transition so the shell can show the top
  // progress bar while the next segment loads. Without this the sidebar simply
  // froze on click with no indication anything was happening — the pages are
  // client components, so `loading.tsx` alone does not cover the fetch that
  // follows.
  const [isNavigating, startNavigation] = useTransition();
  const navTo = (route: string) => startNavigation(() => router.push(route));
  const isActive = (route: string) => pathname === route;

  // Raising a request is the initiator's job and nobody else's, so the control
  // is absent rather than disabled for every other role — a greyed-out button
  // still advertises an action they will never be given. The list also used to
  // include APPROVER, who `POST /api/expenses` has never accepted: that button
  // was enabled and 403'd on submit.
  const canRaiseRequest = currentUser?.role === "INITIATOR";

  // Notification actions resolve back to the live expense record they were derived from.
  const handleNotificationAction = (notification: any) => {
    const expense = expenses.find((e: any) => String(e._id) === String(notification.requestId));
    setShowNotifications(false);
    if (!expense) return;

    if (notification.type === "RETURNED") {
      setSelectedResubmitExpense(expense);
      // Start with no new uploads; the request keeps its existing documents
      // unless the initiator attaches replacements.
      setResubmitForm({ justification: "", supportingDocuments: [] });
      setShowResubmitModal(true);
      return;
    }

    if (notification.type === "PAID" && expense.paymentReceipt) {
      setSelectedReceiptData(expense);
      setShowReceiptModal(true);
      return;
    }

    setSelectedExpense(expense);
  };

  if (startupError) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", background: "rgb(var(--color-background))", color: "rgb(var(--color-text))", padding: "2rem", fontFamily: "var(--font-sans)" }}>
        <div className="glass-panel" style={{ maxWidth: "520px", width: "100%", padding: "2.5rem", textAlign: "center" }}>
          <div style={{ display: "inline-flex", padding: "0.75rem", borderRadius: "50%", background: "rgba(239, 68, 68, 0.2)", color: "#EF4444", marginBottom: "1.5rem" }}>
            <Icons.AlertTriangle size={32} />
          </div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1rem" }}>System Initialization Failed</h2>
          <p style={{ color: "rgb(var(--color-text-muted))", fontSize: "0.95rem", lineHeight: "1.6", marginBottom: "2rem" }}>
            {startupError}
          </p>
          <button
            onClick={() => { setStartupError(""); setLoading(true); fetchSession(); }}
            className="btn btn-primary"
            style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
          >
            <Icons.RefreshCw size={16} /> Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <PageLoader
        fullScreen
        message="Initialising spend management dashboard"
        hint="Loading your session, requests and approvals…"
      />
    );
  }

  return (
    <div className="app-container">
      {/* Route transition indicator — spans the viewport while a sidebar
          destination resolves, so the chrome stays usable meanwhile. */}
      {isNavigating && <div className="route-progress" role="progressbar" aria-label="Loading page" />}

      {/* Sidebar navigation */}
      <div className="sidebar">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "2rem", padding: "0 0.5rem" }}>
          <div style={{
            padding: "0.5rem",
            borderRadius: "0.5rem",
            background: "rgb(var(--color-primary) / 0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 40,
            height: 40
          }}>
            {BRANDING.logoUrl ? (
              <img src={BRANDING.logoUrl} alt={`${BRANDING.appName} Logo`} style={{ width: 28, height: 28, objectFit: "contain" }} />
            ) : (
              <DynamicIcon name={BRANDING.logoIcon} style={{ color: "rgb(var(--color-primary))", width: 28, height: 28 }} />
            )}
          </div>
          <div>
            <h1 style={{ fontSize: "1.25rem", fontWeight: "bold" }}>{BRANDING.appName}</h1>
            <p style={{ fontSize: "0.7rem", color: "rgb(var(--color-text-dim))" }}>{BRANDING.tagline}</p>
          </div>
        </div>

        {/* Role navigation. Every role renders the same primitive from the same
            config, so the active page reads identically everywhere. */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flexGrow: 1 }}>
          {getNavItemsForRole(currentUser?.role).map((item) => (
            <SidebarNavItem
              key={item.route}
              label={item.label}
              icon={item.icon}
              isActive={isActive(item.route)}
              onClick={() => navTo(item.route)}
              badgeCount={item.badge?.({ expenses, role: currentUser?.role })}
            />
          ))}
        </div>

        {/* User profile card at bottom of sidebar */}
        <div style={{ marginTop: "auto", paddingTop: "0.75rem", borderTop: "1px solid rgb(var(--color-card-border) / 0.5)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div
            style={{
              padding: "0.6rem 0.75rem",
              borderRadius: "10px",
              background: "rgb(var(--color-surface) / 0.5)",
              border: "1px solid rgb(var(--color-card-border) / 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.5rem"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", overflow: "hidden" }}>
              <img
                src={currentUser?.avatar || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200&auto=format&fit=crop"}
                alt="Profile"
                style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
              />
              <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                <span style={{ fontSize: "0.825rem", fontWeight: "700", color: "rgb(var(--color-text))", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {currentUser?.name || "Jane Doe"}
                </span>
                <span style={{ fontSize: "0.7rem", color: "rgb(var(--color-text-dim))" }}>
                  {currentUser?.role === "FINANCE_HEAD" ? "Finance Head" : currentUser?.role === "INITIATOR" ? "Initiator" : currentUser?.role?.replace(/_/g, " ") || "Initiator"}
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Logout"
              style={{
                background: "none",
                border: "none",
                color: "rgb(var(--color-text-muted))",
                cursor: "pointer",
                padding: "0.3rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "6px",
                flexShrink: 0
              }}
              onMouseOver={(e) => e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)"}
              onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
            >
              <Icons.LogOut size={16} style={{ color: "rgb(var(--color-text-dim))" }} />
            </button>
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "transparent",
              border: "none",
              color: "rgb(var(--color-text-muted))",
              fontSize: "0.75rem",
              fontWeight: "600",
              cursor: "pointer",
              padding: "0.25rem 0.5rem",
              borderRadius: "4px",
              textAlign: "left"
            }}
          >
            {theme === "light" ? <Icons.Moon size={13} /> : <Icons.Sun size={13} />}
            {theme === "light" ? "Dark Mode" : "Light Mode"}
          </button>
        </div>
      </div>

      {/* Main dashboard content area */}
      <div className="main-content">

        {/* Top Header Bar for Search & Actions */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.75rem", gap: "1rem", flexWrap: "wrap" }}>
          <div style={{ position: "relative", minWidth: "280px", flexGrow: 1, maxWidth: "420px" }}>
            <Icons.Search size={16} style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "rgb(var(--color-text-dim))" }} />
            <input
              type="text"
              placeholder="Search requests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{
                paddingLeft: "2.4rem",
                paddingTop: "0.55rem",
                paddingBottom: "0.55rem",
                fontSize: "0.85rem",
                borderRadius: "8px",
                background: "rgb(var(--color-surface) / 0.5)",
                border: "1px solid rgb(var(--color-card-border) / 0.5)"
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
            <div style={{ position: "relative" }}>
              <div style={{ position: "relative", cursor: "pointer" }} onClick={() => setShowNotifications(!showNotifications)}>
                <Icons.Bell size={20} style={{ color: "rgb(var(--color-text-muted))" }} />
                {unreadNotificationCount > 0 && (
                  <span style={{ position: "absolute", top: -2, right: -2, width: 8, height: 8, borderRadius: "50%", background: "#EF4444" }} />
                )}
              </div>

              {showNotifications && (
                <NotificationsPanel
                  notifications={notifications}
                  onClose={() => setShowNotifications(false)}
                  onDismiss={dismissNotification}
                  onMarkAllRead={markAllNotificationsRead}
                  onPrimaryAction={handleNotificationAction}
                />
              )}
            </div>

            {/* Initiators only — see `canRaiseRequest`. */}
            {canRaiseRequest && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn btn-primary"
                style={{
                  // `btn-primary` already paints the brand blue; no override needed.
                  padding: "0.55rem 1.15rem",
                  borderRadius: "8px",
                  fontWeight: "600",
                  fontSize: "0.85rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  boxShadow: "0 2px 4px rgba(37, 99, 235, 0.2)",
                }}
              >
                <Icons.Plus size={16} /> New Request
              </button>
            )}
          </div>
        </div>

        {/* Feedback for persisted admin actions — sits above the active page so
            a rejected save is visible next to the screen that triggered it. */}
        <NoticeBanner notice={adminNotice} onDismiss={() => setAdminNotice(null)} />

        {/* Active route page renders here */}
        {children}

      </div>

      {/* MODULAR DIALOG MODALS */}
      <InitiateExpenseRequestModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        formError={formError}
        newRequest={newRequest}
        setNewRequest={setNewRequest}
        departmentName={currentUser?.departmentName}
        fileInputRef={fileInputRef}
        handleFileUpload={handleFileUpload}
        isUploadingDoc={isUploadingDoc}
        uploadDocError={uploadDocError}
        removeDraftAttachment={removeDraftAttachment}
        handleCreateRequest={handleCreateRequest}
        // The Reply dialog owns "resubmit"; this one only reflects its own two.
        submitting={requestSubmitting === "resubmit" ? null : requestSubmitting}
      />

      <ExpenseDetailModal
        selectedExpense={selectedExpense}
        currentUser={currentUser}
        budgetItems={budgetItems}
        budgetItemsLoading={budgetItemsLoading}
        onClose={() => { setSelectedExpense(null); setActionComment(""); setDecisionSignature(""); }}
        actionComment={actionComment}
        setActionComment={setActionComment}
        adjustedAmount={adjustedAmount}
        setAdjustedAmount={setAdjustedAmount}
        decisionSignature={decisionSignature}
        setDecisionSignature={setDecisionSignature}
        handleCancelRequest={handleCancelRequest}
        handleExceptionalBudgetAction={handleExceptionalBudgetAction}
        handleWorkflowAction={handleWorkflowAction}
        handleFinanceUpload={handleFinanceUpload}
        onViewAttachment={setViewedAttachment}
        onAddAttachments={addAttachments}
        onRemoveAttachment={removeAttachment}
        attachmentsUploading={attachmentsUploading}
      />

      <ResubmitExpenseModal
        isOpen={showResubmitModal}
        onClose={() => { setShowResubmitModal(false); setSelectedResubmitExpense(null); }}
        selectedResubmitExpense={selectedResubmitExpense}
        formError={formError}
        resubmitForm={resubmitForm}
        setResubmitForm={setResubmitForm}
        resubmitFileInputRef={resubmitFileInputRef}
        handleFileUpload={handleFileUpload}
        removeDraftAttachment={removeDraftAttachment}
        onViewAttachment={setViewedAttachment}
        isUploadingDoc={isUploadingDoc}
        handleResubmitRequest={handleResubmitRequest}
        isResubmitting={requestSubmitting === "resubmit"}
        onWithdraw={(id: string) => { setShowResubmitModal(false); handleCancelRequest(id); }}
      />

      <AttachmentViewModal
        isOpen={Boolean(viewedAttachment)}
        onClose={() => setViewedAttachment(null)}
        attachment={viewedAttachment}
      />

      <ViewReceiptModal
        isOpen={showReceiptModal}
        onClose={() => { setShowReceiptModal(false); setSelectedReceiptData(null); }}
        selectedReceiptData={selectedReceiptData}
      />


      <InviteUserModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        inviteError={inviteError}
        inviteForm={inviteForm}
        setInviteForm={setInviteForm}
        departments={departments}
        inviteSubmitting={inviteSubmitting}
        handleInviteUser={handleInviteUser}
      />

      <InviteResultModal
        inviteResult={inviteResult}
        onClose={() => { setInviteResult(null); setShowInviteModal(false); }}
        onRetry={retryInvite}
        retrying={inviteRetrying}
      />

      <EditProfileModal
        isOpen={showEditProfileModal}
        onClose={() => setShowEditProfileModal(false)}
        currentUser={currentUser}
        editProfileForm={editProfileForm}
        setEditProfileForm={setEditProfileForm}
        handleUpdateProfile={handleUpdateProfile}
        onOpenUpdatePhotoModal={() => {
          setShowEditProfileModal(false);
          setShowUpdatePhotoModal(true);
        }}
        busy={accountBusy}
      />

      <UpdatePhotoModal
        isOpen={showUpdatePhotoModal}
        onClose={() => {
          setShowUpdatePhotoModal(false);
          setShowEditProfileModal(true);
        }}
        currentUser={currentUser}
        editProfileForm={editProfileForm}
        setEditProfileForm={setEditProfileForm}
      />

      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        settingsMessage={settingsMessage}
        settingsError={settingsError}
        settingsForm={settingsForm}
        setSettingsForm={setSettingsForm}
        showPasswordCurrentToggle={showPasswordCurrentToggle}
        setShowPasswordCurrentToggle={setShowPasswordCurrentToggle}
        showPasswordNewToggle={showPasswordNewToggle}
        setShowPasswordNewToggle={setShowPasswordNewToggle}
        handleChangePassword={handleChangePassword}
        busy={accountBusy}
      />

      {/* SYSTEM ADMIN MODALS — every action persists via useAdminAdministration
          and refetches, so a refresh reflects what was actually saved. */}
      <AdminAddUserModal
        isOpen={showAdminAddUserModal}
        onClose={() => setShowAdminAddUserModal(false)}
        departments={departments}
        onSaveUser={(userData: any) =>
          inviteAndReport({
            name: userData.fullName,
            email: userData.email,
            role: userData.role,
            departmentId: userData.departmentId || undefined,
          })
        }
        busy={adminBusy}
      />

      <AdminEditUserProfileModal
        isOpen={showAdminEditUserProfileModal}
        onClose={() => setShowAdminEditUserProfileModal(false)}
        user={selectedAdminUser}
        departments={departments}
        onUpdateUser={(updatedUser: any) =>
          updateUser(updatedUser.id || updatedUser._id, {
            name: updatedUser.fullName,
            email: updatedUser.email,
            role: updatedUser.role,
            departmentId: updatedUser.departmentId || null,
            officialContact: updatedUser.contactNumber,
          })
        }
        onForceLogOut={(userId: string, name: string) => revokeUserSessions(userId, name)}
        busy={adminBusy}
      />

      <AdminCreateDepartmentModal
        isOpen={showAdminCreateDeptModal}
        onClose={() => setShowAdminCreateDeptModal(false)}
        onCreateDepartment={(deptData: any) =>
          createDepartment({
            name: deptData.name,
            description: deptData.description,
            totalBudget: deptData.totalBudget,
            lineItems: (deptData.lineItems || []).map((item: any) => ({
              name: item.name,
              description: item.description,
              amount: Number(item.amount) || 0,
            })),
          })
        }
        busy={adminBusy}
      />

      <AdminEditDepartmentModal
        isOpen={showAdminEditDeptModal}
        onClose={() => setShowAdminEditDeptModal(false)}
        department={selectedAdminDept}
        users={systemUsers}
        // Assignment is a user mutation, not a department one, so it goes
        // through the same persisted path the directory's role select uses.
        onAssignUser={(userId: string) =>
          updateUser(userId, { departmentId: selectedAdminDept?.id ?? selectedAdminDept?._id })
        }
        onUpdateDepartment={(updatedDept: any) =>
          updateDepartment(updatedDept.id || updatedDept._id, {
            name: updatedDept.name,
            description: updatedDept.description,
            totalBudget: updatedDept.totalBudget,
            lineItems: (updatedDept.budgetItems || []).map((line: any) => ({
              name: line.category ?? line.name,
              description: line.description,
              amount: Number(line.amount) || 0,
            })),
          })
        }
      />

      <AdminDeleteDepartmentModal
        isOpen={showAdminDeleteDeptModal}
        onClose={() => setShowAdminDeleteDeptModal(false)}
        department={selectedAdminDept}
        // Deletion cancels requests and hides the department's history, so the
        // request lists on screen are stale until they are refetched.
        onConfirmDelete={async (deptId: string) => {
          await deleteDepartment(deptId);
          await loadDashboardData(currentUser);
        }}
      />

      <AdminDeleteUserModal
        isOpen={showAdminDeleteUserModal}
        onClose={() => setShowAdminDeleteUserModal(false)}
        user={selectedAdminUser}
        onConfirmDelete={(userId: string) => deleteUser(userId)}
      />

      <AdminSuspendUserModal
        isOpen={showAdminSuspendUserModal}
        onClose={() => setShowAdminSuspendUserModal(false)}
        user={selectedAdminUser}
        onConfirmToggleAccess={(userId: string, nextActive: boolean) => setUserActive(userId, nextActive)}
      />

      <AdminEditRoleModal
        isOpen={showAdminEditRoleModal}
        onClose={() => setShowAdminEditRoleModal(false)}
        roleData={selectedAdminRole}
        busy={adminBusy}
        onSaveRole={(roleData: any) =>
          saveRolePermissions({
            role: roleData.role,
            grants: roleData.grants,
            description: roleData.description,
            isActive: roleData.isActive,
          })
        }
        onOpenMatrix={() => navTo("/users-roles")}
      />

      {/* Mounted only while open: the dialog seeds its rows from the selected
          department's existing items on mount, so a stale copy must not survive
          a save-and-reopen and overwrite the allocation that was just stored. */}
      {showAdminSetBudgetModal && (
        <AdminSetBudgetModal
          isOpen={showAdminSetBudgetModal}
          onClose={() => setShowAdminSetBudgetModal(false)}
          departments={departments}
          budgetPeriods={budgetPeriods}
          initialDepartmentId={selectedAdminDept?.id || selectedAdminDept?._id}
          onSetBudget={(
            departmentId: string,
            totalAmount: number,
            lineItems: any[],
            period: FiscalPeriod
          ) =>
            saveBudgetPeriod({
              departmentId,
              // The window the admin chose, rather than the hook's default —
              // otherwise every allocation landed on the current calendar year.
              ...period,
              totalBudget: totalAmount,
              lineItems: lineItems.map((item) => ({
                // Sent back so the server can match an edited item to the one it
                // already holds. Dropping it made every rename look like a new
                // item, discarding its ledger and orphaning attached requests.
                id: item.itemId,
                name: item.name,
                description: item.description,
                amount: Number(item.amount) || 0,
              })),
            })
          }
        />
      )}

      <GlobalAlertDialogModal
        alertDialog={alertDialog}
        onClose={() => setAlertDialog({ isOpen: false, message: "" })}
      />
    </div>
  );
}
