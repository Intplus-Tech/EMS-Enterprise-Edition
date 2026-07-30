/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getAllowedRoutesForRole, getDefaultRouteForRole } from "./roleRoutes";

const DashboardContext = createContext<any>(null);

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return ctx;
}

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [startupError, setStartupError] = useState("");
  const [seeding, setSeeding] = useState(false);

  // Users and departments (Admin)
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
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
  const [newRequest, setNewRequest] = useState({
    category: "Travel",
    currency: "NGN",
    description: "",
    amount: "",
    supportingDocument: "",
    supportingDocuments: [] as string[],
    vendorName: "",
    accountNumber: "",
    bankName: "",
    accountName: "",
    requiredPaymentDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString().split('T')[0], // 7 days from now
  });
  const [formError, setFormError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const resubmitFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [uploadDocError, setUploadDocError] = useState("");

  const handleFileUpload = async (files: FileList | File[] | null, isResubmit: boolean = false) => {
    if (!files || files.length === 0) return;
    setIsUploadingDoc(true);
    setUploadDocError("");

    const newDocs: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          const docRef = data.url || data.publicId || data.name || file.name;
          newDocs.push(docRef);
        } else {
          newDocs.push(file.name);
        }
      } catch (err) {
        console.warn("Background upload error, falling back to filename", err);
        newDocs.push(file.name);
      }
    }

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

  // Initiator-specific state
  const [notifications, setNotifications] = useState<any[]>([
    {
      id: "notif-1",
      type: "RETURNED",
      title: "Returned for Correction: REQ-0519",
      time: "2 mins ago",
      message: "Your travel expense request for ₦3,200 was returned by Sarah Okafor. Reason: Missing original hotel receipt.",
      requestId: "mock-519",
      meta: {
        requestNumber: "REQ-0519",
        category: "Travel Expense",
        amount: 3200,
        auditor: "Sarah Okafor",
        auditorRole: "Approver / Auditor",
        comment: "Missing original hotel receipt. The current attachment only shows the booking confirmation, not the final payment receipt from the merchant.",
        justification: "Accommodation for Q3 regional sales summit in Lagos. One night stay at Continental Hotel.",
        attachments: [{ name: "Booking_Confirmation_Lagos.pdf", size: "420 KB" }]
      }
    },
    {
      id: "notif-2",
      type: "APPROVED",
      title: "Request Approved: REQ-0498",
      time: "3 hours ago",
      message: "Your IT equipment purchase for ₦5,400 was approved by the Departmental Approver. Moving to Finance for payment.",
      requestId: "mock-498",
      meta: {
        requestNumber: "REQ-0498",
        category: "Office Equipment",
        amount: 5400,
        description: "IT equipment purchase (monitor and keyboard)",
        vendorName: "IT Solutions Ltd",
        bankName: "Zenith Bank",
        accountNumber: "1029384756",
        accountName: "IT Solutions Ltd",
        status: "APPROVED"
      }
    },
    {
      id: "notif-3",
      type: "PAID",
      title: "Payment Completed: REQ-0482",
      time: "Yesterday, 2:30 PM",
      message: "Your vendor invoice for ₦12,000 (Project Alpha) has been paid. Bank Ref: BNK-2026-0829-01.",
      requestId: "mock-482",
      meta: {
        requestNumber: "REQ-0482",
        category: "Software & Services",
        amount: 12000,
        reference: "BNK-2026-0829-01"
      }
    },
    {
      id: "notif-4",
      type: "POLICY",
      title: "Reminder: Per Diem Policy Update",
      time: "Yesterday, 9:00 AM",
      message: "New domestic travel per diem rates are effective from August 1, 2026. Check the policy before submitting claims."
    }
  ]);
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
      const res = await fetch("/api/auth/me");
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) {
        throw new Error(`Server returned error status: ${res.status}`);
      }
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.user);
        loadDashboardData(data.user);
      } else {
        router.push("/login");
      }
    } catch (e: any) {
      console.error(e);
      setStartupError("Database connection failed. Please ensure MONGODB_URI is correctly configured in your Vercel Project Settings and whitelisted (0.0.0.0/0) in your MongoDB Atlas cluster.");
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async (user: any) => {
    try {
      // Load expenses
      const expRes = await fetch("/api/expenses");
      const expData = await expRes.json();
      if (expData.success) {
        setExpenses(expData.expenses);
      }

      // Load analytics stats if authorized
      if (["ADMIN", "FINANCE_HEAD", "FINANCE_OFFICER", "FINANCE_MANAGER"].includes(user.role)) {
        const statsRes = await fetch("/api/admin/stats");
        const statsData = await statsRes.json();
        if (statsData.success) {
          setMetrics(statsData.stats);
        }
      }

      // Load workflow config and system logs
      if (["ADMIN", "FINANCE_HEAD", "FINANCE_OFFICER", "FINANCE_MANAGER", "APPROVER"].includes(user.role)) {
        loadLogs("ALL");
        loadUsers();
      }

      if (user.role === "ADMIN") {
        const wfRes = await fetch("/api/admin/workflow");
        const wfData = await wfRes.json();
        if (wfData.success) {
          setWorkflowSteps(wfData.steps);
        }
      }
    } catch (e) {
      console.error("Error loading dashboard data:", e);
    }
  };

  const loadLogs = async (filter: string) => {
    try {
      const url = filter && filter !== "ALL" ? `/api/admin/logs?type=${filter}` : "/api/admin/logs";
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setSystemLogs(data.logs);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await fetch("/api/admin/invite");
      const data = await res.json();
      if (data.success) {
        setSystemUsers(data.users);
        setDepartments(data.departments || []);
      }
    } catch (e) {
      console.error("Error loading users:", e);
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError("");
    setInviteSubmitting(true);
    try {
      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inviteForm)
      });
      const data = await res.json();
      if (data.success) {
        setInviteResult(data);
        setInviteForm({ name: "", email: "", role: "INITIATOR", departmentId: "" });
        loadUsers();
      } else {
        setInviteError(data.error || "Failed to invite user");
      }
    } catch (e) {
      setInviteError("An error occurred. Please try again.");
    } finally {
      setInviteSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (e) {
      console.error("Logout failed:", e);
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

    try {
      const payload = {
        category: newRequest.category,
        description: newRequest.description,
        amount: Number(newRequest.amount),
        supportingDocument: newRequest.supportingDocument,
        vendorName: newRequest.vendorName,
        vendorBankDetails: {
          accountNumber: newRequest.accountNumber || "1234567890",
          bankName: newRequest.bankName || "Corporate Bank Plc",
          accountName: newRequest.accountName || newRequest.vendorName,
        },
        requiredPaymentDate: newRequest.requiredPaymentDate,
      };

      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        const createdId = data.request._id;

        if (shouldSubmit) {
          // Immediately submit after creation
          const submitRes = await fetch(`/api/expenses/${createdId}/submit`, { method: "POST" });
          const submitData = await submitRes.json();
          if (!submitData.success) {
            setFormError("Draft saved, but failed to submit: " + submitData.error);
            loadDashboardData(currentUser);
            return;
          }
        }

        setShowCreateModal(false);
        setNewRequest({
          category: "Travel",
          currency: "NGN",
          description: "",
          amount: "",
          supportingDocument: "invoice_receipt_1024.pdf",
          supportingDocuments: ["invoice_receipt_1024.pdf"],
          vendorName: "",
          accountNumber: "",
          bankName: "",
          accountName: "",
          requiredPaymentDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString().split('T')[0],
        });
        loadDashboardData(currentUser);
      } else {
        setFormError(data.error || "Failed to create request");
      }
    } catch (e: any) {
      setFormError(e.message);
    }
  };

  // Initiator submits a draft request
  const handleSubmitRequest = async (id: string) => {
    try {
      const res = await fetch(`/api/expenses/${id}/submit`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setSelectedExpense(null);
        loadDashboardData(currentUser);
      } else {
        alert(data.error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Initiator updates and resubmits a returned request
  const handleResubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!selectedResubmitExpense) return;

    // Check if it is the mockup notification request REQ-0519
    if (selectedResubmitExpense.id === "mock-519") {
      setNotifications(prev => prev.filter(n => n.id !== "notif-1"));
      setShowResubmitModal(false);
      setSelectedResubmitExpense(null);
      alert("Mock Request REQ-0519 resubmitted successfully!");
      return;
    }

    try {
      const updatePayload = {
        category: selectedResubmitExpense.category,
        description: resubmitForm.justification || selectedResubmitExpense.description,
        amount: Number(selectedResubmitExpense.amount),
        supportingDocument: resubmitForm.supportingDocument,
        vendorName: selectedResubmitExpense.vendorName,
        vendorBankDetails: selectedResubmitExpense.vendorBankDetails,
        requiredPaymentDate: selectedResubmitExpense.requiredPaymentDate,
      };

      // 1. Update details
      const putRes = await fetch(`/api/expenses/${selectedResubmitExpense._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload)
      });
      const putData = await putRes.json();

      if (!putData.success) {
        setFormError(putData.error || "Failed to update request details.");
        return;
      }

      // 2. Submit request
      const submitRes = await fetch(`/api/expenses/${selectedResubmitExpense._id}/submit`, { method: "POST" });
      const submitData = await submitRes.json();

      if (submitData.success) {
        setShowResubmitModal(false);
        setSelectedResubmitExpense(null);
        setResubmitForm({
          justification: "",
          supportingDocument: "hotel_invoice_final_paid.pdf",
          notifyAuditor: true
        });
        loadDashboardData(currentUser);
        // Clear matching notification
        setNotifications(prev => prev.filter(n => n.requestId !== selectedResubmitExpense._id));
      } else {
        setFormError(submitData.error || "Failed to resubmit request.");
      }
    } catch (e: any) {
      setFormError(e.message);
    }
  };

  // Initiator withdraws / cancels a request
  const handleCancelRequest = async (id: string) => {
    const confirmWithdraw = window.confirm("Are you sure you want to withdraw this request? This will release any locked budget funds.");
    if (!confirmWithdraw) return;

    try {
      const res = await fetch(`/api/expenses/${id}/cancel`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setSelectedExpense(null);
        loadDashboardData(currentUser);
        alert("Request successfully withdrawn.");
      } else {
        alert(data.error || "Failed to withdraw request.");
      }
    } catch (e) {
      console.error(e);
      alert("An error occurred. Please try again.");
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
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: settingsForm.currentPassword,
          newPassword: settingsForm.newPassword
        })
      });
      const data = await res.json();
      if (data.success) {
        setSettingsMessage("Password successfully updated!");
        setSettingsForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        setSettingsError(data.error || "Failed to update password.");
      }
    } catch (e) {
      setSettingsError("An error occurred. Please try again.");
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      const res = await fetch("/api/auth/me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editProfileForm.name,
          email: editProfileForm.email,
          officialContact: editProfileForm.officialContact,
          personalContact: editProfileForm.personalContact,
          avatar: editProfileForm.avatar
        })
      });
      const data = await res.json();
      if (data.success) {
        setCurrentUser({
          ...currentUser,
          name: data.user.name,
          email: data.user.email,
          officialContact: data.user.officialContact,
          personalContact: data.user.personalContact,
          avatar: data.user.avatar
        });
        setShowEditProfileModal(false);
        setShowUpdatePhotoModal(false);
      } else {
        alert(data.error || "Failed to update profile.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred. Please try again.");
    }
  };

  // Finance Head exceptional approval
  const handleExceptionalBudgetAction = async (id: string, action: "APPROVE" | "REJECT" | "RETURN") => {
    try {
      const res = await fetch(`/api/expenses/${id}/exceptional`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          comment: actionComment,
          adjustedAmount: adjustedAmount > 0 ? adjustedAmount : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedExpense(null);
        setActionComment("");
        setAdjustedAmount(0);
        loadDashboardData(currentUser);
      } else {
        alert(data.error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Approver approval
  const handleWorkflowAction = async (id: string, action: "APPROVE" | "REJECT" | "RETURN") => {
    try {
      const res = await fetch(`/api/expenses/${id}/workflow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, comment: actionComment }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedExpense(null);
        setActionComment("");
        loadDashboardData(currentUser);
      } else {
        alert(data.error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Finance Officer verify and upload
  const handleFinanceUpload = async (id: string) => {
    try {
      const res = await fetch(`/api/expenses/${id}/upload`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setSelectedExpense(null);
        loadDashboardData(currentUser);
      } else {
        alert(data.error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Finance Manager release payment
  const handlePaymentRelease = async (id: string) => {
    if (!paymentRef) {
      alert("Payment transaction reference is required to release cash");
      return;
    }
    try {
      const res = await fetch(`/api/expenses/${id}/release`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: paymentRef }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedExpense(null);
        setPaymentRef("");
        loadDashboardData(currentUser);
      } else {
        alert(data.error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Admin dynamic workflow update
  const handleSaveWorkflowConfig = async () => {
    setWorkflowMessage("");
    try {
      const res = await fetch("/api/admin/workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steps: workflowSteps }),
      });
      const data = await res.json();
      if (data.success) {
        setWorkflowSteps(data.steps);
        setWorkflowMessage("Workflow steps configuration updated successfully!");
        loadDashboardData(currentUser);
      } else {
        setWorkflowMessage("Error: " + data.error);
      }
    } catch (e: any) {
      setWorkflowMessage("Error: " + e.message);
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

  const value = {
    router,
    pathname,
    currentUser, setCurrentUser,
    loading, setLoading,
    startupError, setStartupError,
    seeding, setSeeding,
    systemUsers, setSystemUsers,
    departments, setDepartments,
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
    notifications, setNotifications,
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
    fetchSession,
    loadDashboardData,
    loadLogs,
    loadUsers,
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

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}
