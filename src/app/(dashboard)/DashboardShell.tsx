/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import * as Icons from "lucide-react";
import { BRANDING } from "../../config/branding";

import { DynamicIcon } from "../../components/DynamicIcon";

// Modular Dialog Modals
import { InitiateExpenseRequestModal } from "../../components/modals/InitiateExpenseRequestModal";
import { ExpenseDetailModal } from "../../components/modals/ExpenseDetailModal";
import { ResubmitExpenseModal } from "../../components/modals/ResubmitExpenseModal";
import { ViewReceiptModal } from "../../components/modals/ViewReceiptModal";
import { PerDiemPolicyModal } from "../../components/modals/PerDiemPolicyModal";
import { InviteUserModal } from "../../components/modals/InviteUserModal";
import { InviteResultModal } from "../../components/modals/InviteResultModal";
import { EditProfileModal } from "../../components/modals/EditProfileModal";
import { UpdatePhotoModal } from "../../components/modals/UpdatePhotoModal";
import { ChangePasswordModal } from "../../components/modals/ChangePasswordModal";
import { GlobalAlertDialogModal } from "../../components/modals/GlobalAlertDialogModal";

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
    isUploadingDoc,
    uploadDocError,
    handleCreateRequest,
    selectedExpense, setSelectedExpense,
    actionComment, setActionComment,
    adjustedAmount, setAdjustedAmount,
    paymentRef, setPaymentRef,
    handleCancelRequest,
    handleExceptionalBudgetAction,
    handleWorkflowAction,
    handleFinanceUpload,
    handlePaymentRelease,
    showResubmitModal, setShowResubmitModal,
    selectedResubmitExpense, setSelectedResubmitExpense,
    resubmitForm, setResubmitForm,
    resubmitFileInputRef,
    handleResubmitRequest,
    showReceiptModal, setShowReceiptModal,
    selectedReceiptData, setSelectedReceiptData,
    showPolicyModal, setShowPolicyModal,
    showInviteModal, setShowInviteModal,
    inviteError,
    inviteForm, setInviteForm,
    departments, setDepartments,
    inviteSubmitting,
    handleInviteUser,
    inviteResult, setInviteResult,
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
    systemUsers, setSystemUsers,
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
    alertDialog, setAlertDialog,
  } = useDashboard();

  const navTo = (route: string) => router.push(route);
  const isActive = (route: string) => pathname === route;

  if (startupError) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", background: "#0F172A", color: "#F8FAFC", padding: "2rem", fontFamily: "var(--font-sans)" }}>
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
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", backgroundColor: "rgb(15 23 42)", color: "#fff" }}>
        <div style={{ textAlign: "center" }}>
          <Icons.Loader className="animate-spin" size={48} style={{ color: "rgb(var(--color-primary))", margin: "0 auto 1rem" }} />
          <p>Initialising spend management dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Sidebar navigation */}
      <div className="sidebar">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "2rem", padding: "0 0.5rem" }}>
          <div style={{
            padding: "0.5rem",
            borderRadius: "0.5rem",
            background: "rgba(var(--color-primary), 0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 40,
            height: 40
          }}>
            {BRANDING.logoUrl ? (
              <img src={BRANDING.logoUrl} alt="Logo" style={{ width: 28, height: 28, objectFit: "contain" }} />
            ) : (
              <DynamicIcon name={BRANDING.logoIcon} style={{ color: "rgb(var(--color-primary))", width: 28, height: 28 }} />
            )}
          </div>
          <div>
            <h1 style={{ fontSize: "1.25rem", fontWeight: "bold" }}>{BRANDING.appName}</h1>
            <p style={{ fontSize: "0.7rem", color: "rgb(var(--color-text-dim))" }}>{BRANDING.tagline}</p>
          </div>
        </div>

        {/* Dynamic view filters based on active tabs */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flexGrow: 1 }}>
          {currentUser?.role === "INITIATOR" ? (
            <>
              <button
                onClick={() => navTo("/requests")}
                className="btn"
                style={{
                  justifyContent: "flex-start",
                  background: isActive("/requests") ? "rgba(255, 255, 255, 0.08)" : "transparent",
                  color: isActive("/requests") ? "rgb(var(--color-text))" : "rgb(var(--color-text-muted))"
                }}
              >
                <Icons.Receipt size={18} /> Requests
                {(() => {
                  const pendingCount = expenses.filter((e: any) => ["DRAFT", "RETURNED"].includes(e.status)).length + notifications.filter((n: any) => n.type === "RETURNED").length;
                  return pendingCount > 0 ? (
                    <span style={{
                      marginLeft: "auto",
                      background: "rgba(99, 102, 241, 0.2)",
                      color: "rgb(var(--color-primary))",
                      fontSize: "0.75rem",
                      fontWeight: "bold",
                      padding: "0.15rem 0.5rem",
                      borderRadius: "999px"
                    }}>
                      {pendingCount}
                    </span>
                  ) : null;
                })()}
              </button>

              <button
                onClick={() => navTo("/history")}
                className="btn"
                style={{
                  justifyContent: "flex-start",
                  background: isActive("/history") ? "rgba(255, 255, 255, 0.08)" : "transparent",
                  color: isActive("/history") ? "rgb(var(--color-text))" : "rgb(var(--color-text-muted))"
                }}
              >
                <Icons.History size={18} /> History
              </button>

              <button
                onClick={() => navTo("/settings")}
                className="btn"
                style={{
                  justifyContent: "flex-start",
                  background: isActive("/settings") ? "rgba(255, 255, 255, 0.08)" : "transparent",
                  color: isActive("/settings") ? "rgb(var(--color-text))" : "rgb(var(--color-text-muted))"
                }}
              >
                <Icons.Settings size={18} /> Settings
              </button>
            </>
          ) : currentUser?.role === "FINANCE_HEAD" ? (
            <>
              <div style={{ padding: "0.5rem 0.5rem 0.25rem", fontSize: "0.7rem", fontWeight: "700", color: "rgb(var(--color-text-dim))", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                EXCEPTIONS
              </div>

              <button
                onClick={() => navTo("/pending-exceptions")}
                className="btn"
                style={{
                  justifyContent: "flex-start",
                  background: isActive("/pending-exceptions") ? "rgba(37, 99, 235, 0.12)" : "transparent",
                  color: isActive("/pending-exceptions") ? "#2563EB" : "rgb(var(--color-text-muted))",
                  fontWeight: isActive("/pending-exceptions") ? "700" : "500"
                }}
              >
                <Icons.AlertTriangle size={18} /> Pending Exceptions
                <span style={{
                  marginLeft: "auto",
                  background: "#2563EB",
                  color: "#FFFFFF",
                  fontSize: "0.75rem",
                  fontWeight: "bold",
                  padding: "0.15rem 0.55rem",
                  borderRadius: "999px"
                }}>
                  12
                </span>
              </button>

              <button
                onClick={() => navTo("/departmental-spend")}
                className="btn"
                style={{
                  justifyContent: "flex-start",
                  background: isActive("/departmental-spend") ? "rgba(37, 99, 235, 0.12)" : "transparent",
                  color: isActive("/departmental-spend") ? "#2563EB" : "rgb(var(--color-text-muted))",
                  fontWeight: isActive("/departmental-spend") ? "700" : "500"
                }}
              >
                <Icons.PieChart size={18} /> Departmental Spend
              </button>

              <button
                onClick={() => navTo("/exception-history")}
                className="btn"
                style={{
                  justifyContent: "flex-start",
                  background: isActive("/exception-history") ? "rgba(37, 99, 235, 0.12)" : "transparent",
                  color: isActive("/exception-history") ? "#2563EB" : "rgb(var(--color-text-muted))",
                  fontWeight: isActive("/exception-history") ? "700" : "500"
                }}
              >
                <Icons.BarChart2 size={18} /> Exception History
              </button>

              <button
                onClick={() => navTo("/settings")}
                className="btn"
                style={{
                  justifyContent: "flex-start",
                  background: isActive("/settings") ? "rgba(37, 99, 235, 0.12)" : "transparent",
                  color: isActive("/settings") ? "#2563EB" : "rgb(var(--color-text-muted))",
                  fontWeight: isActive("/settings") ? "700" : "500"
                }}
              >
                <Icons.Settings size={18} /> Settings
              </button>
            </>
          ) : currentUser?.role === "ADMIN" ? (
            <>
              <button
                onClick={() => navTo("/dashboard")}
                className="btn"
                style={{
                  justifyContent: "flex-start",
                  background: isActive("/dashboard") ? "rgba(37, 99, 235, 0.12)" : "transparent",
                  color: isActive("/dashboard") ? "#2563EB" : "rgb(var(--color-text-muted))",
                  fontWeight: isActive("/dashboard") ? "700" : "500"
                }}
              >
                <Icons.LayoutDashboard size={18} /> Dashboard
              </button>

              <button
                onClick={() => navTo("/departmental-spend")}
                className="btn"
                style={{
                  justifyContent: "flex-start",
                  background: isActive("/departmental-spend") ? "rgba(37, 99, 235, 0.12)" : "transparent",
                  color: isActive("/departmental-spend") ? "#2563EB" : "rgb(var(--color-text-muted))",
                  fontWeight: isActive("/departmental-spend") ? "700" : "500"
                }}
              >
                <Icons.PieChart size={18} /> Departmental Spend
              </button>

              <button
                onClick={() => navTo("/reports")}
                className="btn"
                style={{
                  justifyContent: "flex-start",
                  background: isActive("/reports") ? "rgba(37, 99, 235, 0.12)" : "transparent",
                  color: isActive("/reports") ? "#2563EB" : "rgb(var(--color-text-muted))",
                  fontWeight: isActive("/reports") ? "700" : "500"
                }}
              >
                <Icons.BarChart2 size={18} /> Report
              </button>

              <button
                onClick={() => navTo("/users-roles")}
                className="btn"
                style={{
                  justifyContent: "flex-start",
                  background: isActive("/users-roles") ? "rgba(37, 99, 235, 0.12)" : "transparent",
                  color: isActive("/users-roles") ? "#2563EB" : "rgb(var(--color-text-muted))",
                  fontWeight: isActive("/users-roles") ? "700" : "500"
                }}
              >
                <Icons.Users size={18} /> Users & Roles
              </button>

              <button
                onClick={() => navTo("/audit-trail")}
                className="btn"
                style={{
                  justifyContent: "flex-start",
                  background: isActive("/audit-trail") ? "rgba(37, 99, 235, 0.12)" : "transparent",
                  color: isActive("/audit-trail") ? "#2563EB" : "rgb(var(--color-text-muted))",
                  fontWeight: isActive("/audit-trail") ? "700" : "500"
                }}
              >
                <Icons.FileText size={18} /> Audit Trail
              </button>

              <button
                onClick={() => navTo("/settings")}
                className="btn"
                style={{
                  justifyContent: "flex-start",
                  background: isActive("/settings") ? "rgba(37, 99, 235, 0.12)" : "transparent",
                  color: isActive("/settings") ? "#2563EB" : "rgb(var(--color-text-muted))",
                  fontWeight: isActive("/settings") ? "700" : "500"
                }}
              >
                <Icons.Settings size={18} /> Settings
              </button>

              <button
                onClick={() => navTo("/workflow")}
                className="btn"
                style={{
                  justifyContent: "flex-start",
                  background: isActive("/workflow") ? "rgba(37, 99, 235, 0.12)" : "transparent",
                  color: isActive("/workflow") ? "#2563EB" : "rgb(var(--color-text-muted))",
                  fontWeight: isActive("/workflow") ? "700" : "500"
                }}
              >
                <Icons.GitFork size={18} /> Workflow Rules
              </button>

              <button
                onClick={() => navTo("/logs")}
                className="btn"
                style={{
                  justifyContent: "flex-start",
                  background: isActive("/logs") ? "rgba(37, 99, 235, 0.12)" : "transparent",
                  color: isActive("/logs") ? "#2563EB" : "rgb(var(--color-text-muted))",
                  fontWeight: isActive("/logs") ? "700" : "500"
                }}
              >
                <Icons.History size={18} /> System Audits
              </button>

              <button
                onClick={() => navTo("/users")}
                className="btn"
                style={{
                  justifyContent: "flex-start",
                  background: isActive("/users") ? "rgba(37, 99, 235, 0.12)" : "transparent",
                  color: isActive("/users") ? "#2563EB" : "rgb(var(--color-text-muted))",
                  fontWeight: isActive("/users") ? "700" : "500"
                }}
              >
                <Icons.Users size={18} /> Users & Invites
              </button>
            </>
          ) : (
            <>
              {!["FINANCE_OFFICER", "FINANCE_HEAD", "FINANCE_MANAGER"].includes(currentUser?.role) && (
                <button
                  onClick={() => navTo("/dashboard")}
                  className="btn"
                  style={{
                    justifyContent: "flex-start",
                    background: isActive("/dashboard") ? "rgba(255, 255, 255, 0.08)" : "transparent",
                    color: isActive("/dashboard") ? "rgb(var(--color-text))" : "rgb(var(--color-text-muted))"
                  }}
                >
                  <Icons.LayoutDashboard size={18} /> Dashboard
                </button>
              )}

              <button
                onClick={() => navTo("/approvals")}
                className="btn"
                style={{
                  justifyContent: "flex-start",
                  background: isActive("/approvals") ? "rgba(255, 255, 255, 0.08)" : "transparent",
                  color: isActive("/approvals") ? "rgb(var(--color-text))" : "rgb(var(--color-text-muted))"
                }}
              >
                <Icons.CheckSquare size={18} /> {["FINANCE_OFFICER", "FINANCE_HEAD", "FINANCE_MANAGER"].includes(currentUser?.role) ? "Pipeline Overview" : "Pending Approvals"}
                {(() => {
                  const pendingCount = expenses.filter((exp: any) => {
                    if (currentUser?.role === "FINANCE_HEAD" && exp.status === "PENDING_EXCEPTIONAL") return true;
                    if (currentUser?.role === "APPROVER" && exp.status === "PENDING_APPROVAL" && exp.currentStepIndex === 0) return true;
                    if (currentUser?.role === "FINANCE_OFFICER" && exp.status === "SENT_TO_FINANCE") return true;
                    if (currentUser?.role === "FINANCE_MANAGER" && exp.status === "UPLOADED_TO_BANK") return true;
                    return false;
                  }).length;
                  return pendingCount > 0 ? (
                    <span style={{
                      marginLeft: "auto",
                      background: "rgba(239, 68, 68, 0.2)",
                      color: "rgb(var(--color-danger))",
                      fontSize: "0.75rem",
                      fontWeight: "bold",
                      padding: "0.15rem 0.5rem",
                      borderRadius: "999px"
                    }}>
                      {pendingCount}
                    </span>
                  ) : null;
                })()}
              </button>

              <button
                onClick={() => navTo("/history")}
                className="btn"
                style={{
                  justifyContent: "flex-start",
                  background: isActive("/history") ? "rgba(255, 255, 255, 0.08)" : "transparent",
                  color: isActive("/history") ? "rgb(var(--color-text))" : "rgb(var(--color-text-muted))"
                }}
              >
                <Icons.History size={18} /> History
              </button>

              {!["FINANCE_OFFICER", "FINANCE_HEAD", "FINANCE_MANAGER"].includes(currentUser?.role) && (
                <button
                  onClick={() => navTo("/requests")}
                  className="btn"
                  style={{
                    justifyContent: "flex-start",
                    background: isActive("/requests") ? "rgba(255, 255, 255, 0.08)" : "transparent",
                    color: isActive("/requests") ? "rgb(var(--color-text))" : "rgb(var(--color-text-muted))"
                  }}
                >
                  <Icons.Receipt size={18} /> Requests
                </button>
              )}

              <button
                onClick={() => navTo("/settings")}
                className="btn"
                style={{
                  justifyContent: "flex-start",
                  background: isActive("/settings") ? "rgba(255, 255, 255, 0.08)" : "transparent",
                  color: isActive("/settings") ? "rgb(var(--color-text))" : "rgb(var(--color-text-muted))"
                }}
              >
                <Icons.Settings size={18} /> Settings
              </button>
            </>
          )}
        </div>

        {/* User profile card at bottom of sidebar */}
        <div style={{ marginTop: "auto", paddingTop: "0.75rem", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div
            style={{
              padding: "0.6rem 0.75rem",
              borderRadius: "10px",
              background: "rgba(var(--color-surface), 0.5)",
              border: "1px solid rgba(var(--color-card-border), 0.3)",
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
                background: "rgba(var(--color-surface), 0.5)",
                border: "1px solid rgba(var(--color-card-border), 0.5)"
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
            <div style={{ position: "relative", cursor: "pointer" }} onClick={() => setShowNotifications(!showNotifications)}>
              <Icons.Bell size={20} style={{ color: "rgb(var(--color-text-muted))" }} />
              <span style={{ position: "absolute", top: -2, right: -2, width: 8, height: 8, borderRadius: "50%", background: "#EF4444" }} />
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary"
              style={{
                background: "#2563EB",
                padding: "0.55rem 1.15rem",
                borderRadius: "8px",
                fontWeight: "600",
                fontSize: "0.85rem",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                boxShadow: "0 2px 4px rgba(37, 99, 235, 0.2)"
              }}
            >
              <Icons.Plus size={16} /> New Request
            </button>
          </div>
        </div>

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
        fileInputRef={fileInputRef}
        handleFileUpload={handleFileUpload}
        isUploadingDoc={isUploadingDoc}
        uploadDocError={uploadDocError}
        handleCreateRequest={handleCreateRequest}
      />

      <ExpenseDetailModal
        selectedExpense={selectedExpense}
        currentUser={currentUser}
        onClose={() => { setSelectedExpense(null); setActionComment(""); }}
        actionComment={actionComment}
        setActionComment={setActionComment}
        adjustedAmount={adjustedAmount}
        setAdjustedAmount={setAdjustedAmount}
        paymentRef={paymentRef}
        setPaymentRef={setPaymentRef}
        handleCancelRequest={handleCancelRequest}
        handleExceptionalBudgetAction={handleExceptionalBudgetAction}
        handleWorkflowAction={handleWorkflowAction}
        handleFinanceUpload={handleFinanceUpload}
        handlePaymentRelease={handlePaymentRelease}
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
        isUploadingDoc={isUploadingDoc}
        handleResubmitRequest={handleResubmitRequest}
      />

      <ViewReceiptModal
        isOpen={showReceiptModal}
        onClose={() => { setShowReceiptModal(false); setSelectedReceiptData(null); }}
        selectedReceiptData={selectedReceiptData}
      />

      <PerDiemPolicyModal
        isOpen={showPolicyModal}
        onClose={() => setShowPolicyModal(false)}
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
      />

      {/* SYSTEM ADMIN MODALS */}
      <AdminAddUserModal
        isOpen={showAdminAddUserModal}
        onClose={() => setShowAdminAddUserModal(false)}
        departments={departments}
        onSaveUser={(userData: any) => {
          setSystemUsers([...systemUsers, { id: Date.now().toString(), ...userData, isActive: true }]);
          alert("User successfully invited!");
        }}
      />

      <AdminEditUserProfileModal
        isOpen={showAdminEditUserProfileModal}
        onClose={() => setShowAdminEditUserProfileModal(false)}
        user={selectedAdminUser}
        departments={departments}
        onUpdateUser={(updatedUser: any) => {
          setSystemUsers(systemUsers.map((u: any) => ((u.id || u._id) === (updatedUser.id || updatedUser._id) ? updatedUser : u)));
          alert("User profile updated!");
        }}
        onForceLogOut={() => alert("Session forced closed.")}
      />

      <AdminCreateDepartmentModal
        isOpen={showAdminCreateDeptModal}
        onClose={() => setShowAdminCreateDeptModal(false)}
        onCreateDepartment={(deptData: any) => {
          setDepartments([...departments, { id: Date.now().toString(), ...deptData, utilized: 0, pctUsed: 0, usersCount: 1, isActive: true }]);
          alert("Department created successfully!");
        }}
      />

      <AdminEditDepartmentModal
        isOpen={showAdminEditDeptModal}
        onClose={() => setShowAdminEditDeptModal(false)}
        department={selectedAdminDept}
        onUpdateDepartment={(updatedDept: any) => {
          setDepartments(departments.map((d: any) => ((d.id || d._id) === (updatedDept.id || updatedDept._id) ? updatedDept : d)));
          alert("Department updated!");
        }}
      />

      <AdminDeleteDepartmentModal
        isOpen={showAdminDeleteDeptModal}
        onClose={() => setShowAdminDeleteDeptModal(false)}
        department={selectedAdminDept}
        onConfirmDelete={(deptId: any) => {
          setDepartments(departments.filter((d: any) => (d.id || d._id) !== deptId));
          alert("Department deleted!");
        }}
      />

      <AdminDeleteUserModal
        isOpen={showAdminDeleteUserModal}
        onClose={() => setShowAdminDeleteUserModal(false)}
        user={selectedAdminUser}
        onConfirmDelete={(userId: any) => {
          setSystemUsers(systemUsers.filter((u: any) => (u.id || u._id) !== userId));
          alert("User deleted!");
        }}
      />

      <AdminSuspendUserModal
        isOpen={showAdminSuspendUserModal}
        onClose={() => setShowAdminSuspendUserModal(false)}
        user={selectedAdminUser}
        onConfirmSuspend={(userId: any) => {
          setSystemUsers(systemUsers.map((u: any) => ((u.id || u._id) === userId ? { ...u, isActive: false } : u)));
          alert("User access suspended!");
        }}
      />

      <AdminEditRoleModal
        isOpen={showAdminEditRoleModal}
        onClose={() => setShowAdminEditRoleModal(false)}
        roleData={selectedAdminRole}
        onSaveRole={() => alert("Role configuration updated!")}
        onDeleteRole={() => alert("Role deleted!")}
        onOpenMatrix={() => navTo("/users-roles")}
      />

      <AdminSetBudgetModal
        isOpen={showAdminSetBudgetModal}
        onClose={() => setShowAdminSetBudgetModal(false)}
        departments={departments}
        onSetBudget={() => alert("Department budget updated successfully!")}
      />

      <GlobalAlertDialogModal
        alertDialog={alertDialog}
        onClose={() => setAlertDialog({ isOpen: false, message: "" })}
      />
    </div>
  );
}
