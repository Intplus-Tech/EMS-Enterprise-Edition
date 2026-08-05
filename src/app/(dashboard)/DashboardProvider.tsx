/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { createContext, useContext, useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getAllowedRoutesForRole, getDefaultRouteForRole } from "./roleRoutes";
import { buildNotifications, formatRelativeTime } from "../../domains/notifications/notification.builder";
import { useAdminAdministration } from "./hooks/useAdminAdministration";
import { useExpenseActions } from "./hooks/useExpenseActions";
import { useAttachments } from "./hooks/useAttachments";
import { ExpenseClient } from "../../services/expense.client";
import { AdminClient, InviteInput } from "../../services/admin.client";
import { AuthClient } from "../../services/auth.client";
import { ApiRequestError, toErrorMessage } from "../../services/http";
import { AttachmentInput, InviteResultDto } from "../../types/api";
import type { AttachmentTarget } from "../../components/modals/AttachmentViewModal";
import { WorkflowActionType } from "../../enums/workflowActions";

/**
 * Told to the initiator when a submission is accepted but held: the department
 * has no budget period covering the payment date, so there is nothing to
 * reserve against and no approver to route to yet.
 */
const HELD_FOR_BUDGET_MESSAGE =
  "Request submitted, and on hold: your department has no budget set for that payment date. " +
  "It continues to the approver automatically once an administrator sets one.";

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
    description: "",
    amount: "",
    supportingDocuments: [] as AttachmentInput[],
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
  const [inviteResult, setInviteResult] = useState<InviteResultDto | null>(null);
  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    role: "INITIATOR",
    departmentId: ""
  });
  const [inviteError, setInviteError] = useState("");
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  // The payload behind the invitation currently on screen, so a failed delivery
  // can be retried after the form has been reset.
  const [lastInvitePayload, setLastInvitePayload] = useState<InviteInput | null>(null);
  const [inviteRetrying, setInviteRetrying] = useState(false);

  // Covers both "my account" writes (profile edit, password change). They are
  // never in flight at the same time, so one flag drives both dialogs' buttons.
  const [accountBusy, setAccountBusy] = useState(false);

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
  // Identity re-confirmation for decisions taken from the detail modal. Held
  // here (not in the modal) so it is cleared alongside the rest of the form.
  const [decisionSignature, setDecisionSignature] = useState("");

  // Workflow data (Admin)
  const [workflowSteps, setWorkflowSteps] = useState<any[]>([]);
  const [workflowMessage, setWorkflowMessage] = useState("");

  // Logs data (Admin)
  // Feeds "Recent System Activity" on the admin overview. The Audit Trail screen
  // pages against the database itself (see useAuditTrailLogs) and does not read
  // this snapshot, so no filter state is kept alongside it.
  const [systemLogs, setSystemLogs] = useState<any[]>([]);

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

  /**
   * Uploads files for a form that has no request id yet (New Request, Resubmit).
   * Descriptors are held locally and sent with the request on submit.
   */
  const handleFileUpload = async (files: FileList | File[] | null, isResubmit: boolean = false) => {
    if (!files || files.length === 0) return;
    setIsUploadingDoc(true);
    setUploadDocError("");

    const list = Array.from(files);
    const results = await Promise.allSettled(list.map((file) => ExpenseClient.uploadDocument(file)));

    const uploaded = results
      .filter((r): r is PromiseFulfilledResult<AttachmentInput> => r.status === "fulfilled")
      .map((r) => r.value);

    // Name the files that failed rather than silently attaching a filename that
    // points at nothing — a document that cannot be opened is worse than none.
    const failures = results
      .map((r, i) => (r.status === "rejected" ? list[i].name : null))
      .filter(Boolean);
    if (failures.length > 0) {
      setUploadDocError(
        `Could not upload: ${failures.join(", ")}. ${
          results[0].status === "rejected" && results[0].reason instanceof Error
            ? results[0].reason.message
            : "Please try again."
        }`
      );
    }

    if (uploaded.length > 0) {
      const merge = (prev: AttachmentInput[]) => {
        const seen = new Set(prev.map((a) => a.url));
        return [...prev, ...uploaded.filter((a) => !seen.has(a.url))];
      };

      if (isResubmit) {
        setResubmitForm((prev: any) => ({
          ...prev,
          supportingDocuments: merge(prev.supportingDocuments ?? []),
        }));
      } else {
        setNewRequest((prev) => ({ ...prev, supportingDocuments: merge(prev.supportingDocuments) }));
      }
    }

    setIsUploadingDoc(false);
  };

  /** Drops a not-yet-submitted upload from the New Request / Resubmit form. */
  const removeDraftAttachment = useCallback((url: string, isResubmit = false) => {
    const filter = (prev: AttachmentInput[]) => prev.filter((a) => a.url !== url);
    if (isResubmit) {
      setResubmitForm((prev: any) => ({
        ...prev,
        supportingDocuments: filter(prev.supportingDocuments ?? []),
      }));
    } else {
      setNewRequest((prev) => ({ ...prev, supportingDocuments: filter(prev.supportingDocuments) }));
    }
  }, []);

  // Notifications are derived from real expense workflow history; only the
  // read/dismissed state is stored, and it now lives on the user record so it
  // is shared across devices rather than trapped in one browser.
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<string[]>([]);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);

  // Seed from local storage for an instant paint, then reconcile with the
  // server so the state follows the user to another device.
  useEffect(() => {
    setDismissedNotificationIds(readStoredIds(DISMISSED_NOTIFICATIONS_KEY));
    setReadNotificationIds(readStoredIds(READ_NOTIFICATIONS_KEY));
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;

    AuthClient.notificationState()
      .then(({ readIds, dismissedIds }) => {
        if (cancelled) return;
        // Union, so ids marked locally before the fetch resolved are not lost.
        setReadNotificationIds((prev) => Array.from(new Set([...prev, ...readIds])));
        setDismissedNotificationIds((prev) => Array.from(new Set([...prev, ...dismissedIds])));
      })
      .catch(() => {
        // Offline or unauthorised — local storage remains the source of truth.
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser]);

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
      // Fire-and-forget: the local write already keeps this device correct, so
      // a failed sync must not block dismissing the notification.
      AuthClient.saveNotificationState({ dismissedIds: [id] }).catch(() => {});
      return next;
    });
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    const ids = notifications.map((n) => n.id);
    setReadNotificationIds((prev) => {
      const next = Array.from(new Set([...prev, ...ids]));
      writeStoredIds(READ_NOTIFICATIONS_KEY, next);
      return next;
    });
    if (ids.length > 0) {
      AuthClient.saveNotificationState({ readIds: ids }).catch(() => {});
    }
  }, [notifications]);

  const [showNotifications, setShowNotifications] = useState(false);
  const [showResubmitModal, setShowResubmitModal] = useState(false);
  const [selectedResubmitExpense, setSelectedResubmitExpense] = useState<any>(null);
  // `notifyAuditor` was a checkbox nothing ever read on submit, so it is gone
  // rather than continuing to promise a Slack notification that never fired.
  const [resubmitForm, setResubmitForm] = useState({
    justification: "",
    supportingDocuments: [] as AttachmentInput[],
  });
  // Attachment currently open in the document viewer (designs/initiator/Attachment View - Modal).
  const [viewedAttachment, setViewedAttachment] = useState<AttachmentTarget | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceiptData, setSelectedReceiptData] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [amountSearchQuery, setAmountSearchQuery] = useState("");
  // Date controls on the Requests screen (design: "Today" toggle + date picker).
  const [requestsTodayOnly, setRequestsTodayOnly] = useState(false);
  const [requestsDateFilter, setRequestsDateFilter] = useState("");
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

  // Feeds the Logs tab's scrolling list. The Audit Trail screen does not read
  // this — it pages against the database through `useAuditTrailLogs`.
  const loadLogs = async (filter: string) => {
    try {
      const { logs } = await AdminClient.listLogs({ type: filter });
      setSystemLogs(logs);
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
      // Kept so "Retry sending" can re-issue the same invitation; the form
      // itself is cleared below, so it can no longer supply these values.
      setLastInvitePayload(inviteForm);
      setInviteForm({ name: "", email: "", role: "INITIATOR", departmentId: "" });
      admin.loadUsers();
    } catch (err) {
      setInviteError(toErrorMessage(err, "Failed to invite user"));
    } finally {
      setInviteSubmitting(false);
    }
  };

  /**
   * Invites from the admin "Add User" screen and raises the result dialog when
   * there is something to act on.
   *
   * A clean send is already reported by the notice banner, so the dialog is
   * reserved for the cases that need a decision: delivery failed (retry), or no
   * provider is configured (copy the link and send it yourself).
   */
  const inviteAndReport = async (payload: InviteInput) => {
    const result = await admin.inviteUser(payload);
    if (result) {
      setLastInvitePayload(payload);
      if (!result.emailSent || result.emailSimulated) setInviteResult(result);
    }
    return result;
  };

  /**
   * Re-issues the last invitation after a failed delivery.
   *
   * Re-posting the same email inside the invite window takes the route's
   * re-invite branch: a new token is generated and the mail is sent again. The
   * result replaces what the dialog is showing, so a second failure reports the
   * new reason rather than the stale one, and a success flips it to "sent".
   */
  const retryInvite = async () => {
    if (!lastInvitePayload) return;
    setInviteRetrying(true);
    try {
      const result = await admin.inviteUser(lastInvitePayload);
      if (result) setInviteResult(result);
    } finally {
      setInviteRetrying(false);
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

    if (newRequest.supportingDocuments.length === 0) {
      setFormError("At least one supporting document is mandatory. Please upload a file.");
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
      // No `category`: the initiator does not classify their own spend, so the
      // server applies the default. Resubmission (below) still sends the stored
      // value, since that request already has one.
      const created = await ExpenseClient.create({
        description: newRequest.description,
        amount: Number(newRequest.amount),
        supportingDocuments: newRequest.supportingDocuments,
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
          const { request: submitted } = await ExpenseClient.submit(created._id);
          // A request whose department has no budget period for that payment
          // date is accepted but held, not routed. Saying nothing would leave
          // the initiator watching a request that never reaches an approver.
          if (submitted?.awaitingBudgetPeriod) {
            notifySuccess(HELD_FOR_BUDGET_MESSAGE);
          }
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
        // Only send documents when the initiator actually attached new ones;
        // an empty array leaves the existing set untouched.
        supportingDocuments:
          resubmitForm.supportingDocuments.length > 0
            ? resubmitForm.supportingDocuments
            : (selectedResubmitExpense.attachments ?? []).map((a: AttachmentInput) => ({
                name: a.name,
                url: a.url,
                publicId: a.publicId,
                size: a.size,
                mimeType: a.mimeType,
              })),
        vendorName: selectedResubmitExpense.vendorName,
        vendorBankDetails: selectedResubmitExpense.vendorBankDetails,
        requiredPaymentDate: selectedResubmitExpense.requiredPaymentDate,
      });
      const { request: resubmitted } = await ExpenseClient.submit(selectedResubmitExpense._id);

      setShowResubmitModal(false);
      setSelectedResubmitExpense(null);
      setResubmitForm({ justification: "", supportingDocuments: [] });
      loadDashboardData(currentUser);
      notifySuccess(
        resubmitted?.awaitingBudgetPeriod
          ? HELD_FOR_BUDGET_MESSAGE
          : "Request updated and resubmitted."
      );
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

    setAccountBusy(true);
    try {
      await AuthClient.changePassword(settingsForm.currentPassword, settingsForm.newPassword);
      setSettingsMessage("Password successfully updated!");
      setSettingsForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setSettingsError(toErrorMessage(err, "Failed to update password."));
    } finally {
      setAccountBusy(false);
    }
  };

  /**
   * Persists the profile form.
   *
   * `override` exists for callers that compute the payload themselves — the
   * Settings screen's "Save Update" button sets the staged form and submits in
   * the same click, so reading `editProfileForm` here saw the *previous* render's
   * value: on a fresh session that is the blank initial form, and the request
   * cleared the account's name and email.
   */
  const handleUpdateProfile = async (
    e: React.FormEvent | null,
    override?: Partial<typeof editProfileForm>
  ) => {
    if (e) e.preventDefault();
    const form = { ...editProfileForm, ...override };

    // Blank identity fields are never a legitimate edit; the server rejects them
    // too, but failing here keeps the message specific to the field at fault.
    if (!form.name?.trim() || !form.email?.trim()) {
      notifyError("Name and email address are both required.");
      return;
    }

    setAccountBusy(true);
    try {
      const user = await AuthClient.updateProfile({
        name: form.name,
        email: form.email,
        officialContact: form.officialContact,
        personalContact: form.personalContact,
        avatar: form.avatar,
      });
      setCurrentUser({ ...currentUser, ...user });
      setShowEditProfileModal(false);
      setShowUpdatePhotoModal(false);
      notifySuccess("Profile updated.");
    } catch (err) {
      notifyError(toErrorMessage(err, "Failed to update profile."));
    } finally {
      setAccountBusy(false);
    }
  };

  // Finance Head exceptional approval (from the request detail modal)
  const handleExceptionalBudgetAction = async (id: string, action: WorkflowActionType) => {
    try {
      await ExpenseClient.exceptionalAction(id, action, actionComment, decisionSignature, adjustedAmount);
      setSelectedExpense(null);
      setActionComment("");
      setAdjustedAmount(0);
      setDecisionSignature("");
      loadDashboardData(currentUser);
      notifySuccess("Decision recorded.");
    } catch (err) {
      notifyError(toErrorMessage(err));
    }
  };

  // Approver decision (from the request detail modal)
  const handleWorkflowAction = async (id: string, action: WorkflowActionType) => {
    try {
      await ExpenseClient.workflowAction(id, action, actionComment, decisionSignature);
      setSelectedExpense(null);
      setActionComment("");
      setDecisionSignature("");
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
      await ExpenseClient.releasePayment(id, paymentRef, decisionSignature);
      setSelectedExpense(null);
      setPaymentRef("");
      setDecisionSignature("");
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

  // Add/remove documents on a saved request. Refreshes the dashboard so the
  // open detail panel reflects the new document set immediately.
  const attachments = useAttachments({
    onChanged: () => loadDashboardData(currentUser),
    onSuccess: notifySuccess,
    onError: notifyError,
  });

  const addAttachments = useCallback(
    (requestId: string, files: FileList | File[]) => attachments.addFiles(requestId, files),
    [attachments]
  );
  const removeAttachment = useCallback(
    (requestId: string, attachmentId: string) => attachments.removeAttachment(requestId, attachmentId),
    [attachments]
  );

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
    inviteAndReport, retryInvite, inviteRetrying,
    inviteForm, setInviteForm,
    inviteError, setInviteError,
    inviteSubmitting, setInviteSubmitting,
    accountBusy,
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
    decisionSignature, setDecisionSignature,
    workflowSteps, setWorkflowSteps,
    workflowMessage, setWorkflowMessage,
    systemLogs, setSystemLogs,
    metrics, setMetrics,
    showCreateModal, setShowCreateModal,
    newRequest, setNewRequest,
    formError, setFormError,
    fileInputRef,
    resubmitFileInputRef,
    isUploadingDoc, setIsUploadingDoc,
    uploadDocError, setUploadDocError,
    handleFileUpload,
    removeDraftAttachment,
    notifications,
    unreadNotificationCount,
    dismissNotification,
    markAllNotificationsRead,
    showNotifications, setShowNotifications,
    showResubmitModal, setShowResubmitModal,
    selectedResubmitExpense, setSelectedResubmitExpense,
    resubmitForm, setResubmitForm,
    viewedAttachment, setViewedAttachment,
    showReceiptModal, setShowReceiptModal,
    selectedReceiptData, setSelectedReceiptData,
    searchQuery, setSearchQuery,
    amountSearchQuery, setAmountSearchQuery,
    requestsTodayOnly, setRequestsTodayOnly,
    requestsDateFilter, setRequestsDateFilter,
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
    addAttachments,
    removeAttachment,
    attachmentsUploading: attachments.uploading,
    expenseActions,
    fetchSession,
    loadDashboardData,
    loadLogs,
    handleInviteUser,
    handleLogout,
    handleCreateRequest,
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
