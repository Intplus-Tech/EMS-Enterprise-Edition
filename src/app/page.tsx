"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import * as Icons from "lucide-react";
import { BRANDING } from "../config/branding";

import { DynamicIcon } from "../components/DynamicIcon";
import { DashboardTab } from "../components/DashboardTab";
import { ApprovalsTab } from "../components/ApprovalsTab";
import { RequestsTab } from "../components/RequestsTab";
import { HistoryTab } from "../components/HistoryTab";
import { SettingsTab } from "../components/SettingsTab";
import { WorkflowTab } from "../components/WorkflowTab";
import { LogsTab } from "../components/LogsTab";
import { UsersTab } from "../components/UsersTab";
import { ExceptionHistoryTab } from "../components/ExceptionHistoryTab";
import { DepartmentalSpendTab } from "../components/DepartmentalSpendTab";
import { PendingExceptionsTab } from "../components/PendingExceptionsTab";
import { PendingExceptionsOverviewTab } from "../components/PendingExceptionsOverviewTab";

// System Admin Components & Modals
import { AdminSystemOverviewTab } from "../components/admin/AdminSystemOverviewTab";
import { AdminDepartmentalSpendTab } from "../components/admin/AdminDepartmentalSpendTab";
import { AdminEnterpriseReportingTab } from "../components/admin/AdminEnterpriseReportingTab";
import { AdminUsersAndRolesTab } from "../components/admin/AdminUsersAndRolesTab";
import { AdminAuditTrailViewerTab } from "../components/admin/AdminAuditTrailViewerTab";

import { AdminAddUserModal } from "../components/admin/modals/AdminAddUserModal";
import { AdminEditUserProfileModal } from "../components/admin/modals/AdminEditUserProfileModal";
import { AdminCreateDepartmentModal } from "../components/admin/modals/AdminCreateDepartmentModal";
import { AdminEditDepartmentModal } from "../components/admin/modals/AdminEditDepartmentModal";
import { AdminDeleteDepartmentModal } from "../components/admin/modals/AdminDeleteDepartmentModal";
import { AdminDeleteUserModal } from "../components/admin/modals/AdminDeleteUserModal";
import { AdminSuspendUserModal } from "../components/admin/modals/AdminSuspendUserModal";
import { AdminEditRoleModal } from "../components/admin/modals/AdminEditRoleModal";
import { AdminSetBudgetModal } from "../components/admin/modals/AdminSetBudgetModal";

// Modular Dialog Modals
import { InitiateExpenseRequestModal } from "../components/modals/InitiateExpenseRequestModal";
import { ExpenseDetailModal } from "../components/modals/ExpenseDetailModal";
import { ResubmitExpenseModal } from "../components/modals/ResubmitExpenseModal";
import { ViewReceiptModal } from "../components/modals/ViewReceiptModal";
import { PerDiemPolicyModal } from "../components/modals/PerDiemPolicyModal";
import { InviteUserModal } from "../components/modals/InviteUserModal";
import { InviteResultModal } from "../components/modals/InviteResultModal";
import { EditProfileModal } from "../components/modals/EditProfileModal";
import { UpdatePhotoModal } from "../components/modals/UpdatePhotoModal";
import { ChangePasswordModal } from "../components/modals/ChangePasswordModal";
import { GlobalAlertDialogModal } from "../components/modals/GlobalAlertDialogModal";

export default function Dashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [startupError, setStartupError] = useState("");
  const [seeding, setSeeding] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard"); // dashboard, expenses, workflow, logs, users, requests, history, settings
  const [pendingExceptionSubView, setPendingExceptionSubView] = useState<"list" | "details">("list");
  
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
  }, []);

  // Client-side Role-based Navigation Guard
  useEffect(() => {
    if (!currentUser) return;
    
    const initiatorTabs = ["requests", "history", "settings"];
    const approverTabs = ["dashboard", "approvals", "requests", "history", "settings", "workflow", "logs", "users"];
    
    if (currentUser.role === "INITIATOR") {
      if (!initiatorTabs.includes(activeTab)) {
        setActiveTab("requests");
      }
    } else if (currentUser.role === "FINANCE_HEAD") {
      if (!["pending-exceptions", "departmental-spend", "exception-history", "approvals", "history", "settings"].includes(activeTab)) {
        setActiveTab("exception-history");
      }
    } else if (["FINANCE_OFFICER", "FINANCE_MANAGER"].includes(currentUser.role)) {
      if (!["approvals", "history", "settings"].includes(activeTab)) {
        setActiveTab("approvals");
      }
    } else if (currentUser.role === "ADMIN") {
      const adminTabs = ["dashboard", "departmental_spend", "reports", "users_roles", "audit_trail", "settings", "workflow", "logs", "users"];
      if (!adminTabs.includes(activeTab)) {
        setActiveTab("dashboard");
      }
    } else {
      if (!approverTabs.includes(activeTab)) {
        setActiveTab("dashboard");
      }
    }
  }, [activeTab, currentUser]);

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
        if (data.user.role === "INITIATOR") {
          setActiveTab("requests");
        } else if (data.user.role === "FINANCE_HEAD") {
          setActiveTab("exception-history");
        } else if (["FINANCE_OFFICER", "FINANCE_MANAGER"].includes(data.user.role)) {
          setActiveTab("approvals");
        } else {
          setActiveTab("dashboard");
        }
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
                onClick={() => setActiveTab("requests")}
                className="btn"
                style={{
                  justifyContent: "flex-start",
                  background: activeTab === "requests" ? "rgba(255, 255, 255, 0.08)" : "transparent",
                  color: activeTab === "requests" ? "rgb(var(--color-text))" : "rgb(var(--color-text-muted))"
                }}
              >
                <Icons.Receipt size={18} /> Requests
                {(() => {
                  const pendingCount = expenses.filter(e => ["DRAFT", "RETURNED"].includes(e.status)).length + notifications.filter(n => n.type === "RETURNED").length;
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
                onClick={() => setActiveTab("history")}
                className="btn"
                style={{
                  justifyContent: "flex-start",
                  background: activeTab === "history" ? "rgba(255, 255, 255, 0.08)" : "transparent",
                  color: activeTab === "history" ? "rgb(var(--color-text))" : "rgb(var(--color-text-muted))"
                }}
              >
                <Icons.History size={18} /> History
              </button>

              <button
                onClick={() => setActiveTab("settings")}
                className="btn"
                style={{
                  justifyContent: "flex-start",
                  background: activeTab === "settings" ? "rgba(255, 255, 255, 0.08)" : "transparent",
                  color: activeTab === "settings" ? "rgb(var(--color-text))" : "rgb(var(--color-text-muted))"
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
                onClick={() => setActiveTab("pending-exceptions")}
                className="btn"
                style={{
                  justifyContent: "flex-start",
                  background: ["pending-exceptions", "approvals"].includes(activeTab) ? "rgba(37, 99, 235, 0.12)" : "transparent",
                  color: ["pending-exceptions", "approvals"].includes(activeTab) ? "#2563EB" : "rgb(var(--color-text-muted))",
                  fontWeight: ["pending-exceptions", "approvals"].includes(activeTab) ? "700" : "500"
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
                onClick={() => setActiveTab("departmental-spend")}
                className="btn"
                style={{
                  justifyContent: "flex-start",
                  background: activeTab === "departmental-spend" ? "rgba(37, 99, 235, 0.12)" : "transparent",
                  color: activeTab === "departmental-spend" ? "#2563EB" : "rgb(var(--color-text-muted))",
                  fontWeight: activeTab === "departmental-spend" ? "700" : "500"
                }}
              >
                <Icons.PieChart size={18} /> Departmental Spend
              </button>

              <button
                onClick={() => setActiveTab("exception-history")}
                className="btn"
                style={{
                  justifyContent: "flex-start",
                  background: ["exception-history", "history"].includes(activeTab) ? "rgba(37, 99, 235, 0.12)" : "transparent",
                  color: ["exception-history", "history"].includes(activeTab) ? "#2563EB" : "rgb(var(--color-text-muted))",
                  fontWeight: ["exception-history", "history"].includes(activeTab) ? "700" : "500"
                }}
              >
                <Icons.BarChart2 size={18} /> Exception History
              </button>

              <button
                onClick={() => setActiveTab("settings")}
                className="btn"
                style={{
                  justifyContent: "flex-start",
                  background: activeTab === "settings" ? "rgba(37, 99, 235, 0.12)" : "transparent",
                  color: activeTab === "settings" ? "#2563EB" : "rgb(var(--color-text-muted))",
                  fontWeight: activeTab === "settings" ? "700" : "500"
                }}
              >
                <Icons.Settings size={18} /> Settings
              </button>
            </>
          ) : currentUser?.role === "ADMIN" ? (
            <>
              <button
                onClick={() => setActiveTab("dashboard")}
                className="btn"
                style={{
                  justifyContent: "flex-start",
                  background: activeTab === "dashboard" ? "rgba(37, 99, 235, 0.12)" : "transparent",
                  color: activeTab === "dashboard" ? "#2563EB" : "rgb(var(--color-text-muted))",
                  fontWeight: activeTab === "dashboard" ? "700" : "500"
                }}
              >
                <Icons.LayoutDashboard size={18} /> Dashboard
              </button>

              <button
                onClick={() => setActiveTab("departmental_spend")}
                className="btn"
                style={{
                  justifyContent: "flex-start",
                  background: activeTab === "departmental_spend" ? "rgba(37, 99, 235, 0.12)" : "transparent",
                  color: activeTab === "departmental_spend" ? "#2563EB" : "rgb(var(--color-text-muted))",
                  fontWeight: activeTab === "departmental_spend" ? "700" : "500"
                }}
              >
                <Icons.PieChart size={18} /> Departmental Spend
              </button>

              <button
                onClick={() => setActiveTab("reports")}
                className="btn"
                style={{
                  justifyContent: "flex-start",
                  background: activeTab === "reports" ? "rgba(37, 99, 235, 0.12)" : "transparent",
                  color: activeTab === "reports" ? "#2563EB" : "rgb(var(--color-text-muted))",
                  fontWeight: activeTab === "reports" ? "700" : "500"
                }}
              >
                <Icons.BarChart2 size={18} /> Report
              </button>

              <button
                onClick={() => setActiveTab("users_roles")}
                className="btn"
                style={{
                  justifyContent: "flex-start",
                  background: activeTab === "users_roles" ? "rgba(37, 99, 235, 0.12)" : "transparent",
                  color: activeTab === "users_roles" ? "#2563EB" : "rgb(var(--color-text-muted))",
                  fontWeight: activeTab === "users_roles" ? "700" : "500"
                }}
              >
                <Icons.Users size={18} /> Users & Roles
              </button>

              <button
                onClick={() => setActiveTab("audit_trail")}
                className="btn"
                style={{
                  justifyContent: "flex-start",
                  background: activeTab === "audit_trail" ? "rgba(37, 99, 235, 0.12)" : "transparent",
                  color: activeTab === "audit_trail" ? "#2563EB" : "rgb(var(--color-text-muted))",
                  fontWeight: activeTab === "audit_trail" ? "700" : "500"
                }}
              >
                <Icons.FileText size={18} /> Audit Trail
              </button>

              <button
                onClick={() => setActiveTab("settings")}
                className="btn"
                style={{
                  justifyContent: "flex-start",
                  background: activeTab === "settings" ? "rgba(37, 99, 235, 0.12)" : "transparent",
                  color: activeTab === "settings" ? "#2563EB" : "rgb(var(--color-text-muted))",
                  fontWeight: activeTab === "settings" ? "700" : "500"
                }}
              >
                <Icons.Settings size={18} /> Settings
              </button>
            </>
          ) : (
            <>
              {!["FINANCE_OFFICER", "FINANCE_HEAD", "FINANCE_MANAGER"].includes(currentUser?.role) && (
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className="btn"
                  style={{
                    justifyContent: "flex-start",
                    background: activeTab === "dashboard" ? "rgba(255, 255, 255, 0.08)" : "transparent",
                    color: activeTab === "dashboard" ? "rgb(var(--color-text))" : "rgb(var(--color-text-muted))"
                  }}
                >
                  <Icons.LayoutDashboard size={18} /> Dashboard
                </button>
              )}
              
              <button
                onClick={() => setActiveTab("approvals")}
                className="btn"
                style={{
                  justifyContent: "flex-start",
                  background: activeTab === "approvals" ? "rgba(255, 255, 255, 0.08)" : "transparent",
                  color: activeTab === "approvals" ? "rgb(var(--color-text))" : "rgb(var(--color-text-muted))"
                }}
              >
                <Icons.CheckSquare size={18} /> {["FINANCE_OFFICER", "FINANCE_HEAD", "FINANCE_MANAGER"].includes(currentUser?.role) ? "Pipeline Overview" : "Pending Approvals"}
                {(() => {
                  const pendingCount = expenses.filter(exp => {
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
                onClick={() => setActiveTab("history")}
                className="btn"
                style={{
                  justifyContent: "flex-start",
                  background: activeTab === "history" ? "rgba(255, 255, 255, 0.08)" : "transparent",
                  color: activeTab === "history" ? "rgb(var(--color-text))" : "rgb(var(--color-text-muted))"
                }}
              >
                <Icons.History size={18} /> History
              </button>

              {!["FINANCE_OFFICER", "FINANCE_HEAD", "FINANCE_MANAGER"].includes(currentUser?.role) && (
                <button
                  onClick={() => setActiveTab("requests")}
                  className="btn"
                  style={{
                    justifyContent: "flex-start",
                    background: activeTab === "requests" ? "rgba(255, 255, 255, 0.08)" : "transparent",
                    color: activeTab === "requests" ? "rgb(var(--color-text))" : "rgb(var(--color-text-muted))"
                  }}
                >
                  <Icons.Receipt size={18} /> Requests
                </button>
              )}

              <button
                onClick={() => setActiveTab("settings")}
                className="btn"
                style={{
                  justifyContent: "flex-start",
                  background: activeTab === "settings" ? "rgba(255, 255, 255, 0.08)" : "transparent",
                  color: activeTab === "settings" ? "rgb(var(--color-text))" : "rgb(var(--color-text-muted))"
                }}
              >
                <Icons.Settings size={18} /> Settings
              </button>

              {currentUser?.role === "ADMIN" && (
                <>
                  <button
                    onClick={() => setActiveTab("workflow")}
                    className="btn"
                    style={{
                      justifyContent: "flex-start",
                      background: activeTab === "workflow" ? "rgba(255, 255, 255, 0.08)" : "transparent",
                      color: activeTab === "workflow" ? "rgb(var(--color-text))" : "rgb(var(--color-text-muted))"
                    }}
                  >
                    <Icons.GitFork size={18} /> Workflow Rules
                  </button>

                  <button
                    onClick={() => setActiveTab("logs")}
                    className="btn"
                    style={{
                      justifyContent: "flex-start",
                      background: activeTab === "logs" ? "rgba(255, 255, 255, 0.08)" : "transparent",
                      color: activeTab === "logs" ? "rgb(var(--color-text))" : "rgb(var(--color-text-muted))"
                    }}
                  >
                    <Icons.History size={18} /> System Audits
                  </button>

                  <button
                    onClick={() => setActiveTab("users")}
                    className="btn"
                    style={{
                      justifyContent: "flex-start",
                      background: activeTab === "users" ? "rgba(255, 255, 255, 0.08)" : "transparent",
                      color: activeTab === "users" ? "rgb(var(--color-text))" : "rgb(var(--color-text-muted))"
                    }}
                  >
                    <Icons.Users size={18} /> Users & Invites
                  </button>
                </>
              )}
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

        {/* VIEW: DASHBOARD PANEL */}
        {activeTab === "dashboard" && (
          currentUser?.role === "ADMIN" ? (
            <AdminSystemOverviewTab
              currentUser={currentUser}
              systemUsersCount={systemUsers.length}
              departmentsCount={departments.length}
              systemLogs={systemLogs}
              onOpenAddUser={() => setShowAdminAddUserModal(true)}
              onOpenCreateDept={() => setShowAdminCreateDeptModal(true)}
              onOpenSetBudget={() => setShowAdminSetBudgetModal(true)}
            />
          ) : (
            <DashboardTab
              currentUser={currentUser}
              expenses={expenses}
              chartViewMode={chartViewMode}
              setChartViewMode={setChartViewMode}
            />
          )
        )}

        {/* SYSTEM ADMIN VIEWS */}
        {activeTab === "departmental_spend" && currentUser?.role === "ADMIN" && (
          <AdminDepartmentalSpendTab
            departments={departments}
            onOpenCreateDept={() => setShowAdminCreateDeptModal(true)}
            onOpenEditDept={(dept) => {
              setSelectedAdminDept(dept);
              setShowAdminEditDeptModal(true);
            }}
            onOpenDeleteDept={(dept) => {
              setSelectedAdminDept(dept);
              setShowAdminDeleteDeptModal(true);
            }}
          />
        )}

        {activeTab === "reports" && currentUser?.role === "ADMIN" && (
          <AdminEnterpriseReportingTab
            departments={departments}
            expenses={expenses}
            metrics={metrics}
          />
        )}

        {activeTab === "users_roles" && currentUser?.role === "ADMIN" && (
          <AdminUsersAndRolesTab
            systemUsers={systemUsers}
            departments={departments}
            onOpenAddUser={() => setShowAdminAddUserModal(true)}
            onOpenEditUserProfile={(user) => {
              setSelectedAdminUser(user);
              setShowAdminEditUserProfileModal(true);
            }}
            onOpenEditRole={(roleData) => {
              setSelectedAdminRole(roleData);
              setShowAdminEditRoleModal(true);
            }}
            onOpenSuspendUser={(user) => {
              setSelectedAdminUser(user);
              setShowAdminSuspendUserModal(true);
            }}
            onOpenDeleteUser={(user) => {
              setSelectedAdminUser(user);
              setShowAdminDeleteUserModal(true);
            }}
          />
        )}

        {activeTab === "audit_trail" && currentUser?.role === "ADMIN" && (
          <AdminAuditTrailViewerTab
            logs={systemLogs}
          />
        )}

        {/* VIEW: EXCEPTION HISTORY (FINANCE HEAD) */}
        {(activeTab === "exception-history" || (currentUser?.role === "FINANCE_HEAD" && activeTab === "history")) && (
          <ExceptionHistoryTab
            currentUser={currentUser}
            expenses={expenses}
            setSelectedExpense={setSelectedExpense}
          />
        )}

        {/* VIEW: DEPARTMENTAL SPEND (FINANCE HEAD) */}
        {activeTab === "departmental-spend" && (
          <DepartmentalSpendTab
            currentUser={currentUser}
            expenses={expenses}
            setSelectedExpense={setSelectedExpense}
          />
        )}

        {/* VIEW: PENDING EXCEPTIONS (FINANCE HEAD) */}
        {activeTab === "pending-exceptions" && currentUser?.role === "FINANCE_HEAD" && (
          pendingExceptionSubView === "list" ? (
            <PendingExceptionsOverviewTab
              currentUser={currentUser}
              expenses={expenses}
              onReviewRequest={(req) => {
                setSelectedExpense(req);
                setPendingExceptionSubView("details");
              }}
            />
          ) : (
            <PendingExceptionsTab
              currentUser={currentUser}
              expenses={expenses}
              setSelectedExpense={setSelectedExpense}
              loadDashboardData={loadDashboardData}
              onBackToDashboard={() => setPendingExceptionSubView("list")}
            />
          )
        )}

        {/* VIEW: PENDING APPROVALS (OTHER ROLES) */}
        {activeTab === "approvals" && currentUser?.role !== "FINANCE_HEAD" && (
          <ApprovalsTab
            currentUser={currentUser}
            expenses={expenses}
            approvalDateFilter={approvalDateFilter}
            setApprovalDateFilter={setApprovalDateFilter}
            approvalDatePicker={approvalDatePicker}
            setApprovalDatePicker={setApprovalDatePicker}
            amountSearchQuery={amountSearchQuery}
            setAmountSearchQuery={setAmountSearchQuery}
            setSelectedExpense={setSelectedExpense}
            selectedExpense={selectedExpense}
            loadDashboardData={loadDashboardData}
          />
        )}
        
        {activeTab === "requests" && (
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
        )}

        {/* VIEW: REQUEST HISTORY (NON-FINANCE HEAD) */}
        {activeTab === "history" && currentUser?.role !== "FINANCE_HEAD" && (
          <HistoryTab
            currentUser={currentUser}
            expenses={expenses}
            historyFilterCategory={historyFilterCategory}
            setHistoryFilterCategory={setHistoryFilterCategory}
            historyFilterStatus={historyFilterStatus}
            setHistoryFilterStatus={setHistoryFilterStatus}
            historySearchQuery={historySearchQuery}
            setHistorySearchQuery={setHistorySearchQuery}
            historySubTab={historySubTab}
            setHistorySubTab={setHistorySubTab}
            setSelectedExpense={setSelectedExpense}
          />
        )}

        {/* VIEW: SETTINGS */}
        {activeTab === "settings" && (
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
        )}

        {/* VIEW: WORKFLOW RULES EDITOR (ADMIN ONLY) */}
        {activeTab === "workflow" && currentUser?.role === "ADMIN" && (
          <WorkflowTab
            currentUser={currentUser}
            workflowSteps={workflowSteps}
            workflowMessage={workflowMessage}
            handleStepDetailChange={handleStepDetailChange}
            moveWorkflowStep={moveWorkflowStep}
            handleSaveWorkflowConfig={handleSaveWorkflowConfig}
          />
        )}

        {/* VIEW: AUDIT LOGS VIEWER (ADMIN ONLY) */}
        {activeTab === "logs" && currentUser?.role === "ADMIN" && (
          <LogsTab
            currentUser={currentUser}
            systemLogs={systemLogs}
            logFilter={logFilter}
            setLogFilter={setLogFilter}
            loadLogs={loadLogs}
          />
        )}

        {/* VIEW: USER & INVITATION DIRECTORY (ADMIN ONLY) */}
        {activeTab === "users" && currentUser?.role === "ADMIN" && (
          <UsersTab
            currentUser={currentUser}
            systemUsers={systemUsers}
            setInviteResult={setInviteResult}
            setShowInviteModal={setShowInviteModal}
            setInviteForm={setInviteForm}
            setInviteError={setInviteError}
            setInviteSubmitting={setInviteSubmitting}
          />
        )}

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
        onSaveUser={(userData) => {
          setSystemUsers([...systemUsers, { id: Date.now().toString(), ...userData, isActive: true }]);
          alert("User successfully invited!");
        }}
      />

      <AdminEditUserProfileModal
        isOpen={showAdminEditUserProfileModal}
        onClose={() => setShowAdminEditUserProfileModal(false)}
        user={selectedAdminUser}
        departments={departments}
        onUpdateUser={(updatedUser) => {
          setSystemUsers(systemUsers.map(u => ((u.id || u._id) === (updatedUser.id || updatedUser._id) ? updatedUser : u)));
          alert("User profile updated!");
        }}
        onForceLogOut={() => alert("Session forced closed.")}
      />

      <AdminCreateDepartmentModal
        isOpen={showAdminCreateDeptModal}
        onClose={() => setShowAdminCreateDeptModal(false)}
        onCreateDepartment={(deptData) => {
          setDepartments([...departments, { id: Date.now().toString(), ...deptData, utilized: 0, pctUsed: 0, usersCount: 1, isActive: true }]);
          alert("Department created successfully!");
        }}
      />

      <AdminEditDepartmentModal
        isOpen={showAdminEditDeptModal}
        onClose={() => setShowAdminEditDeptModal(false)}
        department={selectedAdminDept}
        onUpdateDepartment={(updatedDept) => {
          setDepartments(departments.map(d => ((d.id || d._id) === (updatedDept.id || updatedDept._id) ? updatedDept : d)));
          alert("Department updated!");
        }}
      />

      <AdminDeleteDepartmentModal
        isOpen={showAdminDeleteDeptModal}
        onClose={() => setShowAdminDeleteDeptModal(false)}
        department={selectedAdminDept}
        onConfirmDelete={(deptId) => {
          setDepartments(departments.filter(d => (d.id || d._id) !== deptId));
          alert("Department deleted!");
        }}
      />

      <AdminDeleteUserModal
        isOpen={showAdminDeleteUserModal}
        onClose={() => setShowAdminDeleteUserModal(false)}
        user={selectedAdminUser}
        onConfirmDelete={(userId) => {
          setSystemUsers(systemUsers.filter(u => (u.id || u._id) !== userId));
          alert("User deleted!");
        }}
      />

      <AdminSuspendUserModal
        isOpen={showAdminSuspendUserModal}
        onClose={() => setShowAdminSuspendUserModal(false)}
        user={selectedAdminUser}
        onConfirmSuspend={(userId) => {
          setSystemUsers(systemUsers.map(u => ((u.id || u._id) === userId ? { ...u, isActive: false } : u)));
          alert("User access suspended!");
        }}
      />

      <AdminEditRoleModal
        isOpen={showAdminEditRoleModal}
        onClose={() => setShowAdminEditRoleModal(false)}
        roleData={selectedAdminRole}
        onSaveRole={() => alert("Role configuration updated!")}
        onDeleteRole={() => alert("Role deleted!")}
        onOpenMatrix={() => setActiveTab("users_roles")}
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

      {/* SYSTEM ADMIN MODALS */}
      <AdminAddUserModal
        isOpen={showAdminAddUserModal}
        onClose={() => setShowAdminAddUserModal(false)}
        departments={departments}
        onSaveUser={(userData) => {
          setSystemUsers([...systemUsers, { id: Date.now().toString(), ...userData, isActive: true }]);
          alert("User successfully invited!");
        }}
      />

      <AdminEditUserProfileModal
        isOpen={showAdminEditUserProfileModal}
        onClose={() => setShowAdminEditUserProfileModal(false)}
        user={selectedAdminUser}
        departments={departments}
        onUpdateUser={(updatedUser) => {
          setSystemUsers(systemUsers.map(u => ((u.id || u._id) === (updatedUser.id || updatedUser._id) ? updatedUser : u)));
          alert("User profile updated!");
        }}
        onForceLogOut={() => alert("Session forced closed.")}
      />

      <AdminCreateDepartmentModal
        isOpen={showAdminCreateDeptModal}
        onClose={() => setShowAdminCreateDeptModal(false)}
        onCreateDepartment={(deptData) => {
          setDepartments([...departments, { id: Date.now().toString(), ...deptData, utilized: 0, pctUsed: 0, usersCount: 1, isActive: true }]);
          alert("Department created successfully!");
        }}
      />

      <AdminEditDepartmentModal
        isOpen={showAdminEditDeptModal}
        onClose={() => setShowAdminEditDeptModal(false)}
        department={selectedAdminDept}
        onUpdateDepartment={(updatedDept) => {
          setDepartments(departments.map(d => ((d.id || d._id) === (updatedDept.id || updatedDept._id) ? updatedDept : d)));
          alert("Department updated!");
        }}
      />

      <AdminDeleteDepartmentModal
        isOpen={showAdminDeleteDeptModal}
        onClose={() => setShowAdminDeleteDeptModal(false)}
        department={selectedAdminDept}
        onConfirmDelete={(deptId) => {
          setDepartments(departments.filter(d => (d.id || d._id) !== deptId));
          alert("Department deleted!");
        }}
      />

      <AdminDeleteUserModal
        isOpen={showAdminDeleteUserModal}
        onClose={() => setShowAdminDeleteUserModal(false)}
        user={selectedAdminUser}
        onConfirmDelete={(userId) => {
          setSystemUsers(systemUsers.filter(u => (u.id || u._id) !== userId));
          alert("User deleted!");
        }}
      />

      <AdminSuspendUserModal
        isOpen={showAdminSuspendUserModal}
        onClose={() => setShowAdminSuspendUserModal(false)}
        user={selectedAdminUser}
        onConfirmSuspend={(userId) => {
          setSystemUsers(systemUsers.map(u => ((u.id || u._id) === userId ? { ...u, isActive: false } : u)));
          alert("User access suspended!");
        }}
      />

      <AdminEditRoleModal
        isOpen={showAdminEditRoleModal}
        onClose={() => setShowAdminEditRoleModal(false)}
        roleData={selectedAdminRole}
        onSaveRole={() => alert("Role configuration updated!")}
        onDeleteRole={() => alert("Role deleted!")}
        onOpenMatrix={() => setActiveTab("users_roles")}
      />

      <AdminSetBudgetModal
        isOpen={showAdminSetBudgetModal}
        onClose={() => setShowAdminSetBudgetModal(false)}
        departments={departments}
        onSetBudget={() => alert("Department budget updated successfully!")}
      />

      {/* Global intercepted alert modal dialog */}
      {alertDialog.isOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.6)", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: "420px", padding: "2rem", margin: "auto", display: "flex", flexDirection: "column", gap: "1.25rem", textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: "700", fontSize: "1rem", color: "rgb(var(--color-text))" }}>SpendFlow Notification</span>
              <button onClick={() => setAlertDialog({ isOpen: false, message: "" })} style={{ background: "none", border: "none", color: "rgb(var(--color-text))", cursor: "pointer" }}>
                <Icons.X size={20} />
              </button>
            </div>
            
            <p style={{ fontSize: "0.95rem", color: "rgb(var(--color-text-muted))", lineHeight: "1.6", margin: "1rem 0" }}>
              {alertDialog.message}
            </p>

            <button onClick={() => setAlertDialog({ isOpen: false, message: "" })} className="btn btn-primary" style={{ width: "100%", padding: "0.75rem" }}>
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
