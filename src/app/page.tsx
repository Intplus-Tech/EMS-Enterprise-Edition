"use client";

import { useEffect, useState } from "react";
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

export default function Dashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [startupError, setStartupError] = useState("");
  const [seeding, setSeeding] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard"); // dashboard, expenses, workflow, logs, users, requests, history, settings
  
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
    description: "",
    amount: "",
    supportingDocument: "invoice_receipt_1024.pdf",
    vendorName: "",
    accountNumber: "",
    bankName: "",
    accountName: "",
    requiredPaymentDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString().split('T')[0], // 7 days from now
  });
  const [formError, setFormError] = useState("");

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

      // Load workflow config if Admin
      if (user.role === "ADMIN") {
        const wfRes = await fetch("/api/admin/workflow");
        const wfData = await wfRes.json();
        if (wfData.success) {
          setWorkflowSteps(wfData.steps);
        }
        
        loadLogs("ALL");
        loadUsers();
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
          description: "",
          amount: "",
          supportingDocument: "invoice_receipt_1024.pdf",
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
          <DashboardTab
            currentUser={currentUser}
            expenses={expenses}
            chartViewMode={chartViewMode}
            setChartViewMode={setChartViewMode}
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

        {/* VIEW: PENDING EXCEPTIONS & APPROVALS */}
        {(activeTab === "pending-exceptions" || (activeTab === "approvals" && currentUser?.role !== "FINANCE_HEAD")) && (
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

      {/* CREATE REQUEST DIALOG MODAL */}
      {showCreateModal && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: "600px", padding: "2rem", margin: "auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontWeight: "bold" }}>Initiate Expense Request</h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer" }}>
                <Icons.X size={24} />
              </button>
            </div>

            {formError && (
              <div className="glass-card" style={{ borderLeft: "4px solid rgb(var(--color-danger))", padding: "0.75rem", background: "rgba(239,68,68,0.05)" }}>
                <p style={{ color: "rgb(var(--color-danger))", fontSize: "0.85rem" }}>{formError}</p>
              </div>
            )}

            <form onSubmit={(e) => handleCreateRequest(e, true)} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Expense Category</label>
                  <select
                    value={newRequest.category}
                    onChange={(e) => setNewRequest({ ...newRequest, category: e.target.value })}
                    className="form-select"
                  >
                    <option value="Travel">Travel & Lodging</option>
                    <option value="Equipment">Office Equipment</option>
                    <option value="Software">Software & Services</option>
                    <option value="Marketing">Marketing Expense</option>
                    <option value="Other">Other Expenses</option>
                  </select>
                </div>
                
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Requested Amount ({currentUser?.role === "INITIATOR" ? "₦" : "$"})</label>
                  <input
                    type="number"
                    required
                    value={newRequest.amount}
                    onChange={(e) => setNewRequest({ ...newRequest, amount: e.target.value })}
                    placeholder={currentUser?.role === "INITIATOR" ? "e.g. 3200" : "e.g. 2400"}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Description / Purpose</label>
                <textarea
                  required
                  rows={2}
                  value={newRequest.description}
                  onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
                  placeholder="Justify context for departmental budget validation"
                  className="form-textarea"
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Supporting Invoice Document</label>
                  <input
                    type="text"
                    required
                    value={newRequest.supportingDocument}
                    onChange={(e) => setNewRequest({ ...newRequest, supportingDocument: e.target.value })}
                    className="form-input"
                  />
                </div>
                
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Required Payment Date</label>
                  <input
                    type="date"
                    required
                    value={newRequest.requiredPaymentDate}
                    onChange={(e) => setNewRequest({ ...newRequest, requiredPaymentDate: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="glass-card" style={{ background: "rgba(15,23,42,0.3)" }}>
                <p style={{ fontSize: "0.8rem", fontWeight: "bold", marginBottom: "0.5rem", color: "rgb(var(--color-primary))" }}>Payee Bank Details</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                  <input
                    type="text"
                    required
                    placeholder="Vendor / Payee Name"
                    value={newRequest.vendorName}
                    onChange={(e) => setNewRequest({ ...newRequest, vendorName: e.target.value })}
                    className="form-input"
                    style={{ padding: "0.5rem 0.75rem", fontSize: "0.85rem" }}
                  />
                  <input
                    type="text"
                    required
                    placeholder="Bank Account Name"
                    value={newRequest.accountName}
                    onChange={(e) => setNewRequest({ ...newRequest, accountName: e.target.value })}
                    className="form-input"
                    style={{ padding: "0.5rem 0.75rem", fontSize: "0.85rem" }}
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <input
                    type="text"
                    required
                    placeholder="Account Number"
                    value={newRequest.accountNumber}
                    onChange={(e) => setNewRequest({ ...newRequest, accountNumber: e.target.value })}
                    className="form-input"
                    style={{ padding: "0.5rem 0.75rem", fontSize: "0.85rem" }}
                  />
                  <input
                    type="text"
                    required
                    placeholder="Bank Name"
                    value={newRequest.bankName}
                    onChange={(e) => setNewRequest({ ...newRequest, bankName: e.target.value })}
                    className="form-input"
                    style={{ padding: "0.5rem 0.75rem", fontSize: "0.85rem" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem" }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="button" onClick={(e) => handleCreateRequest(e, false)} className="btn btn-secondary" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                  Save Draft
                </button>
                <button type="submit" className="btn btn-primary">
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAILS & ACTIONS MODAL */}
      {selectedExpense && !["FINANCE_OFFICER", "FINANCE_HEAD", "FINANCE_MANAGER"].includes(currentUser?.role) && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: "750px", maxHeight: "90vh", overflowY: "auto", padding: "2rem", margin: "auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontWeight: "bold", fontSize: "1.25rem" }}>Request Details: {selectedExpense.requestNumber}</h3>
                <span className={`badge badge-${selectedExpense.status?.toLowerCase().replace(/_/g, '-')}`}>{selectedExpense.status}</span>
              </div>
              <button onClick={() => { setSelectedExpense(null); setActionComment(""); }} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer" }}>
                <Icons.X size={24} />
              </button>
            </div>

            {currentUser?.role === "INITIATOR" ? (
              // INITIATOR DETAILS VIEW (Stepper, Request info, attachments upload & withdraw options)
              <>
                {/* Stepper tracking progress */}
                <div className="glass-card" style={{ background: "rgba(15,23,42,0.2)", padding: "1.25rem", position: "relative", marginBottom: "0.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    {[
                      { name: "Initiation", active: ["DRAFT", "SUBMITTED", "BUDGET_CHECK", "INSUFFICIENT_BUDGET", "PENDING_EXCEPTIONAL", "PENDING_APPROVAL", "APPROVED", "SENT_TO_FINANCE", "UPLOADED_TO_BANK", "PAID", "CLOSED"].includes(selectedExpense.status), current: ["DRAFT", "SUBMITTED", "BUDGET_CHECK", "INSUFFICIENT_BUDGET"].includes(selectedExpense.status) },
                      { name: "Approval", active: ["PENDING_EXCEPTIONAL", "PENDING_APPROVAL", "APPROVED", "SENT_TO_FINANCE", "UPLOADED_TO_BANK", "PAID", "CLOSED"].includes(selectedExpense.status), current: ["PENDING_EXCEPTIONAL", "PENDING_APPROVAL"].includes(selectedExpense.status) },
                      { name: "Finance", active: ["APPROVED", "SENT_TO_FINANCE", "UPLOADED_TO_BANK", "PAID", "CLOSED"].includes(selectedExpense.status), current: ["APPROVED", "SENT_TO_FINANCE"].includes(selectedExpense.status) },
                      { name: "Bank", active: ["UPLOADED_TO_BANK", "PAID", "CLOSED"].includes(selectedExpense.status), current: ["UPLOADED_TO_BANK"].includes(selectedExpense.status) },
                      { name: "Paid", active: ["PAID", "CLOSED"].includes(selectedExpense.status), current: ["PAID"].includes(selectedExpense.status) },
                      { name: "Closed", active: ["CLOSED"].includes(selectedExpense.status), current: ["CLOSED"].includes(selectedExpense.status) }
                    ].map((step, idx) => {
                      const isCompleted = step.active && !step.current;
                      const isActive = step.current;
                      return (
                        <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, textAlign: "center", zIndex: 2 }}>
                          <div style={{
                            width: "2rem",
                            height: "2rem",
                            borderRadius: "50%",
                            background: isActive ? "rgba(99, 102, 241, 0.2)" : isCompleted ? "rgba(16, 185, 129, 0.2)" : "rgba(var(--color-card-border), 0.15)",
                            border: isActive ? "2px solid rgb(var(--color-primary))" : isCompleted ? "2px solid rgb(var(--color-secondary))" : "2px solid rgba(var(--color-card-border), 0.35)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: isActive ? "rgb(var(--color-primary))" : isCompleted ? "rgb(var(--color-secondary))" : "rgb(var(--color-text-dim))"
                          }}>
                            {isCompleted ? <Icons.Check size={16} /> : (idx + 1)}
                          </div>
                          <span style={{ fontSize: "0.7rem", marginTop: "0.25rem", color: step.active ? "rgb(var(--color-text))" : "rgb(var(--color-text-dim))", fontWeight: step.active ? "600" : "normal" }}>{step.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                  {/* Left Column: Request Information */}
                  <div className="glass-card" style={{ background: "rgba(15,23,42,0.3)" }}>
                    <h4 style={{ fontSize: "0.85rem", fontWeight: "bold", textTransform: "uppercase", color: "rgb(var(--color-text-dim))", marginBottom: "1rem" }}>Request Information</h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", fontSize: "0.9rem" }}>
                      <div>
                        <span style={{ color: "rgb(var(--color-text-dim))", display: "block", fontSize: "0.75rem", marginBottom: "0.15rem" }}>Vendor Name</span>
                        <strong>{selectedExpense.vendorName || "Not Specified"}</strong>
                      </div>
                      <div>
                        <span style={{ color: "rgb(var(--color-text-dim))", display: "block", fontSize: "0.75rem", marginBottom: "0.15rem" }}>Expense Category</span>
                        <strong>{selectedExpense.category}</strong>
                      </div>
                      <div>
                        <span style={{ color: "rgb(var(--color-text-dim))", display: "block", fontSize: "0.75rem", marginBottom: "0.15rem" }}>Payment Method</span>
                        <strong>Bank Transfer ({selectedExpense.vendorBankDetails?.bankName || "ACH"})</strong>
                      </div>
                      <div>
                        <span style={{ color: "rgb(var(--color-text-dim))", display: "block", fontSize: "0.75rem", marginBottom: "0.15rem" }}>Description / Business Purpose</span>
                        <p style={{ color: "rgb(var(--color-text-muted))", fontSize: "0.85rem", lineHeight: "1.4", margin: 0 }}>"{selectedExpense.description}"</p>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Attachments */}
                  <div className="glass-card" style={{ background: "rgba(15,23,42,0.3)", display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <h4 style={{ fontSize: "0.85rem", fontWeight: "bold", textTransform: "uppercase", color: "rgb(var(--color-text-dim))" }}>Attachments (1)</h4>
                    
                    {/* Attachment Item */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem", background: "rgba(var(--color-card-border), 0.1)", borderRadius: "8px", border: "1px solid rgba(var(--color-card-border), 0.2)" }}>
                      <Icons.FileText size={28} style={{ color: "rgb(var(--color-primary))", flexShrink: 0 }} />
                      <div style={{ flexGrow: 1, minWidth: 0 }}>
                        <p style={{ fontSize: "0.85rem", color: "rgb(var(--color-text))", fontWeight: "600", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", margin: 0 }}>
                          {selectedExpense.supportingDocument || "invoice_receipt.pdf"}
                        </p>
                        <span style={{ fontSize: "0.7rem", color: "rgb(var(--color-text-dim))" }}>1.2 MB • Oct 14, 2023</span>
                      </div>
                      <div style={{ display: "flex", gap: "0.25rem" }}>
                        <button onClick={() => alert("Simulated view for: " + selectedExpense.supportingDocument)} className="btn btn-secondary" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>
                          View
                        </button>
                        <button onClick={() => alert("Simulated download for: " + selectedExpense.supportingDocument)} className="btn btn-secondary" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>
                          Download
                        </button>
                      </div>
                    </div>

                    {/* Dropzone */}
                    <div style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "2px dashed rgba(var(--color-card-border), 0.35)",
                      borderRadius: "8px",
                      padding: "1.5rem",
                      textAlign: "center",
                      background: "rgba(var(--color-card-border), 0.05)"
                    }}>
                      <Icons.Upload size={24} style={{ color: "rgb(var(--color-text-dim))", marginBottom: "0.5rem" }} />
                      <span style={{ fontSize: "0.8rem", color: "rgb(var(--color-text))", fontWeight: "600" }}>Drop more files to attach</span>
                    </div>
                  </div>
                </div>

                {/* Footer buttons */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1.5rem" }}>
                  <div>
                    {!["PAID", "CLOSED", "REJECTED", "CANCELLED"].includes(selectedExpense.status) && (
                      <button
                        onClick={() => handleCancelRequest(selectedExpense._id)}
                        className="btn btn-danger"
                        style={{ background: "#B91C1C" }}
                      >
                        Withdraw Request
                      </button>
                    )}
                  </div>
                  <button onClick={() => setSelectedExpense(null)} className="btn btn-secondary">
                    Close Details
                  </button>
                </div>
              </>
            ) : (
              // STANDARD VIEW FOR NON-INITIATOR ROLES
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                  <div className="glass-card" style={{ background: "rgba(15,23,42,0.3)" }}>
                    <p style={{ fontSize: "0.8rem", color: "rgb(var(--color-text-muted))" }}>Request Parameters</p>
                    <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <span>Department: <strong>{selectedExpense.departmentId?.name}</strong></span>
                      <span>Category: <strong>{selectedExpense.category}</strong></span>
                      <span>Amount: <strong style={{ color: "rgb(var(--color-primary))" }}>${selectedExpense.amount.toLocaleString()}</strong></span>
                      <span>Required By: <strong>{new Date(selectedExpense.requiredPaymentDate).toLocaleDateString()}</strong></span>
                      <span style={{ fontSize: "0.85rem", color: "rgb(var(--color-text-muted))" }}>Purpose: <em>"{selectedExpense.description}"</em></span>
                    </div>
                  </div>

                  <div className="glass-card" style={{ background: "rgba(15,23,42,0.3)" }}>
                    <p style={{ fontSize: "0.8rem", color: "rgb(var(--color-text-muted))" }}>Vendor Bank Target</p>
                    <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <span>Payee: <strong>{selectedExpense.vendorName}</strong></span>
                      <span>Bank: <strong>{selectedExpense.vendorBankDetails?.bankName}</strong></span>
                      <span>Account: <strong>{selectedExpense.vendorBankDetails?.accountNumber}</strong></span>
                      <span>Name: <strong>{selectedExpense.vendorBankDetails?.accountName}</strong></span>
                      <span>Invoice Document: <a href="#" onClick={(e) => { e.preventDefault(); alert("Mock attachment download: " + selectedExpense.supportingDocument); }} style={{ color: "rgb(var(--color-primary))", textDecoration: "underline" }}>{selectedExpense.supportingDocument}</a></span>
                    </div>
                  </div>
                </div>

                {/* Stepper tracking */}
                <div className="glass-card" style={{ background: "rgba(15,23,42,0.2)" }}>
                  <p style={{ fontSize: "0.8rem", color: "rgb(var(--color-text-muted))", marginBottom: "1rem" }}>Execution Route Progress</p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" }}>
                    {[
                      { name: "Initiation", active: ["DRAFT", "SUBMITTED", "BUDGET_CHECK", "PENDING_APPROVAL", "APPROVED", "SENT_TO_FINANCE", "UPLOADED_TO_BANK", "PAID", "CLOSED"].includes(selectedExpense.status) },
                      { name: "Budget Check", active: ["BUDGET_CHECK", "PENDING_APPROVAL", "APPROVED", "SENT_TO_FINANCE", "UPLOADED_TO_BANK", "PAID", "CLOSED"].includes(selectedExpense.status) },
                      { name: "Approvals", active: ["PENDING_APPROVAL", "APPROVED", "SENT_TO_FINANCE", "UPLOADED_TO_BANK", "PAID", "CLOSED"].includes(selectedExpense.status) && selectedExpense.currentStepIndex > 0 },
                      { name: "Finance Audit", active: ["SENT_TO_FINANCE", "UPLOADED_TO_BANK", "PAID", "CLOSED"].includes(selectedExpense.status) },
                      { name: "Payment Release", active: ["UPLOADED_TO_BANK", "PAID", "CLOSED"].includes(selectedExpense.status) },
                      { name: "Closed", active: ["CLOSED"].includes(selectedExpense.status) }
                    ].map((step, idx) => (
                      <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", zIndex: 2 }}>
                        <div
                          style={{
                            width: "1.5rem",
                            height: "1.5rem",
                            borderRadius: "50%",
                            background: step.active ? "rgb(var(--color-secondary))" : "rgba(var(--color-card-border), 0.15)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.75rem",
                            fontWeight: "bold",
                            color: step.active ? "#0f172a" : "rgb(var(--color-text-dim))"
                          }}
                        >
                          {step.active ? "✓" : idx + 1}
                        </div>
                        <span style={{ fontSize: "0.7rem", marginTop: "0.25rem", color: step.active ? "rgb(var(--color-text))" : "rgb(var(--color-text-dim))" }}>{step.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Transition action controllers */}
                {/* 1. Finance Head exceptional budget override */}
                {currentUser.role === "FINANCE_HEAD" && selectedExpense.status === "PENDING_EXCEPTIONAL" && (
                  <div className="glass-card" style={{ border: "1px solid rgba(var(--color-accent), 0.3)" }}>
                    <p style={{ fontWeight: "bold", color: "rgb(var(--color-accent))", marginBottom: "0.5rem" }}>Finance Head Action Required: Budget Overrun detected</p>
                    <div className="form-group">
                      <label className="form-label">Adjust Approved Amount (Optional)</label>
                      <input
                        type="number"
                        placeholder={`Original amount: $${selectedExpense.amount}`}
                        value={adjustedAmount || ""}
                        onChange={(e) => setAdjustedAmount(Number(e.target.value))}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Audit justification comments</label>
                      <textarea
                        rows={2}
                        value={actionComment}
                        onChange={(e) => setActionComment(e.target.value)}
                        placeholder="Enter reason for budget expansion authorization..."
                        className="form-textarea"
                      />
                    </div>
                    <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                      <button onClick={() => handleExceptionalBudgetAction(selectedExpense._id, "RETURN")} className="btn btn-secondary">
                        Return to Initiator
                      </button>
                      <button onClick={() => handleExceptionalBudgetAction(selectedExpense._id, "REJECT")} className="btn btn-danger">
                        Reject Request
                      </button>
                      <button onClick={() => handleExceptionalBudgetAction(selectedExpense._id, "APPROVE")} className="btn btn-primary" style={{ background: "rgb(var(--color-secondary))" }}>
                        Authorize Budget Expansion
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. Standard approvers actions */}
                {selectedExpense.status === "PENDING_APPROVAL" && (
                  <div className="glass-card" style={{ border: "1px solid rgba(var(--color-primary), 0.3)" }}>
                    <p style={{ fontWeight: "bold", color: "rgb(var(--color-primary))", marginBottom: "0.5rem" }}>Workflow Approval Step Required</p>
                    
                    {(() => {
                      const requiredRole = currentUser.role;
                      return (
                        <>
                          <div className="form-group">
                            <label className="form-label">Approval comments / details</label>
                            <textarea
                              rows={2}
                              value={actionComment}
                              onChange={(e) => setActionComment(e.target.value)}
                              placeholder="Provide explanation for approve/reject/return actions..."
                              className="form-textarea"
                            />
                          </div>
                          <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                            <button onClick={() => handleWorkflowAction(selectedExpense._id, "RETURN")} className="btn btn-secondary">
                              Return to Initiator
                            </button>
                            <button onClick={() => handleWorkflowAction(selectedExpense._id, "REJECT")} className="btn btn-danger">
                              Reject
                            </button>
                            <button onClick={() => handleWorkflowAction(selectedExpense._id, "APPROVE")} className="btn btn-primary">
                              Approve Step
                            </button>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* 3. Finance Officer Audit & Upload */}
                {currentUser.role === "FINANCE_OFFICER" && selectedExpense.status === "SENT_TO_FINANCE" && (
                  <div className="glass-card" style={{ border: "1px solid rgba(var(--color-primary), 0.3)" }}>
                    <p style={{ fontWeight: "bold", color: "rgb(var(--color-primary))", marginBottom: "0.5rem" }}>Finance Officer Action: Payee Audit & Instruction Upload</p>
                    <p style={{ fontSize: "0.85rem", color: "rgb(var(--color-text-muted))", marginBottom: "1rem" }}>
                      Please confirm that the payee invoice attachment matches the requested amount. Then click the button below to upload the payment file to the banking system.
                    </p>
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button onClick={() => handleFinanceUpload(selectedExpense._id)} className="btn btn-primary">
                        Verify & Upload to Bank Platform
                      </button>
                    </div>
                  </div>
                )}

                {/* 4. Finance Manager Release Cash */}
                {currentUser.role === "FINANCE_MANAGER" && selectedExpense.status === "UPLOADED_TO_BANK" && (
                  <div className="glass-card" style={{ border: "1px solid rgba(var(--color-secondary), 0.3)" }}>
                    <p style={{ fontWeight: "bold", color: "rgb(var(--color-secondary))", marginBottom: "0.5rem" }}>Finance Manager Action: Authorize Cash Release</p>
                    <div className="form-group">
                      <label className="form-label">Bank Transaction Reference (Mandatory for ledger closure)</label>
                      <input
                        type="text"
                        required
                        value={paymentRef}
                        onChange={(e) => setPaymentRef(e.target.value)}
                        placeholder="e.g. TXN-10928374-RELEASE"
                        className="form-input"
                      />
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button onClick={() => handlePaymentRelease(selectedExpense._id)} className="btn btn-primary" style={{ background: "rgb(var(--color-secondary))" }}>
                        Release Cash Payment
                      </button>
                    </div>
                  </div>
                )}

                {/* Workflow logs history list */}
                <div>
                  <p style={{ fontSize: "0.85rem", fontWeight: "bold", marginBottom: "0.5rem", color: "rgb(var(--color-text-muted))" }}>Approval Workflow History</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {selectedExpense.history?.map((hist: any, index: number) => (
                      <div key={index} style={{ padding: "0.75rem", background: "rgba(255,255,255,0.03)", borderRadius: "4px", fontSize: "0.85rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                          <span><strong>{hist.actorName}</strong> ({hist.actorRole})</span>
                          <span style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-dim))" }}>{new Date(hist.timestamp).toLocaleString()}</span>
                        </div>
                        <div>Action: <span style={{ color: "rgb(var(--color-accent))", fontWeight: "600" }}>{hist.action}</span></div>
                        {hist.comment && <div style={{ color: "rgb(var(--color-text-muted))", fontStyle: "italic", marginTop: "0.25rem" }}>Comment: "{hist.comment}"</div>}
                      </div>
                    ))}
                    {(!selectedExpense.history || selectedExpense.history.length === 0) && (
                      <p style={{ fontSize: "0.8rem", color: "rgb(var(--color-text-dim))", fontStyle: "italic" }}>No routing records yet. Request is in Draft state.</p>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.5rem" }}>
                  <button onClick={() => { setSelectedExpense(null); setActionComment(""); }} className="btn btn-secondary">
                    Close details
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* UPDATE & RESUBMIT MODAL (RETURNED FOR CORRECTION) */}
      {showResubmitModal && selectedResubmitExpense && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.6)", zIndex: 105, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: "800px", maxHeight: "90vh", overflowY: "auto", padding: "2rem", margin: "auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontWeight: "bold" }}>Update & Resubmit: {selectedResubmitExpense.requestNumber || "REQ-0519"}</h3>
              <button onClick={() => { setShowResubmitModal(false); setSelectedResubmitExpense(null); }} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer" }}>
                <Icons.X size={24} />
              </button>
            </div>

            {formError && (
              <div className="glass-card" style={{ borderLeft: "4px solid rgb(var(--color-danger))", padding: "0.75rem", background: "rgba(239,68,68,0.05)", marginBottom: "0.5rem" }}>
                <p style={{ color: "rgb(var(--color-danger))", fontSize: "0.85rem" }}>{formError}</p>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "2rem" }}>
              {/* Left Column: Comment & Context */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {/* Pink auditor comments alert */}
                <div style={{
                  padding: "1.25rem",
                  background: "rgba(244, 63, 94, 0.08)",
                  border: "1px solid rgba(244, 63, 94, 0.3)",
                  borderRadius: "12px",
                  color: "#FCA5A5",
                  fontSize: "0.9rem"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    <Icons.AlertTriangle size={18} style={{ color: "#FB7185" }} />
                    <strong style={{ color: "#FFF" }}>{selectedResubmitExpense.auditor || "Sarah Okafor"} ({selectedResubmitExpense.auditorRole || "Approver"})</strong>
                  </div>
                  <p style={{ margin: 0, lineHeight: "1.4", fontSize: "0.85rem", fontStyle: "italic" }}>
                    "{selectedResubmitExpense.comment || "Missing original hotel receipt. The current attachment only shows the booking confirmation, not the final payment receipt from the merchant."}"
                  </p>
                </div>

                {/* Request details context */}
                <div className="glass-card" style={{ background: "rgba(15,23,42,0.3)", padding: "1rem" }}>
                  <span style={{ fontSize: "0.8rem", color: "rgb(var(--color-text-dim))", display: "block", marginBottom: "0.5rem" }}>Original Details</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.85rem" }}>
                    <span>Date: <strong>Feb 02, 2022</strong></span>
                    <span>Category: <strong>{selectedResubmitExpense.category}</strong></span>
                    <span>Amount: <strong>₦{(selectedResubmitExpense.amount || 0).toLocaleString()}</strong></span>
                    <span>Justification: <em>"{selectedResubmitExpense.description || selectedResubmitExpense.justification}"</em></span>
                  </div>
                </div>

                {/* Travel policy alert info */}
                <div className="glass-card" style={{ background: "rgba(15,23,42,0.2)", padding: "1rem" }}>
                  <span style={{ fontSize: "0.8rem", color: "rgb(var(--color-text-dim))", display: "block", marginBottom: "0.25rem" }}>Travel Policy Tip</span>
                  <p style={{ color: "rgb(var(--color-text-muted))", fontSize: "0.8rem", lineHeight: "1.4", margin: 0 }}>
                    Please note that travel per diem caps have been adjusted for Q3. Ensure hotel merchant receipts are matching the total requested daily lodging sum.
                  </p>
                </div>
              </div>

              {/* Right Column: Update & Resubmit form */}
              <form onSubmit={handleResubmitRequest} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Expense Category</label>
                  <select disabled className="form-select" style={{ background: "rgba(255,255,255,0.03)", color: "rgb(var(--color-text-dim))" }}>
                    <option>{selectedResubmitExpense.category}</option>
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Total Amount (₦)</label>
                  <input
                    type="text"
                    disabled
                    value={selectedResubmitExpense.amount}
                    className="form-input"
                    style={{ background: "rgba(255,255,255,0.03)", color: "rgb(var(--color-text-dim))" }}
                  />
                </div>

                {/* Dropzone drop attachment area */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Drop updated receipt file here</label>
                  <div
                    onClick={() => {
                      alert("Simulated upload. File Selected: hotel_invoice_final_paid.pdf");
                      setResubmitForm({ ...resubmitForm, supportingDocument: "hotel_invoice_final_paid.pdf" });
                    }}
                    style={{
                      border: "2px dashed rgba(99, 102, 241, 0.4)",
                      borderRadius: "8px",
                      padding: "2rem",
                      textAlign: "center",
                      cursor: "pointer",
                      background: "rgba(99, 102, 241, 0.02)"
                    }}
                  >
                    <Icons.UploadCloud size={32} style={{ color: "rgb(var(--color-primary))", marginBottom: "0.5rem" }} />
                    <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: "600", color: "rgb(var(--color-text))" }}>
                      {resubmitForm.supportingDocument || "Click to upload merchant receipt file"}
                    </p>
                    <span style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-dim))" }}>Supports PDF, PNG, JPG up to 10MB</span>
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Justification / Correction Explanation</label>
                  <textarea
                    required
                    rows={3}
                    value={resubmitForm.justification}
                    onChange={(e) => setResubmitForm({ ...resubmitForm, justification: e.target.value })}
                    placeholder="Describe how the audit feedback was resolved (e.g., uploaded final receipt)..."
                    className="form-textarea"
                  />
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem" }}>
                  <input
                    type="checkbox"
                    id="notifyAuditor"
                    checked={resubmitForm.notifyAuditor}
                    onChange={(e) => setResubmitForm({ ...resubmitForm, notifyAuditor: e.target.checked })}
                    style={{ cursor: "pointer", width: "16px", height: "16px" }}
                  />
                  <label htmlFor="notifyAuditor" style={{ fontSize: "0.85rem", cursor: "pointer", color: "rgb(var(--color-text-muted))" }}>
                    Notify auditor on Slack directly
                  </label>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem" }}>
                  <button
                    type="button"
                    onClick={() => { setShowResubmitModal(false); setSelectedResubmitExpense(null); }}
                    className="btn btn-secondary"
                  >
                    Discard Changes
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ background: "rgb(var(--color-primary))" }}>
                    Resubmit Request
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MOCK RECEIPT VIEW OVERLAY MODAL */}
      {showReceiptModal && selectedReceiptData && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.6)", zIndex: 105, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: "450px", padding: "2rem", margin: "auto", display: "flex", flexDirection: "column", gap: "1.5rem", textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: "700", fontSize: "0.95rem" }}>Transaction Invoice Receipt</span>
              <button onClick={() => { setShowReceiptModal(false); setSelectedReceiptData(null); }} style={{ background: "none", border: "none", color: "rgb(var(--color-text))", cursor: "pointer" }}>
                <Icons.X size={20} />
              </button>
            </div>

            <div style={{ padding: "1.5rem", background: "rgba(var(--color-card-border), 0.1)", borderRadius: "12px", border: "1px solid rgba(var(--color-card-border), 0.2)", display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center" }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(16,185,129,0.15)", color: "#10B981", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "0.5rem" }}>
                <Icons.CheckCircle size={28} />
              </div>
              <div>
                <h4 style={{ fontSize: "1.5rem", fontWeight: "bold", margin: "0" }}>₦{(selectedReceiptData.amount || 12000).toLocaleString()}</h4>
                <p style={{ color: "#10B981", fontSize: "0.85rem", margin: "0.25rem 0 0" }}><span className="badge badge-paid">PAID</span></p>
              </div>

              <div style={{ width: "100%", borderTop: "1px dashed rgba(var(--color-card-border), 0.4)", margin: "0.5rem 0" }} />

              <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.85rem", textAlign: "left" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "rgb(var(--color-text-dim))" }}>Bank Reference</span>
                  <strong style={{ fontFamily: "monospace" }}>{selectedReceiptData.reference || "BNK-2026-0829-01"}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "rgb(var(--color-text-dim))" }}>Category</span>
                  <strong>{selectedReceiptData.category || "Software & Services"}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "rgb(var(--color-text-dim))" }}>Request ID</span>
                  <strong>{selectedReceiptData.requestNumber || "REQ-0482"}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "rgb(var(--color-text-dim))" }}>Date Cleared</span>
                  <strong>{new Date().toLocaleDateString()}</strong>
                </div>
              </div>
            </div>

            <button onClick={() => { setShowReceiptModal(false); setSelectedReceiptData(null); }} className="btn btn-primary" style={{ width: "100%" }}>
              Done / Close
            </button>
          </div>
        </div>
      )}

      {/* POLICY MODAL */}
      {showPolicyModal && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.6)", zIndex: 105, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: "550px", padding: "2rem", margin: "auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontWeight: "bold" }}>Per Diem Travel Policy Update</h3>
              <button onClick={() => setShowPolicyModal(false)} style={{ background: "none", border: "none", color: "rgb(var(--color-text))", cursor: "pointer" }}>
                <Icons.X size={24} />
              </button>
            </div>

            <p style={{ fontSize: "0.9rem", color: "rgb(var(--color-text-muted))" }}>
              The following standard domestic travel per diem limits are active from August 1, 2026 for all departments:
            </p>

            <div className="table-container" style={{ margin: "0.5rem 0" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Location Region</th>
                    <th>Lodging Cap (per Night)</th>
                    <th>Meal / Local Per Diem</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Lagos Met</strong></td>
                    <td>₦50,000</td>
                    <td>₦15,000</td>
                  </tr>
                  <tr>
                    <td><strong>Abuja (FCT)</strong></td>
                    <td>₦45,000</td>
                    <td>₦12,500</td>
                  </tr>
                  <tr>
                    <td><strong>Other States</strong></td>
                    <td>₦30,000</td>
                    <td>₦8,000</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="glass-card" style={{ background: "rgba(15,23,42,0.3)", padding: "1rem", borderLeft: "4px solid rgb(var(--color-primary))" }}>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "rgb(var(--color-text-muted))", lineHeight: "1.4" }}>
                <strong>Important:</strong> Reimbursable lodging requires an original hotel billing invoice containing merchant logo and paid validation seal. Pre-booking confirmations are not acceptable.
              </p>
            </div>

            <button onClick={() => setShowPolicyModal(false)} className="btn btn-primary" style={{ alignSelf: "flex-end" }}>
              I Understand
            </button>
          </div>
        </div>
      )}

      {/* INVITE USER DIALOG MODAL */}
      {showInviteModal && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: "500px", padding: "2rem", margin: "auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontWeight: "bold" }}>Invite New User</h3>
              <button onClick={() => setShowInviteModal(false)} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer" }}>
                <Icons.X size={24} />
              </button>
            </div>

            {inviteError && (
              <div className="glass-card" style={{ borderLeft: "4px solid rgb(var(--color-danger))", padding: "0.75rem", background: "rgba(239,68,68,0.05)" }}>
                <p style={{ color: "rgb(var(--color-danger))", fontSize: "0.85rem" }}>{inviteError}</p>
              </div>
            )}

            <form onSubmit={handleInviteUser} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Rivera"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. alex.rivera@corporate.finance"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="form-input"
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Role</label>
                  <select
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                    className="form-select"
                  >
                    <option value="INITIATOR">Initiator</option>
                    <option value="APPROVER">Approver</option>
                    <option value="FINANCE_OFFICER">Finance Officer</option>
                    <option value="FINANCE_MANAGER">Finance Manager</option>
                    <option value="FINANCE_HEAD">Finance Head</option>
                    <option value="ADMIN">System Admin</option>
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Department (Optional)</label>
                  <select
                    value={inviteForm.departmentId}
                    onChange={(e) => setInviteForm({ ...inviteForm, departmentId: e.target.value })}
                    className="form-select"
                  >
                    <option value="">None / Corporate Global</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem" }}>
                <button type="button" onClick={() => setShowInviteModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={inviteSubmitting} className="btn btn-primary">
                  {inviteSubmitting ? "Inviting..." : "Send Invitation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INVITATION SUCCESS & EMAIL PREVIEW MODAL */}
      {inviteResult && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.6)", zIndex: 110, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: "650px", maxHeight: "90vh", overflowY: "auto", padding: "2rem", margin: "auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "rgb(var(--color-secondary))" }}>
                <Icons.CheckCircle size={24} />
                <h3 style={{ fontWeight: "bold", color: "#fff" }}>Invitation Successful</h3>
              </div>
              <button onClick={() => setInviteResult(null)} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer" }}>
                <Icons.X size={24} />
              </button>
            </div>

            <p style={{ fontSize: "0.9rem", color: "rgb(var(--color-text-muted))" }}>
              The user record has been created. An invitation email was simulated. You can preview the email template and copy the setup URL below.
            </p>

            <div className="glass-card" style={{ background: "rgba(15,23,42,0.3)", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <span style={{ fontSize: "0.8rem", color: "rgb(var(--color-text-dim))", textTransform: "uppercase", fontWeight: "bold" }}>Setup Activation Link</span>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input 
                  type="text" 
                  readOnly 
                  value={inviteResult.inviteUrl} 
                  style={{ flexGrow: 1, padding: "0.5rem", borderRadius: "4px", background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: "0.85rem" }} 
                />
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(inviteResult.inviteUrl);
                    alert("Invite link copied to clipboard!");
                  }}
                  className="btn btn-primary"
                  style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}
                >
                  Copy Link
                </button>
              </div>
              <a href={inviteResult.inviteUrl} target="_blank" style={{ fontSize: "0.8rem", color: "rgb(var(--color-primary))", textDecoration: "underline", alignSelf: "flex-start" }}>
                Open Activation Page directly &rarr;
              </a>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.8rem", color: "rgb(var(--color-text-dim))", textTransform: "uppercase", fontWeight: "bold" }}>Decoupled HTML Email Preview</span>
              <iframe 
                srcDoc={inviteResult.emailHtml} 
                title="Email Preview" 
                style={{ 
                  width: "100%", 
                  height: "360px", 
                  border: "1px solid rgba(255, 255, 255, 0.1)", 
                  borderRadius: "8px", 
                  background: "#fff" 
                }} 
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => { setInviteResult(null); setShowInviteModal(false); }} className="btn btn-secondary">
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PROFILE MODAL */}
      {showEditProfileModal && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: "520px", padding: "2rem", margin: "auto", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h3 style={{ fontWeight: "700", fontSize: "1.25rem", color: "rgb(var(--color-text))" }}>Edit Profile</h3>
                <p style={{ color: "rgb(var(--color-text-dim))", fontSize: "0.8rem", marginTop: "0.15rem" }}>Manage your professional information and account details.</p>
              </div>
              <button onClick={() => setShowEditProfileModal(false)} style={{ background: "none", border: "none", color: "rgb(var(--color-text))", cursor: "pointer", padding: "0.25rem" }}>
                <Icons.X size={20} />
              </button>
            </div>

            <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.08)", margin: 0 }} />

            <form onSubmit={handleUpdateProfile} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {/* Profile Photo Row */}
              <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
                <div 
                  onClick={() => {
                    setShowEditProfileModal(false);
                    setShowUpdatePhotoModal(true);
                  }}
                  style={{ position: "relative", cursor: "pointer" }}
                >
                  <img 
                    src={editProfileForm.avatar || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200&auto=format&fit=crop"} 
                    alt="Photo" 
                    style={{ width: 68, height: 68, borderRadius: "50%", objectFit: "cover" }}
                  />
                  <div className="avatar-camera-badge" style={{ bottom: 0, right: 0, width: 22, height: 22, border: "1.5px solid rgb(var(--color-surface))" }}>
                    <Icons.Camera size={12} />
                  </div>
                </div>
                <div>
                  <h4 style={{ fontSize: "0.9rem", fontWeight: "700", color: "rgb(var(--color-text))" }}>Profile Photo</h4>
                  <p style={{ color: "rgb(var(--color-text-dim))", fontSize: "0.75rem", marginTop: "0.1rem" }}>Update your photo for team recognition.</p>
                  <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem", alignItems: "center" }}>
                    <button 
                      type="button" 
                      onClick={() => {
                        setShowEditProfileModal(false);
                        setShowUpdatePhotoModal(true);
                      }}
                      className="btn btn-secondary" 
                      style={{ padding: "0.35rem 0.75rem", fontSize: "0.75rem", background: "none", border: "1px solid rgba(255,255,255,0.12)", color: "rgb(var(--color-text))" }}
                    >
                      Change Photo
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setEditProfileForm({ ...editProfileForm, avatar: "" })}
                      className="btn btn-link" 
                      style={{ border: "none", background: "none", color: "#EF4444", fontSize: "0.75rem", cursor: "pointer", padding: 0 }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>

              {/* Grid Fields */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: "700" }}>Full Name</label>
                  <input
                    type="text"
                    required
                    value={editProfileForm.name}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, name: e.target.value })}
                    className="form-input"
                    style={{ fontSize: "0.85rem", padding: "0.6rem 0.85rem" }}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: "700" }}>Email Address</label>
                  <div className="icon-input-wrapper">
                    <input
                      type="email"
                      required
                      value={editProfileForm.email}
                      onChange={(e) => setEditProfileForm({ ...editProfileForm, email: e.target.value })}
                      className="form-input icon-input-field"
                      style={{ fontSize: "0.85rem", padding: "0.6rem 2.25rem 0.6rem 0.85rem" }}
                    />
                    <div className="input-icon-right">
                      <Icons.Mail size={16} />
                    </div>
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: "700" }}>Role</label>
                  <div className="icon-input-wrapper">
                    <input
                      type="text"
                      disabled
                      value={currentUser?.role === "INITIATOR" ? "Expense Initiator" : currentUser?.role === "APPROVER" ? "Department Approver" : currentUser?.role?.replace(/_/g, " ") || "Member"}
                      className="form-input icon-input-field"
                      style={{ fontSize: "0.85rem", padding: "0.6rem 2.25rem 0.6rem 0.85rem", background: "rgba(99, 102, 241, 0.05)", cursor: "not-allowed" }}
                    />
                    <div className="input-icon-right">
                      <Icons.Lock size={16} />
                    </div>
                  </div>
                  <span style={{ fontSize: "0.7rem", color: "rgb(var(--color-text-dim))", marginTop: "0.25rem", display: "block", fontStyle: "italic" }}>Managed by Administration</span>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: "700" }}>Department</label>
                  <div className="icon-input-wrapper">
                    <input
                      type="text"
                      disabled
                      value={currentUser?.departmentName || "Operations"}
                      className="form-input icon-input-field"
                      style={{ fontSize: "0.85rem", padding: "0.6rem 2.25rem 0.6rem 0.85rem", background: "rgba(99, 102, 241, 0.05)", cursor: "not-allowed" }}
                    />
                    <div className="input-icon-right">
                      <Icons.Lock size={16} />
                    </div>
                  </div>
                  <span style={{ fontSize: "0.7rem", color: "rgb(var(--color-text-dim))", marginTop: "0.25rem", display: "block", fontStyle: "italic" }}>Fixed attribute</span>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: "700" }}>Official Contact</label>
                  <input
                    type="text"
                    value={editProfileForm.officialContact}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, officialContact: e.target.value })}
                    className="form-input"
                    style={{ fontSize: "0.85rem", padding: "0.6rem 0.85rem" }}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: "700" }}>Personal Contact</label>
                  <input
                    type="text"
                    value={editProfileForm.personalContact}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, personalContact: e.target.value })}
                    className="form-input"
                    style={{ fontSize: "0.85rem", padding: "0.6rem 0.85rem" }}
                  />
                </div>
              </div>

              {/* Info Banner */}
              <div className="info-box-banner">
                <Icons.Info size={16} style={{ color: "rgb(var(--color-primary))", flexShrink: 0, marginTop: "2px" }} />
                <span>Some fields are managed by your organization's directory service and cannot be changed manually. Contact HR for department or role updates.</span>
              </div>

              <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.08)", margin: 0 }} />

              <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setShowEditProfileModal(false)} className="btn btn-secondary" style={{ background: "none", border: "none", color: "rgb(var(--color-text-muted))" }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ padding: "0.55rem 1.25rem", borderRadius: "8px", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  Save Changes <Icons.CheckCircle size={16} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPDATE PROFILE PHOTO MODAL */}
      {showUpdatePhotoModal && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.6)", zIndex: 101, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: "460px", padding: "2rem", margin: "auto", display: "flex", flexDirection: "column", gap: "1.25rem", textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontWeight: "700", fontSize: "1.15rem", color: "rgb(var(--color-text))" }}>Update Profile Photo</h3>
              <button 
                onClick={() => {
                  setShowUpdatePhotoModal(false);
                  setShowEditProfileModal(true);
                }} 
                style={{ background: "none", border: "none", color: "rgb(var(--color-text))", cursor: "pointer", padding: "0.25rem" }}
              >
                <Icons.X size={20} />
              </button>
            </div>

            <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.08)", margin: 0 }} />

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", margin: "1rem 0" }}>
              <img 
                src={editProfileForm.avatar || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200&auto=format&fit=crop"} 
                alt="Avatar" 
                style={{ width: 120, height: 120, borderRadius: "50%", objectFit: "cover", border: "4px solid rgba(99,102,241,0.15)" }}
              />
              <span style={{ fontSize: "1.05rem", fontWeight: "700" }}>{currentUser?.name}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: "1.25rem", alignItems: "center" }}>
              <input 
                type="file"
                id="avatar-file-input"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.size > 5 * 1024 * 1024) {
                      alert("File is too large! Maximum allowed size is 5MB.");
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      if (event.target?.result) {
                        setEditProfileForm({ ...editProfileForm, avatar: event.target.result as string });
                      }
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
              <button 
                type="button" 
                onClick={() => document.getElementById("avatar-file-input")?.click()}
                className="btn btn-secondary" 
                style={{ padding: "0.45rem 1rem", fontSize: "0.85rem", background: "none", border: "1px solid rgba(255,255,255,0.15)" }}
              >
                Change Photo
              </button>
              <button 
                type="button" 
                onClick={() => setEditProfileForm({ ...editProfileForm, avatar: "" })}
                className="btn btn-link" 
                style={{ background: "none", border: "none", color: "#EF4444", fontSize: "0.85rem", fontWeight: "600", cursor: "pointer" }}
              >
                Remove
              </button>
            </div>

            <div className="info-box-banner" style={{ textAlign: "left" }}>
              <Icons.Info size={16} style={{ color: "rgb(var(--color-primary))", flexShrink: 0, marginTop: "2px" }} />
              <span>Max file size 5MB. Recommended square dimensions (1:1 ratio) for best results in the Precision dashboard and reports.</span>
            </div>

            <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.08)", margin: 0 }} />

            <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
              <button 
                type="button" 
                onClick={() => {
                  setShowUpdatePhotoModal(false);
                  setShowEditProfileModal(true);
                }} 
                className="btn btn-secondary" 
                style={{ background: "none", border: "none", color: "rgb(var(--color-text-muted))" }}
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setShowUpdatePhotoModal(false);
                  setShowEditProfileModal(true);
                }}
                className="btn btn-primary" 
                style={{ padding: "0.55rem 1.25rem", borderRadius: "8px", fontWeight: "600" }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UPDATE PASSWORD MODAL */}
      {showChangePasswordModal && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: "460px", padding: "2rem", margin: "auto", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontWeight: "700", fontSize: "1.15rem", color: "rgb(var(--color-text))" }}>Update Password</h3>
              <button onClick={() => setShowChangePasswordModal(false)} style={{ background: "none", border: "none", color: "rgb(var(--color-text))", cursor: "pointer", padding: "0.25rem" }}>
                <Icons.X size={20} />
              </button>
            </div>

            <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.08)", margin: 0 }} />

            {settingsMessage && (
              <div className="glass-card" style={{ borderLeft: "4px solid #10B981", background: "rgba(16,185,129,0.05)", padding: "0.75rem" }}>
                <p style={{ color: "#10B981", fontSize: "0.85rem", margin: 0 }}>{settingsMessage}</p>
              </div>
            )}
            {settingsError && (
              <div className="glass-card" style={{ borderLeft: "4px solid #EF4444", background: "rgba(239,68,68,0.05)", padding: "0.75rem" }}>
                <p style={{ color: "#EF4444", fontSize: "0.85rem", margin: 0 }}>{settingsError}</p>
              </div>
            )}

            <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: "700" }}>Current Password</label>
                <div className="icon-input-wrapper">
                  <input
                    type={showPasswordCurrentToggle ? "text" : "password"}
                    required
                    value={settingsForm.currentPassword}
                    onChange={(e) => setSettingsForm({ ...settingsForm, currentPassword: e.target.value })}
                    className="form-input icon-input-field"
                    placeholder="Enter current password"
                    style={{ fontSize: "0.85rem", padding: "0.6rem 2.25rem 0.6rem 0.85rem" }}
                  />
                  <div className="input-icon-right" onClick={() => setShowPasswordCurrentToggle(!showPasswordCurrentToggle)}>
                    {showPasswordCurrentToggle ? <Icons.EyeOff size={16} /> : <Icons.Eye size={16} />}
                  </div>
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: "700" }}>New Password</label>
                <div className="icon-input-wrapper">
                  <input
                    type={showPasswordNewToggle ? "text" : "password"}
                    required
                    value={settingsForm.newPassword}
                    onChange={(e) => setSettingsForm({ ...settingsForm, newPassword: e.target.value })}
                    className="form-input icon-input-field"
                    placeholder="Enter new password"
                    style={{ fontSize: "0.85rem", padding: "0.6rem 2.25rem 0.6rem 0.85rem" }}
                  />
                  <div className="input-icon-right" onClick={() => setShowPasswordNewToggle(!showPasswordNewToggle)}>
                    {showPasswordNewToggle ? <Icons.EyeOff size={16} /> : <Icons.Eye size={16} />}
                  </div>
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: "700" }}>Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={settingsForm.confirmPassword}
                  onChange={(e) => setSettingsForm({ ...settingsForm, confirmPassword: e.target.value })}
                  className="form-input"
                  placeholder="Re-enter new password"
                  style={{ fontSize: "0.85rem", padding: "0.6rem 0.85rem" }}
                />
              </div>

              <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.08)", margin: 0 }} />

              <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setShowChangePasswordModal(false)} className="btn btn-secondary" style={{ background: "none", border: "none", color: "rgb(var(--color-text-muted))" }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ padding: "0.55rem 1.25rem", borderRadius: "8px", fontWeight: "600" }}>
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
