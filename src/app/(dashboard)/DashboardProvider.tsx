/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { createContext, useContext, useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getAllowedRoutesForRole, getDefaultRouteForRole } from "./roleRoutes";
import { buildNotifications, formatRelativeTime } from "../../domains/notifications/notification.builder";
import { useAdminAdministration } from "./hooks/useAdminAdministration";
import { useExpenseActions } from "./hooks/useExpenseActions";
import { ExpenseClient } from "../../services/expense.client";
import { AdminClient } from "../../services/admin.client";
import { AuthClient } from "../../services/auth.client";
import { ApiRequestError, toErrorMessage } from "../../services/http";
import { DEFAULT_EXPENSE_CATEGORY } from "../../enums/expenseCategories";
import { WorkflowActionType } from "../../enums/workflowActions";

const DISMISSED_NOTIFICATIONS_KEY = "ems.notifications.dismissed";
const READ_NOTIFICATIONS_KEY = "ems.notifications.read";

function readStoredIds(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Blank New Request form. Extracted so create and reset cannot drift apart. */
function emptyRequestForm() {
  return {
    category: DEFAULT_EXPENSE_CATEGORY as string,
    currency: "NGN",
    description: "",
    amount: "",
    supportingDocument: "",
    supportingDocuments: [] as string[],
    vendorName: "",
    accountNumber: "",
    bankName: "",
    accountName: "",
    // Default the payment date a week out, matching designs/initiator/New Request.png.
    requiredPaymentDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString().split("T")[0],
  };
}

function writeStoredIds(key: string, ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    // Storage unavailable (private mode / quota) - state stays in memory only.
  }
}

/**
 * Builds every value the dashboard exposes. Kept as a hook (rather than inlined
 * in the provider) so `DashboardContextValue` can be *inferred* from it — the
 * context was previously typed `any`, which erased type safety for all ~90
 * values at every consuming component.
 */
function useDashboardState() {
  const router = useRouter();
  const pathname = usePathname();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [startupError, setStartupError] = useState("");
  const [seeding, setSeeding] = useState(false);

  // Toast-style feedback for admin mutations. Replaces the `alert()` calls the
  // admin modals used to fire, which reported success even when nothing saved.
  const [adminNotice, setAdminNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const notifySuccess = useCallback((message: string) => {
    setAdminNotice({ tone: "success", message });
  }, []);
  const notifyError = useCallback((message: string) => {
    setAdminNotice({ tone: "error", message });
  }, []);

  // Users, departments, budgets and role permissions (Admin) — all persisted.
  const admin = useAdminAdministration({ onSuccess: notifySuccess, onError: notifyError });
  const { systemUsers, departments } = admin;

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteResult, setInviteResult] = useState<any>(null);
  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    role: "INITIATOR",
    departmentId: ""
  });
  const [inviteError, setInviteError] = useState("");
  const [inviteSubmitting, setInviteSubmitting] = useState(false);

  // System Admin Modal States
  const [showAdminAddUserModal, setShowAdminAddUserModal] = useState(false);
  const [showAdminEditUserProfileModal, setShowAdminEditUserProfileModal] = useState(false);
  const [selectedAdminUser, setSelectedAdminUser] = useState<any>(null);
  const [showAdminCreateDeptModal, setShowAdminCreateDeptModal] = useState(false);
  const [showAdminEditDeptModal, setShowAdminEditDeptModal] = useState(false);
  const [selectedAdminDept, setSelectedAdminDept] = useState<any>(null);
  const [showAdminDeleteDeptModal, setShowAdminDeleteDeptModal] = useState(false);
  const [showAdminDeleteUserModal, setShowAdminDeleteUserModal] = useState(false);
  const [showAdminSuspendUserModal, setShowAdminSuspendUserModal] = useState(false);
  const [showAdminEditRoleModal, setShowAdminEditRoleModal] = useState(false);
  const [selectedAdminRole, setSelectedAdminRole] = useState<any>(null);
  const [showAdminSetBudgetModal, setShowAdminSetBudgetModal] = useState(false);

  // Expenses data
  const [expenses, setExpenses] = useState<any[]>([]);
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [actionComment, setActionComment] = useState("");
  const [adjustedAmount, setAdjustedAmount] = useState<number>(0);
  const [paymentRef, setPaymentRef] = useState("");

  // Workflow data (Admin)
  const [workflowSteps, setWorkflowSteps] = useState<any[]>([]);
  const [workflowMessage, setWorkflowMessage] = useState("");

  // Logs data (Admin)
  const [systemLogs, setSystemLogs] = useState<any[]>([]);
  const [logFilter, setLogFilter] = useState("ALL"); // ALL, AUDIT, EXCEPTION, APP

  // Dashboard metrics
  const [metrics, setMetrics] = useState<any>(null);

  // New request form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRequest, setNewRequest] = useState(emptyRequestForm);
  const [formError, setFormError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const resubmitFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [uploadDocError, setUploadDocError] = useState("");

  const handleFileUpload = async (files: FileList | File[] | null, isResubmit: boolean = false) => {
    if (!files || files.length === 0) return;
    setIsUploadingDoc(true);
    setUploadDocError("");

    // Uploads run in parallel; ExpenseClient falls back to the local filename
    // so a storage outage does not block the form.
    const newDocs = await Promise.all(
      Array.from(files).map(async (file) => {
        try {
          return await ExpenseClient.uploadDocument(file);
        } catch (err) {
          console.warn("Background upload error, falling back to filename", err);
          return file.name;
        }
      })
    );

    if (isResubmit) {
      if (newDocs.length > 0) {
        setResubmitForm((prev: any) => ({
          ...prev,
          supportingDocument: newDocs[0],
        }));
      }
    } else {
      setNewRequest((prev) => {
        const updatedDocs = [...prev.supportingDocuments, ...newDocs];
        return {
          ...prev,
          supportingDocuments: updatedDocs,
          supportingDocument: updatedDocs[0] || "",
        };
      });
    }

    setIsUploadingDoc(false);
  };

  // Notifications are derived from real expense workflow history. Read/dismissed
  // state is per-browser because there is no notification collection server-side.
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<string[]>([]);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);

  useEffect(() => {
    setDismissedNotificationIds(readStoredIds(DISMISSED_NOTIFICATIONS_KEY));
    setReadNotificationIds(readStoredIds(READ_NOTIFICATIONS_KEY));
  }, []);

  const notifications = useMemo(() => {
    return buildNotifications(expenses, currentUser)
      .filter((n) => !dismissedNotificationIds.includes(n.id))
      .map((n) => ({
        ...n,
        time: formatRelativeTime(n.timestamp),
        read: readNotificationIds.includes(n.id),
      }));
  }, [expenses, currentUser, dismissedNotificationIds, readNotificationIds]);

  const unreadNotificationCount = notifications.filter((n) => !n.read).length;

  const dismissNotification = useCallback((id: string) => {
    setDismissedNotificationIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      writeStoredIds(DISMISSED_NOTIFICATIONS_KEY, next);
      return next;
    });
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setReadNotificationIds((prev) => {
      const next = Array.from(new Set([...prev, ...notifications.map((n) => n.id)]));
      writeStoredIds(READ_NOTIFICATIONS_KEY, next);
      return next;
    });
  }, [notifications]);

  const [showNotifications, setShowNotifications] = useState(false);
  const [showResubmitModal, setShowResubmitModal] = useState(false);
  const [selectedResubmitExpense, setSelectedResubmitExpense] = useState<any>(null);
  const [resubmitForm, setResubmitForm] = useState({
    justification: "",
    supportingDocument: "hotel_invoice_final_paid.pdf",
    notifyAuditor: true
  });
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceiptData, setSelectedReceiptData] = useState<any>(null);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [amountSearchQuery, setAmountSearchQuery] = useState("");
  const [chartViewMode, setChartViewMode] = useState<"daily" | "monthly">("monthly");
  const [approvalDateFilter, setApprovalDateFilter] = useState<"all" | "today">("all");
  const [approvalDatePicker, setApprovalDatePicker] = useState<string>("");
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState("ALL");
  const [settingsForm, setSettingsForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [settingsMessage, setSettingsMessage] = useState("");
  const [settingsError, setSettingsError] = useState("");

  // Approver states
  const [requestsSubTab, setRequestsSubTab] = useState<"my-requests" | "dept-requests">("my-requests");
  const [deptFilterInitiator, setDeptFilterInitiator] = useState("ALL");
  const [deptFilterStatus, setDeptFilterStatus] = useState("ALL");
  const [deptRowsPerPage, setDeptRowsPerPage] = useState(10);
  const [deptPage, setDeptPage] = useState(1);

  // History tab sub-states & filters
  const [historyFilterCategory, setHistoryFilterCategory] = useState("ALL");
  const [historyFilterStatus, setHistoryFilterStatus] = useState("ALL");
  const [historySubTab, setHistorySubTab] = useState<"all" | "approved" | "rejected">("all");
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showUpdatePhotoModal, setShowUpdatePhotoModal] = useState(false);
  const [editProfileForm, setEditProfileForm] = useState({
    name: "",
    email: "",
    officialContact: "",
    personalContact: "",
    avatar: ""
  });
  const [showPasswordCurrentToggle, setShowPasswordCurrentToggle] = useState(false);
  const [showPasswordNewToggle, setShowPasswordNewToggle] = useState(false);

  // Theme switcher state
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "dark" | "light" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    } else {
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
  };

  // Global Alert Dialog Interceptor State
  const [alertDialog, setAlertDialog] = useState<{ isOpen: boolean; message: string }>({ isOpen: false, message: "" });

  useEffect(() => {
    const originalAlert = window.alert;
    window.alert = (msg: any) => {
      setAlertDialog({ isOpen: true, message: String(msg) });
    };
    return () => {
      window.alert = originalAlert;
    };
  }, []);

  // Initialize and check me
  useEffect(() => {
    fetchSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Client-side Role-based Navigation Guard.
  // Redirects to the role's default route only when the current path is not permitted.
  useEffect(() => {
    if (!currentUser) return;
    const allowed = getAllowedRoutesForRole(currentUser.role);
    if (!allowed.includes(pathname)) {
      router.replace(getDefaultRouteForRole(currentUser.role));
    }
  }, [currentUser, pathname, router]);

  const fetchSession = async () => {
    try {
      const user = await AuthClient.me();
      setCurrentUser(user);
      loadDashboardData(user);
    } catch (e) {
      // 401 is the normal signed-out path, not a startup failure.
      if (e instanceof ApiRequestError && e.status === 401) {
        router.push("/login");
        return;
      }
      console.error(e);
      setStartupError(
        "Database connection failed. Please ensure MONGODB_URI is correctly configured in your Vercel Project Settings and whitelisted (0.0.0.0/0) in your MongoDB Atlas cluster."
      );
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async (user: any) => {
    try {
      setExpenses(await ExpenseClient.list());
    } catch (e) {
      console.error("Error loading expenses:", e);
    }

    // Analytics stats — finance roles and admin only.
    if (["ADMIN", "FINANCE_HEAD", "FINANCE_OFFICER", "FINANCE_MANAGER"].includes(user.role)) {
      try {
        setMetrics(await AuthClient.stats());
      } catch (e) {
        console.error("Error loading stats:", e);
      }
    }

    if (["ADMIN", "FINANCE_HEAD", "FINANCE_OFFICER", "FINANCE_MANAGER", "APPROVER"].includes(user.role)) {
      loadLogs("ALL");
    }

    // Users, departments, budgets and the role matrix.
    admin.loadAdminData(user.role);

    if (user.role === "ADMIN") {
      try {
        setWorkflowSteps(await AdminClient.getWorkflow());
      } catch (e) {
        console.error("Error loading workflow config:", e);
      }
    }
  };

  const loadLogs = async (filter: string) => {
    try {
      setSystemLogs(await AdminClient.listLogs(filter));
    } catch (e) {
      console.error("Error loading logs:", e);
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError("");
    setInviteSubmitting(true);
    try {
      const result = await AdminClient.inviteUser(inviteForm);
      setInviteResult(result);
      setInviteForm({ name: "", email: "", role: "INITIATOR", departmentId: "" });
      admin.loadUsers();
    } catch (err) {
      setInviteError(toErrorMessage(err, "Failed to invite user"));
    } finally {
      setInviteSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await AuthClient.logout();
    } catch (e) {
      // Navigate away regardless — a failed logout call must not strand the
      // user in an authenticated-looking shell.
      console.error("Logout failed:", e);
    } finally {
      router.push("/login");
      router.refresh();
    }
  };

  // Submit new request (Save Draft or Submit directly)
  const handleCreateRequest = async (e: React.FormEvent, shouldSubmit: boolean = false) => {
    if (e) e.preventDefault();
    setFormError("");

    if (!newRequest.description || !newRequest.amount || !newRequest.vendorName) {
      setFormError("All required text fields must be filled.");
      return;
    }

    if (!newRequest.supportingDocument) {
      setFormError("Supporting document attachment is mandatory. Please select or upload a file.");
      return;
    }

    // Vendor bank details used to fall back to placeholder values ("1234567890",
    // "Corporate Bank Plc") when left blank, which would have sent a real payment
    // instruction to a fabricated account. They are now required.
    if (!newRequest.accountNumber || !newRequest.bankName) {
      setFormError("Vendor bank name and account number are required to raise a payment request.");
      return;
    }

    try {
      const created = await ExpenseClient.create({
        category: newRequest.category,
        description: newRequest.description,
        amount: Number(newRequest.amount),
        supportingDocument: newRequest.supportingDocument,
        vendorName: newRequest.vendorName,
        vendorBankDetails: {
          accountNumber: newRequest.accountNumber,
          bankName: newRequest.bankName,
          accountName: newRequest.accountName || newRequest.vendorName,
        },
        requiredPaymentDate: newRequest.requiredPaymentDate,
      });

      if (shouldSubmit) {
        try {
          await ExpenseClient.submit(created._id);
        } catch (submitError) {
          // The draft did save, so say so rather than implying nothing happened.
          setFormError(`Draft saved, but failed to submit: ${toErrorMessage(submitError)}`);
          loadDashboardData(currentUser);
          return;
        }
      }

      setShowCreateModal(false);
      setNewRequest(emptyRequestForm());
      loadDashboardData(currentUser);
    } catch (err) {
      setFormError(toErrorMessage(err, "Failed to create request"));
    }
  };

  // Initiator submits a draft request
  const handleSubmitRequest = async (id: string) => {
    try {
      await ExpenseClient.submit(id);
      setSelectedExpense(null);
      loadDashboardData(currentUser);
      notifySuccess("Request submitted for approval.");
    } catch (err) {
      notifyError(toErrorMessage(err));
    }
  };

  // Initiator updates and resubmits a returned request
  const handleResubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!selectedResubmitExpense) return;

    try {
      // Update the details, then re-enter the workflow. Both must succeed for
      // the resubmission to count, so they share one try block.
      await ExpenseClient.update(selectedResubmitExpense._id, {
        category: selectedResubmitExpense.category,
        description: resubmitForm.justification || selectedResubmitExpense.description,
        amount: Number(selectedResubmitExpense.amount),
        supportingDocument: resubmitForm.supportingDocument,
        vendorName: selectedResubmitExpense.vendorName,
        vendorBankDetails: selectedResubmitExpense.vendorBankDetails,
        requiredPaymentDate: selectedResubmitExpense.requiredPaymentDate,
      });
      await ExpenseClient.submit(selectedResubmitExpense._id);

      setShowResubmitModal(false);
      setSelectedResubmitExpense(null);
      setResubmitForm({ justification: "", supportingDocument: "", notifyAuditor: true });
      loadDashboardData(currentUser);
      notifySuccess("Request updated and resubmitted.");
    } catch (err) {
      setFormError(toErrorMessage(err, "Failed to resubmit request."));
    }
  };

  // Initiator withdraws / cancels a request
  const handleCancelRequest = async (id: string) => {
    const confirmWithdraw = window.confirm(
      "Are you sure you want to withdraw this request? This will release any locked budget funds."
    );
    if (!confirmWithdraw) return;

    try {
      await ExpenseClient.cancel(id);
      setSelectedExpense(null);
      loadDashboardData(currentUser);
      notifySuccess("Request successfully withdrawn.");
    } catch (err) {
      notifyError(toErrorMessage(err, "Failed to withdraw request."));
    }
  };

  // User changes password in Settings tab
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsError("");
    setSettingsMessage("");

    if (settingsForm.newPassword !== settingsForm.confirmPassword) {
      setSettingsError("New passwords do not match.");
      return;
    }

    try {
      await AuthClient.changePassword(settingsForm.currentPassword, settingsForm.newPassword);
      setSettingsMessage("Password successfully updated!");
      setSettingsForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setSettingsError(toErrorMessage(err, "Failed to update password."));
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      const user = await AuthClient.updateProfile({
        name: editProfileForm.name,
        email: editProfileForm.email,
        officialContact: editProfileForm.officialContact,
        personalContact: editProfileForm.personalContact,
        avatar: editProfileForm.avatar,
      });
      setCurrentUser({ ...currentUser, ...user });
      setShowEditProfileModal(false);
      setShowUpdatePhotoModal(false);
      notifySuccess("Profile updated.");
    } catch (err) {
      notifyError(toErrorMessage(err, "Failed to update profile."));
    }
  };

  // Finance Head exceptional approval (from the request detail modal)
  const handleExceptionalBudgetAction = async (id: string, action: WorkflowActionType) => {
    try {
      await ExpenseClient.exceptionalAction(id, action, actionComment, adjustedAmount);
      setSelectedExpense(null);
      setActionComment("");
      setAdjustedAmount(0);
      loadDashboardData(currentUser);
      notifySuccess("Decision recorded.");
    } catch (err) {
      notifyError(toErrorMessage(err));
    }
  };

  // Approver decision (from the request detail modal)
  const handleWorkflowAction = async (id: string, action: WorkflowActionType) => {
    try {
      await ExpenseClient.workflowAction(id, action, actionComment);
      setSelectedExpense(null);
      setActionComment("");
      loadDashboardData(currentUser);
      notifySuccess("Decision recorded.");
    } catch (err) {
      notifyError(toErrorMessage(err));
    }
  };

  // Finance Officer verify and upload
  const handleFinanceUpload = async (id: string) => {
    try {
      await ExpenseClient.financeUpload(id);
      setSelectedExpense(null);
      loadDashboardData(currentUser);
      notifySuccess("Instruction uploaded to the bank platform.");
    } catch (err) {
      notifyError(toErrorMessage(err));
    }
  };

  // Finance Manager release payment
  const handlePaymentRelease = async (id: string) => {
    if (!paymentRef) {
      notifyError("A payment transaction reference is required to release cash.");
      return;
    }
    try {
      await ExpenseClient.releasePayment(id, paymentRef);
      setSelectedExpense(null);
      setPaymentRef("");
      loadDashboardData(currentUser);
      notifySuccess(`Payment released. Reference: ${paymentRef}`);
    } catch (err) {
      notifyError(toErrorMessage(err));
    }
  };

  // Admin dynamic workflow update
  const handleSaveWorkflowConfig = async () => {
    setWorkflowMessage("");
    try {
      setWorkflowSteps(await AdminClient.saveWorkflow(workflowSteps));
      setWorkflowMessage("Workflow steps configuration updated successfully!");
      loadDashboardData(currentUser);
    } catch (err) {
      setWorkflowMessage(`Error: ${toErrorMessage(err)}`);
    }
  };

  const moveWorkflowStep = (index: number, direction: "UP" | "DOWN") => {
    const steps = [...workflowSteps];
    const targetIndex = direction === "UP" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= steps.length) return;

    // Swap steps
    const temp = steps[index];
    steps[index] = steps[targetIndex];
    steps[targetIndex] = temp;

    // Reassign stepIndex sequentially
    steps.forEach((s, idx) => {
      s.stepIndex = idx;
    });

    setWorkflowSteps(steps);
  };

  const handleStepDetailChange = (index: number, field: string, value: any) => {
    const steps = [...workflowSteps];
    steps[index] = { ...steps[index], [field]: value };
    setWorkflowSteps(steps);
  };

  // Workflow actions shared by every approval surface. Injected into the tabs as
  // props so those components stay presentational (engineering rule 1-D).
  const expenseActions = useExpenseActions({
    currentUser,
    reload: () => loadDashboardData(currentUser),
    onSuccess: notifySuccess,
    onError: notifyError,
  });

  const value = {
    router,
    pathname,
    currentUser, setCurrentUser,
    loading, setLoading,
    startupError, setStartupError,
    seeding, setSeeding,
    // Admin datasets + persisted mutations (see useAdminAdministration).
    ...admin,
    adminNotice, setAdminNotice,
    showInviteModal, setShowInviteModal,
    inviteResult, setInviteResult,
    inviteForm, setInviteForm,
    inviteError, setInviteError,
    inviteSubmitting, setInviteSubmitting,
    showAdminAddUserModal, setShowAdminAddUserModal,
    showAdminEditUserProfileModal, setShowAdminEditUserProfileModal,
    selectedAdminUser, setSelectedAdminUser,
    showAdminCreateDeptModal, setShowAdminCreateDeptModal,
    showAdminEditDeptModal, setShowAdminEditDeptModal,
    selectedAdminDept, setSelectedAdminDept,
    showAdminDeleteDeptModal, setShowAdminDeleteDeptModal,
    showAdminDeleteUserModal, setShowAdminDeleteUserModal,
    showAdminSuspendUserModal, setShowAdminSuspendUserModal,
    showAdminEditRoleModal, setShowAdminEditRoleModal,
    selectedAdminRole, setSelectedAdminRole,
    showAdminSetBudgetModal, setShowAdminSetBudgetModal,
    expenses, setExpenses,
    selectedExpense, setSelectedExpense,
    actionComment, setActionComment,
    adjustedAmount, setAdjustedAmount,
    paymentRef, setPaymentRef,
    workflowSteps, setWorkflowSteps,
    workflowMessage, setWorkflowMessage,
    systemLogs, setSystemLogs,
    logFilter, setLogFilter,
    metrics, setMetrics,
    showCreateModal, setShowCreateModal,
    newRequest, setNewRequest,
    formError, setFormError,
    fileInputRef,
    resubmitFileInputRef,
    isUploadingDoc, setIsUploadingDoc,
    uploadDocError, setUploadDocError,
    handleFileUpload,
    notifications,
    unreadNotificationCount,
    dismissNotification,
    markAllNotificationsRead,
    showNotifications, setShowNotifications,
    showResubmitModal, setShowResubmitModal,
    selectedResubmitExpense, setSelectedResubmitExpense,
    resubmitForm, setResubmitForm,
    showReceiptModal, setShowReceiptModal,
    selectedReceiptData, setSelectedReceiptData,
    showPolicyModal, setShowPolicyModal,
    searchQuery, setSearchQuery,
    amountSearchQuery, setAmountSearchQuery,
    chartViewMode, setChartViewMode,
    approvalDateFilter, setApprovalDateFilter,
    approvalDatePicker, setApprovalDatePicker,
    historySearchQuery, setHistorySearchQuery,
    historyStatusFilter, setHistoryStatusFilter,
    settingsForm, setSettingsForm,
    settingsMessage, setSettingsMessage,
    settingsError, setSettingsError,
    requestsSubTab, setRequestsSubTab,
    deptFilterInitiator, setDeptFilterInitiator,
    deptFilterStatus, setDeptFilterStatus,
    deptRowsPerPage, setDeptRowsPerPage,
    deptPage, setDeptPage,
    historyFilterCategory, setHistoryFilterCategory,
    historyFilterStatus, setHistoryFilterStatus,
    historySubTab, setHistorySubTab,
    showChangePasswordModal, setShowChangePasswordModal,
    showEditProfileModal, setShowEditProfileModal,
    showUpdatePhotoModal, setShowUpdatePhotoModal,
    editProfileForm, setEditProfileForm,
    showPasswordCurrentToggle, setShowPasswordCurrentToggle,
    showPasswordNewToggle, setShowPasswordNewToggle,
    theme, setTheme, toggleTheme,
    alertDialog, setAlertDialog,
    expenseActions,
    fetchSession,
    loadDashboardData,
    loadLogs,
    handleInviteUser,
    handleLogout,
    handleCreateRequest,
    handleSubmitRequest,
    handleResubmitRequest,
    handleCancelRequest,
    handleChangePassword,
    handleUpdateProfile,
    handleExceptionalBudgetAction,
    handleWorkflowAction,
    handleFinanceUpload,
    handlePaymentRelease,
    handleSaveWorkflowConfig,
    moveWorkflowStep,
    handleStepDetailChange,
  };

  return value;
}

/** Everything the dashboard exposes, inferred from the state hook above. */
export type DashboardContextValue = ReturnType<typeof useDashboardState>;

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function useDashboard(): DashboardContextValue {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return ctx;
}

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const value = useDashboardState();

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}
