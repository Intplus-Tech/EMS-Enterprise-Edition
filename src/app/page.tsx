"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import * as Icons from "lucide-react";
import { BRANDING } from "../config/branding";

// Helper component to render Lucide Icons dynamically
const DynamicIcon = ({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) => {
  const LucideIcon = (Icons as any)[name];
  if (!LucideIcon) return <Icons.HelpCircle className={className} style={style} />;
  return <LucideIcon className={className} style={style} />;
};

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
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState("ALL");
  const [settingsForm, setSettingsForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [settingsMessage, setSettingsMessage] = useState("");
  const [settingsError, setSettingsError] = useState("");

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
    const standardTabs = ["dashboard", "expenses", "workflow", "logs", "users"];
    
    if (currentUser.role === "INITIATOR") {
      if (!initiatorTabs.includes(activeTab)) {
        setActiveTab("requests");
      }
    } else {
      if (!standardTabs.includes(activeTab)) {
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
          ) : (
            <>
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
              
              <button
                onClick={() => setActiveTab("expenses")}
                className="btn"
                style={{
                  justifyContent: "flex-start",
                  background: activeTab === "expenses" ? "rgba(255, 255, 255, 0.08)" : "transparent",
                  color: activeTab === "expenses" ? "rgb(var(--color-text))" : "rgb(var(--color-text-muted))"
                }}
              >
                <Icons.Receipt size={18} /> Expense Requests
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
        <div style={{ marginTop: "auto", padding: "0.5rem", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.25rem 0.5rem" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "rgb(var(--color-secondary))" }} />
            <span style={{ fontSize: "0.8rem", color: "rgb(var(--color-text-muted))", fontWeight: "600" }}>{currentUser?.name}</span>
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
              fontSize: "0.8rem",
              fontWeight: "600",
              cursor: "pointer",
              padding: "0.25rem 0.5rem",
              borderRadius: "4px",
              textAlign: "left",
              transition: "background 0.2s"
            }}
            onMouseOver={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)"}
            onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
          >
            {theme === "light" ? <Icons.Moon size={14} /> : <Icons.Sun size={14} />}
            {theme === "light" ? "Dark Mode" : "Light Mode"}
          </button>

          <button
            onClick={handleLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "transparent",
              border: "none",
              color: "#EF4444",
              fontSize: "0.8rem",
              fontWeight: "600",
              cursor: "pointer",
              padding: "0.25rem 0.5rem",
              borderRadius: "4px",
              textAlign: "left",
              transition: "background 0.2s"
            }}
            onMouseOver={(e) => e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)"}
            onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
          >
            <Icons.LogOut size={14} /> Logout
          </button>
        </div>
      </div>

      {/* Main dashboard content area */}
      <div className="main-content">
        
        {/* VIEW: DASHBOARD PANEL */}
        {activeTab === "dashboard" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
              <div>
                <h2>Welcome Back, {currentUser?.name}</h2>
                <p style={{ color: "rgb(var(--color-text-muted))", fontSize: "0.9rem" }}>Role: <span className="badge badge-draft">{currentUser?.role}</span></p>
              </div>
              {currentUser?.role === "INITIATOR" && (
                <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
                  <Icons.Plus size={16} /> New Expense Request
                </button>
              )}
            </div>

            {/* Metrics cards */}
            {metrics && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.5rem", marginBottom: "2.5rem" }}>
                <div className="glass-card" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{ padding: "0.75rem", borderRadius: "0.5rem", background: "rgba(var(--color-primary), 0.15)" }}>
                    <Icons.DollarSign size={24} style={{ color: "rgb(var(--color-primary))" }} />
                  </div>
                  <div>
                    <p style={{ color: "rgb(var(--color-text-muted))", fontSize: "0.85rem" }}>Corporate Budget Pool</p>
                    <h3 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>${metrics.corporate.totalBudget.toLocaleString()}</h3>
                  </div>
                </div>

                <div className="glass-card" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{ padding: "0.75rem", borderRadius: "0.5rem", background: "rgba(var(--color-secondary), 0.15)" }}>
                    <Icons.TrendingUp size={24} style={{ color: "rgb(var(--color-secondary))" }} />
                  </div>
                  <div>
                    <p style={{ color: "rgb(var(--color-text-muted))", fontSize: "0.85rem" }}>Utilised Budget</p>
                    <h3 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>${metrics.corporate.utilisedBudget.toLocaleString()}</h3>
                  </div>
                </div>

                <div className="glass-card" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{ padding: "0.75rem", borderRadius: "0.5rem", background: "rgba(var(--color-accent), 0.15)" }}>
                    <Icons.Lock size={24} style={{ color: "rgb(var(--color-accent))" }} />
                  </div>
                  <div>
                    <p style={{ color: "rgb(var(--color-text-muted))", fontSize: "0.85rem" }}>Pending Approval Hold</p>
                    <h3 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>${metrics.corporate.pendingBudget.toLocaleString()}</h3>
                  </div>
                </div>

                <div className="glass-card" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{ padding: "0.75rem", borderRadius: "0.5rem", background: "rgba(var(--color-secondary), 0.1)" }}>
                    <Icons.CheckCircle size={24} style={{ color: "rgb(var(--color-secondary))" }} />
                  </div>
                  <div>
                    <p style={{ color: "rgb(var(--color-text-muted))", fontSize: "0.85rem" }}>Available Balance</p>
                    <h3 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>${metrics.corporate.availableBudget.toLocaleString()}</h3>
                  </div>
                </div>
              </div>
            )}

            {/* Department budgets progression */}
            {metrics?.departmentBudgets && (
              <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "2rem" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "1rem" }}>Departmental Budget Allocations</h3>
                <div style={{ display: "grid", gap: "1rem" }}>
                  {metrics.departmentBudgets.map((dept: any) => {
                    const pct = Math.min(100, Math.round(((dept.utilisedBudget + dept.pendingBudget) / dept.totalBudget) * 100));
                    return (
                      <div key={dept.id} style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                          <span style={{ fontWeight: "600" }}>{dept.departmentName} ({dept.periodName})</span>
                          <span style={{ color: "rgb(var(--color-text-muted))" }}>
                            Spent: ${dept.utilisedBudget.toLocaleString()} | Hold: ${dept.pendingBudget.toLocaleString()} of ${dept.totalBudget.toLocaleString()}
                          </span>
                        </div>
                        <div style={{ height: "8px", background: "rgba(255,255,255,0.06)", borderRadius: "999px", overflow: "hidden" }}>
                          <div
                            style={{
                              height: "100%",
                              width: `${pct}%`,
                              background: pct > 90 ? "rgb(var(--color-danger))" : pct > 60 ? "rgb(var(--color-accent))" : "rgb(var(--color-secondary))",
                              borderRadius: "999px"
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action Required Board */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "2rem" }}>
              <div className="glass-panel" style={{ padding: "1.5rem" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Icons.Bell size={18} style={{ color: "rgb(var(--color-accent))" }} /> Attention Required Actions
                </h3>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Req Number</th>
                        <th>Initiator</th>
                        <th>Category</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.filter(exp => {
                        // Logic to show which requests user must take action on:
                        if (currentUser.role === "FINANCE_HEAD" && exp.status === "PENDING_EXCEPTIONAL") return true;
                        if (currentUser.role === "APPROVER" && exp.status === "PENDING_APPROVAL" && exp.currentStepIndex === 0) return true;
                        if (currentUser.role === "FINANCE_OFFICER" && exp.status === "SENT_TO_FINANCE") return true;
                        if (currentUser.role === "FINANCE_MANAGER" && exp.status === "UPLOADED_TO_BANK") return true;
                        return false;
                      }).map((exp) => (
                        <tr key={exp._id}>
                          <td><strong>{exp.requestNumber}</strong></td>
                          <td>{exp.initiatorId?.name}</td>
                          <td>{exp.category}</td>
                          <td>${exp.amount.toLocaleString()}</td>
                          <td><span className={`badge badge-${exp.status.toLowerCase().replace(/_/g, '-')}`}>{exp.status}</span></td>
                          <td>
                            <button onClick={() => setSelectedExpense(exp)} className="btn btn-primary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}>
                              Process Action
                            </button>
                          </td>
                        </tr>
                      ))}
                      {expenses.filter(exp => {
                        if (currentUser.role === "FINANCE_HEAD" && exp.status === "PENDING_EXCEPTIONAL") return true;
                        if (currentUser.role === "APPROVER" && exp.status === "PENDING_APPROVAL" && exp.currentStepIndex === 0) return true;
                        if (currentUser.role === "FINANCE_OFFICER" && exp.status === "SENT_TO_FINANCE") return true;
                        if (currentUser.role === "FINANCE_MANAGER" && exp.status === "UPLOADED_TO_BANK") return true;
                        return false;
                      }).length === 0 && (
                        <tr>
                          <td colSpan={6} style={{ textAlign: "center", color: "rgb(var(--color-text-dim))" }}>
                            All caught up! No pending actions for your role.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: INITIATOR REQUESTS */}
        {activeTab === "requests" && currentUser?.role === "INITIATOR" && (
          <div>
            {/* Search Header & Notifications Popover */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", gap: "1rem" }}>
              {/* Search Bar */}
              <div style={{ position: "relative", flexGrow: 1, maxWidth: "400px" }}>
                <Icons.Search size={18} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "rgb(var(--color-text-dim))" }} />
                <input
                  type="text"
                  placeholder="Search requests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: "2.75rem", background: "rgba(30, 41, 59, 0.45)", borderRadius: "999px" }}
                />
              </div>

              {/* Action Buttons & Notifications Bell */}
              <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
                {/* Notification Bell */}
                <div style={{ position: "relative" }}>
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="btn btn-secondary"
                    style={{ padding: "0.6rem", borderRadius: "50%", background: "rgba(30, 41, 59, 0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <Icons.Bell size={20} />
                    {notifications.length > 0 && (
                      <span style={{ position: "absolute", top: 2, right: 2, width: 8, height: 8, background: "#EF4444", borderRadius: "50%" }} />
                    )}
                  </button>

                  {/* Notifications Popover Dropdown */}
                  {showNotifications && (
                    <div className="glass-panel" style={{
                      position: "absolute",
                      right: 0,
                      top: "120%",
                      width: "360px",
                      padding: "1.25rem",
                      zIndex: 50,
                      boxShadow: "var(--shadow-lg)",
                      border: "1px solid rgba(255, 255, 255, 0.12)"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                        <span style={{ fontWeight: "700", fontSize: "0.95rem" }}>Notifications</span>
                        <button
                          onClick={() => { setNotifications([]); setShowNotifications(false); }}
                          style={{ background: "none", border: "none", color: "rgb(var(--color-primary))", fontSize: "0.8rem", fontWeight: "600", cursor: "pointer" }}
                        >
                          Mark all as read
                        </button>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "320px", overflowY: "auto" }}>
                        {notifications.map((notif) => (
                          <div key={notif.id} style={{
                            padding: "0.75rem",
                            background: "rgba(255, 255, 255, 0.03)",
                            borderRadius: "8px",
                            borderLeft: `4px solid ${
                              notif.type === "RETURNED" ? "#EF4444" :
                              notif.type === "APPROVED" ? "#10B981" :
                              notif.type === "PAID" ? "#10B981" :
                              "#3B82F6"
                            }`,
                            fontSize: "0.85rem"
                          }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                              <strong style={{
                                color:
                                  notif.type === "RETURNED" ? "#FCA5A5" :
                                  notif.type === "APPROVED" ? "#A7F3D0" :
                                  notif.type === "PAID" ? "#A7F3D0" :
                                  "#93C5FD"
                              }}>
                                {notif.title}
                              </strong>
                              <span style={{ fontSize: "0.7rem", color: "rgb(var(--color-text-dim))" }}>{notif.time}</span>
                            </div>
                            <p style={{ color: "rgb(var(--color-text-muted))", fontSize: "0.8rem", marginBottom: "0.5rem", lineHeight: "1.4" }}>
                              {notif.message}
                            </p>
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                              {notif.type === "RETURNED" && (
                                <>
                                  <button
                                    onClick={() => {
                                      setSelectedResubmitExpense({
                                        ...notif.meta,
                                        id: notif.requestId
                                      });
                                      setResubmitForm({
                                        justification: "",
                                        supportingDocument: "hotel_invoice_final_paid.pdf",
                                        notifyAuditor: true
                                      });
                                      setShowResubmitModal(true);
                                      setShowNotifications(false);
                                    }}
                                    className="btn btn-primary"
                                    style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", background: "#EF4444" }}
                                  >
                                    Review & Resubmit
                                  </button>
                                  <button
                                    onClick={() => setNotifications(prev => prev.filter(n => n.id !== notif.id))}
                                    className="btn btn-secondary"
                                    style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                                  >
                                    Dismiss
                                  </button>
                                </>
                              )}
                              {notif.type === "APPROVED" && (
                                <button
                                  onClick={() => {
                                    // Open mock detail
                                    setSelectedExpense({
                                      _id: notif.requestId,
                                      requestNumber: notif.meta.requestNumber,
                                      category: notif.meta.category,
                                      amount: notif.meta.amount,
                                      description: notif.meta.description,
                                      vendorName: notif.meta.vendorName,
                                      requiredPaymentDate: new Date().toISOString(),
                                      status: notif.meta.status,
                                      vendorBankDetails: {
                                        bankName: notif.meta.bankName,
                                        accountNumber: notif.meta.accountNumber,
                                        accountName: notif.meta.accountName
                                      },
                                      supportingDocument: "invoice.pdf"
                                    });
                                    setShowNotifications(false);
                                  }}
                                  className="btn btn-secondary"
                                  style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                                >
                                  View Details
                                </button>
                              )}
                              {notif.type === "PAID" && (
                                <>
                                  <button
                                    onClick={() => {
                                      setSelectedReceiptData(notif.meta);
                                      setShowReceiptModal(true);
                                      setShowNotifications(false);
                                    }}
                                    className="btn btn-primary"
                                    style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", background: "rgb(var(--color-primary))" }}
                                  >
                                    View Receipt
                                  </button>
                                  <button
                                    onClick={() => setNotifications(prev => prev.filter(n => n.id !== notif.id))}
                                    className="btn btn-secondary"
                                    style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                                  >
                                    Dismiss
                                  </button>
                                </>
                              )}
                              {notif.type === "POLICY" && (
                                <>
                                  <button
                                    onClick={() => {
                                      setShowPolicyModal(true);
                                      setShowNotifications(false);
                                    }}
                                    className="btn btn-primary"
                                    style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", background: "rgb(var(--color-primary))" }}
                                  >
                                    Read Policy
                                  </button>
                                  <button
                                    onClick={() => setNotifications(prev => prev.filter(n => n.id !== notif.id))}
                                    className="btn btn-secondary"
                                    style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                                  >
                                    Dismiss
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                        {notifications.length === 0 && (
                          <p style={{ color: "rgb(var(--color-text-dim))", fontSize: "0.8rem", textAlign: "center", padding: "1rem" }}>
                            No new notifications
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Raise Request trigger button */}
                <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
                  <Icons.Plus size={16} /> New Request
                </button>
              </div>
            </div>

            {/* View Title */}
            <div style={{ marginBottom: "2rem" }}>
              <h2 style={{ fontSize: "1.75rem", fontWeight: "bold" }}>Requests</h2>
              <p style={{ color: "rgb(var(--color-text-muted))", fontSize: "0.95rem" }}>Review and manage your pending financial actions.</p>
            </div>

            {/* Spent Summary Statistics Cards */}
            {(() => {
              const now = new Date();
              const currentMonth = now.getMonth();
              const currentYear = now.getFullYear();
              let totalSpent = 0;
              let totalRequests = expenses.length;
              let myDrafts = 0;

              expenses.forEach(e => {
                const expDate = new Date(e.createdAt);
                if ((e.status === "PAID" || e.status === "CLOSED") && expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear) {
                  totalSpent += e.amount;
                }
                if (e.status === "DRAFT" || e.status === "RETURNED") {
                  myDrafts += 1;
                }
              });

              // Apply mock data falls for empty databases to preserve mock layout visually
              if (totalSpent === 0) totalSpent = 4850200;
              if (totalRequests === 0) totalRequests = 9;
              if (myDrafts === 0) myDrafts = 14;

              return (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem", marginBottom: "2.5rem" }}>
                  <div className="glass-card" style={{ display: "flex", alignItems: "center", gap: "1.25rem", background: "rgba(30, 41, 59, 0.3)" }}>
                    <div style={{ padding: "0.85rem", borderRadius: "0.75rem", background: "rgba(99, 102, 241, 0.15)", color: "rgb(var(--color-primary))", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icons.DollarSign size={24} />
                    </div>
                    <div>
                      <p style={{ color: "rgb(var(--color-text-dim))", fontSize: "0.8rem", fontWeight: "600", textTransform: "uppercase" }}>Total Spent <span style={{ textTransform: "none", fontWeight: "normal" }}>this month</span></p>
                      <h3 style={{ fontSize: "1.75rem", fontWeight: "bold", marginTop: "0.2rem" }}>₦{totalSpent.toLocaleString()}</h3>
                    </div>
                  </div>

                  <div className="glass-card" style={{ display: "flex", alignItems: "center", gap: "1.25rem", background: "rgba(30, 41, 59, 0.3)" }}>
                    <div style={{ padding: "0.85rem", borderRadius: "0.75rem", background: "rgba(16, 185, 129, 0.15)", color: "rgb(var(--color-secondary))", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icons.FileText size={24} />
                    </div>
                    <div>
                      <p style={{ color: "rgb(var(--color-text-dim))", fontSize: "0.8rem", fontWeight: "600", textTransform: "uppercase" }}>Total Request <span style={{ textTransform: "none", fontWeight: "normal" }}>across all statuses</span></p>
                      <h3 style={{ fontSize: "1.75rem", fontWeight: "bold", marginTop: "0.2rem" }}>{totalRequests}</h3>
                    </div>
                  </div>

                  <div className="glass-card" style={{ display: "flex", alignItems: "center", gap: "1.25rem", background: "rgba(30, 41, 59, 0.3)" }}>
                    <div style={{ padding: "0.85rem", borderRadius: "0.75rem", background: "rgba(245, 158, 11, 0.15)", color: "rgb(var(--color-accent))", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icons.FolderOpen size={24} />
                    </div>
                    <div>
                      <p style={{ color: "rgb(var(--color-text-dim))", fontSize: "0.8rem", fontWeight: "600", textTransform: "uppercase" }}>My Draft <span style={{ textTransform: "none", fontWeight: "normal" }}>not yet submitted</span></p>
                      <h3 style={{ fontSize: "1.75rem", fontWeight: "bold", marginTop: "0.2rem" }}>{myDrafts}</h3>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Filter controls */}
            <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ display: "flex", background: "rgba(30, 41, 59, 0.45)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
                <button className="btn" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem", background: "rgba(255,255,255,0.08)", color: "#fff", borderRadius: 0 }}>Today</button>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0 1rem", fontSize: "0.85rem", color: "rgb(var(--color-text-muted))" }}>
                  <Icons.Calendar size={14} /> Feb 02, 2022
                </div>
              </div>

              <div style={{ position: "relative", minWidth: "200px" }}>
                <Icons.Search size={14} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "rgb(var(--color-text-dim))" }} />
                <input
                  type="text"
                  placeholder="Search amount..."
                  value={amountSearchQuery}
                  onChange={(e) => setAmountSearchQuery(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: "2.25rem", fontSize: "0.85rem", padding: "0.5rem 0.5rem 0.5rem 2.25rem", background: "rgba(30, 41, 59, 0.45)", borderRadius: "8px", height: "auto" }}
                />
              </div>
            </div>

            {/* Grid Columns */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
              {/* My Drafts Column */}
              <div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "1rem", color: "rgb(var(--color-text))" }}>My Drafts</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {(() => {
                    const drafts = expenses.filter(e => {
                      const matchesSearch = e.description.toLowerCase().includes(searchQuery.toLowerCase()) || e.requestNumber.toLowerCase().includes(searchQuery.toLowerCase());
                      const matchesAmount = amountSearchQuery ? e.amount.toString().includes(amountSearchQuery) : true;
                      return ["DRAFT", "RETURNED"].includes(e.status) && matchesSearch && matchesAmount;
                    });

                    return drafts.length > 0 ? drafts.map((draft) => (
                      <div key={draft._id} className="glass-card" style={{
                        background: "rgba(30, 41, 59, 0.35)",
                        border: draft.status === "RETURNED" ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid rgba(255,255,255,0.06)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
                            <span style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-dim))", fontWeight: "bold" }}>{draft.requestNumber}</span>
                            <span className={`badge badge-${draft.status.toLowerCase()}`}>{draft.status}</span>
                          </div>
                          <h4 style={{ fontSize: "0.95rem", fontWeight: "600", color: "rgb(var(--color-text))", marginBottom: "0.2rem" }}>{draft.description}</h4>
                          <div style={{ display: "flex", gap: "1rem", fontSize: "0.8rem", color: "rgb(var(--color-text-muted))" }}>
                            <span>${draft.amount.toLocaleString()}</span>
                            <span>• Last edited {new Date(draft.updatedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            if (draft.status === "RETURNED") {
                              setSelectedResubmitExpense(draft);
                              setResubmitForm({
                                justification: "",
                                supportingDocument: draft.supportingDocument || "hotel_invoice_final_paid.pdf",
                                notifyAuditor: true
                              });
                              setShowResubmitModal(true);
                            } else {
                              setSelectedExpense(draft);
                            }
                          }}
                          className="btn btn-secondary"
                          style={{ padding: "0.4rem", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}
                        >
                          <Icons.Edit2 size={16} />
                        </button>
                      </div>
                    )) : (
                      // Mock visual details when empty for demo purposes
                      <>
                        <div className="glass-card" style={{
                          background: "rgba(30, 41, 59, 0.35)",
                          border: "1px solid rgba(255,255,255,0.06)",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center"
                        }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
                              <span style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-dim))", fontWeight: "bold" }}>EXP-0041</span>
                              <span className="badge badge-draft">DRAFT</span>
                            </div>
                            <h4 style={{ fontSize: "0.95rem", fontWeight: "600", color: "rgb(var(--color-text))", marginBottom: "0.2rem" }}>Local Transport - Oct</h4>
                            <div style={{ display: "flex", gap: "1rem", fontSize: "0.8rem", color: "rgb(var(--color-text-muted))" }}>
                              <span>$84.20</span>
                              <span>• Last edited 2h ago</span>
                            </div>
                          </div>
                          <button onClick={() => alert("Mock Draft details: EXP-0041")} className="btn btn-secondary" style={{ padding: "0.4rem", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Icons.Edit2 size={16} />
                          </button>
                        </div>

                        <div className="glass-card" style={{
                          background: "rgba(30, 41, 59, 0.35)",
                          border: "1px solid rgba(255,255,255,0.06)",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center"
                        }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
                              <span style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-dim))", fontWeight: "bold" }}>EXP-0042</span>
                              <span className="badge badge-draft">DRAFT</span>
                            </div>
                            <h4 style={{ fontSize: "0.95rem", fontWeight: "600", color: "rgb(var(--color-text))", marginBottom: "0.2rem" }}>Client Dinner (Alpha Corp)</h4>
                            <div style={{ display: "flex", gap: "1rem", fontSize: "0.8rem", color: "rgb(var(--color-text-muted))" }}>
                              <span>$312.00</span>
                              <span>• Last edited Yesterday</span>
                            </div>
                          </div>
                          <button onClick={() => alert("Mock Draft details: EXP-0042")} className="btn btn-secondary" style={{ padding: "0.4rem", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Icons.Edit2 size={16} />
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Active Requests Column */}
              <div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: "bold", marginBottom: "1rem", color: "rgb(var(--color-text))" }}>Active Requests</h3>
                <div className="glass-panel" style={{ padding: "1.25rem" }}>
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Title</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const active = expenses.filter(e => {
                            const matchesSearch = e.description.toLowerCase().includes(searchQuery.toLowerCase()) || e.requestNumber.toLowerCase().includes(searchQuery.toLowerCase());
                            const matchesAmount = amountSearchQuery ? e.amount.toString().includes(amountSearchQuery) : true;
                            return !["DRAFT", "RETURNED", "PAID", "CLOSED", "REJECTED", "CANCELLED"].includes(e.status) && matchesSearch && matchesAmount;
                          });

                          return active.length > 0 ? active.map((exp) => (
                            <tr key={exp._id} onClick={() => setSelectedExpense(exp)} style={{ cursor: "pointer" }}>
                              <td><strong>{exp.requestNumber}</strong></td>
                              <td>{exp.description}</td>
                              <td><span className={`badge badge-${exp.status.toLowerCase().replace(/_/g, '-')}`}>{exp.status}</span></td>
                            </tr>
                          )) : (
                            <>
                              <tr onClick={() => {
                                // open REQ-0498 mockup detail
                                setSelectedExpense({
                                  requestNumber: "REQ-0498",
                                  category: "Office Equipment",
                                  amount: 5400,
                                  description: "IT equipment purchase (monitor and keyboard)",
                                  vendorName: "IT Solutions Ltd",
                                  requiredPaymentDate: new Date().toISOString(),
                                  status: "PENDING_APPROVAL",
                                  vendorBankDetails: {
                                    bankName: "Zenith Bank",
                                    accountNumber: "1029384756",
                                    accountName: "IT Solutions Ltd"
                                  },
                                  supportingDocument: "it_hardware_invoice.pdf"
                                });
                              }} style={{ cursor: "pointer" }}>
                                <td><strong>EXP-0039</strong></td>
                                <td>Quarterly Marketing Ad campaign</td>
                                <td><span className="badge badge-pending">PENDING_APPROVAL</span></td>
                              </tr>
                              <tr onClick={() => alert("Mock Active Details: EXP-0037")} style={{ cursor: "pointer" }}>
                                <td><strong>EXP-0037</strong></td>
                                <td>Software License Renewals</td>
                                <td><span className="badge badge-budget-check">BUDGET_CHECK</span></td>
                              </tr>
                              <tr onClick={() => alert("Mock Active Details: EXP-0035")} style={{ cursor: "pointer" }}>
                                <td><strong>EXP-0035</strong></td>
                                <td>Office Supplies Bundles</td>
                                <td><span className="badge badge-finance">SENT_TO_FINANCE</span></td>
                              </tr>
                            </>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: INITIATOR HISTORY */}
        {activeTab === "history" && currentUser?.role === "INITIATOR" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
              <div>
                <h2>Request History</h2>
                <p style={{ color: "rgb(var(--color-text-muted))", fontSize: "0.95rem" }}>View finalized or archived expense requests.</p>
              </div>

              <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                <select
                  value={historyStatusFilter}
                  onChange={(e) => setHistoryStatusFilter(e.target.value)}
                  className="form-select"
                  style={{ width: "160px", background: "rgba(30, 41, 59, 0.45)", borderRadius: "8px", fontSize: "0.85rem", padding: "0.5rem" }}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PAID">Paid</option>
                  <option value="CLOSED">Closed</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>

                <div style={{ position: "relative", minWidth: "220px" }}>
                  <Icons.Search size={14} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "rgb(var(--color-text-dim))" }} />
                  <input
                    type="text"
                    placeholder="Search history..."
                    value={historySearchQuery}
                    onChange={(e) => setHistorySearchQuery(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: "2.25rem", fontSize: "0.85rem", padding: "0.5rem 0.5rem 0.5rem 2.25rem", background: "rgba(30, 41, 59, 0.45)", borderRadius: "8px", height: "auto" }}
                  />
                </div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: "1.5rem" }}>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Category</th>
                      <th>Description</th>
                      <th>Amount</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const historical = expenses.filter(e => {
                        const isHistoryStatus = ["PAID", "CLOSED", "REJECTED", "CANCELLED"].includes(e.status);
                        const matchesStatus = historyStatusFilter === "ALL" ? true : e.status === historyStatusFilter;
                        const matchesSearch = e.description.toLowerCase().includes(historySearchQuery.toLowerCase()) || e.requestNumber.toLowerCase().includes(historySearchQuery.toLowerCase());
                        return isHistoryStatus && matchesStatus && matchesSearch;
                      });

                      return historical.length > 0 ? historical.map((exp) => (
                        <tr key={exp._id}>
                          <td><strong>{exp.requestNumber}</strong></td>
                          <td>{exp.category}</td>
                          <td>{exp.description}</td>
                          <td>${exp.amount.toLocaleString()}</td>
                          <td>{new Date(exp.createdAt).toLocaleDateString()}</td>
                          <td><span className={`badge badge-${exp.status.toLowerCase().replace(/_/g, '-')}`}>{exp.status}</span></td>
                          <td>
                            <button onClick={() => setSelectedExpense(exp)} className="btn btn-secondary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}>
                              View Details
                            </button>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={7} style={{ textAlign: "center", color: "rgb(var(--color-text-dim))", padding: "2rem" }}>
                            No completed requests found in history.
                          </td>
                        </tr>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: INITIATOR SETTINGS */}
        {activeTab === "settings" && currentUser?.role === "INITIATOR" && (
          <div style={{ maxWidth: "600px" }}>
            <div style={{ marginBottom: "2rem" }}>
              <h2>Settings</h2>
              <p style={{ color: "rgb(var(--color-text-muted))", fontSize: "0.95rem" }}>Manage your profile and account credentials.</p>
            </div>

            {/* Profile Overview Card */}
            <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "2rem" }}>
              <h3 style={{ fontSize: "1.15rem", fontWeight: "bold", marginBottom: "1.25rem", color: "#fff" }}>User Profile</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", fontSize: "0.95rem" }}>
                <div>
                  <span style={{ color: "rgb(var(--color-text-dim))", display: "block", marginBottom: "0.25rem" }}>Full Name</span>
                  <strong>{currentUser?.name}</strong>
                </div>
                <div>
                  <span style={{ color: "rgb(var(--color-text-dim))", display: "block", marginBottom: "0.25rem" }}>Email Address</span>
                  <strong>{currentUser?.email}</strong>
                </div>
                <div>
                  <span style={{ color: "rgb(var(--color-text-dim))", display: "block", marginBottom: "0.25rem" }}>Assigned Role</span>
                  <span className="badge badge-draft" style={{ textTransform: "none", fontWeight: "600" }}>{currentUser?.role}</span>
                </div>
                <div>
                  <span style={{ color: "rgb(var(--color-text-dim))", display: "block", marginBottom: "0.25rem" }}>Department</span>
                  <strong>{currentUser?.departmentName || "Global / Unassigned"}</strong>
                </div>
              </div>
            </div>

            {/* Password Management Form */}
            <div className="glass-panel" style={{ padding: "1.5rem" }}>
              <h3 style={{ fontSize: "1.15rem", fontWeight: "bold", marginBottom: "1.25rem", color: "#fff" }}>Change Password</h3>

              {settingsMessage && (
                <div className="glass-card" style={{ borderLeft: "4px solid #10B981", background: "rgba(16,185,129,0.05)", padding: "0.75rem", marginBottom: "1rem" }}>
                  <p style={{ color: "#10B981", fontSize: "0.85rem" }}>{settingsMessage}</p>
                </div>
              )}
              {settingsError && (
                <div className="glass-card" style={{ borderLeft: "4px solid #EF4444", background: "rgba(239,68,68,0.05)", padding: "0.75rem", marginBottom: "1rem" }}>
                  <p style={{ color: "#EF4444", fontSize: "0.85rem" }}>{settingsError}</p>
                </div>
              )}

              <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Current Password</label>
                  <input
                    type="password"
                    required
                    value={settingsForm.currentPassword}
                    onChange={(e) => setSettingsForm({ ...settingsForm, currentPassword: e.target.value })}
                    className="form-input"
                    placeholder="••••••••"
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">New Password</label>
                  <input
                    type="password"
                    required
                    value={settingsForm.newPassword}
                    onChange={(e) => setSettingsForm({ ...settingsForm, newPassword: e.target.value })}
                    className="form-input"
                    placeholder="••••••••"
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={settingsForm.confirmPassword}
                    onChange={(e) => setSettingsForm({ ...settingsForm, confirmPassword: e.target.value })}
                    className="form-input"
                    placeholder="••••••••"
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-end", marginTop: "0.5rem" }}>
                  Update Password
                </button>
              </form>
            </div>
          </div>
        )}


        {/* VIEW: WORKFLOW RULES EDITOR (ADMIN ONLY) */}
        {activeTab === "workflow" && currentUser?.role === "ADMIN" && (
          <div>
            <div style={{ marginBottom: "2rem" }}>
              <h2>Dynamic Lifecycle Settings</h2>
              <p style={{ color: "rgb(var(--color-text-muted))", fontSize: "0.9rem" }}>Drag/Re-order approval steps and define conditional routing thresholds.</p>
            </div>

            {workflowMessage && (
              <div className="glass-card" style={{ marginBottom: "1.5rem", borderLeft: "4px solid rgb(var(--color-secondary))", padding: "1rem" }}>
                <p style={{ fontSize: "0.9rem", color: "rgb(var(--color-text))" }}>{workflowMessage}</p>
              </div>
            )}

            <div className="glass-panel" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "2rem" }}>
                {workflowSteps.map((step, idx) => (
                  <div key={step.stepIndex} className="glass-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(15,23,42,0.4)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <div style={{ background: "rgba(var(--color-primary), 0.2)", borderRadius: "50%", width: "2.5rem", height: "2.5rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontWeight: "bold", color: "rgb(var(--color-primary))", margin: "auto" }}>{idx + 1}</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                        <input
                          type="text"
                          value={step.stepName}
                          onChange={(e) => handleStepDetailChange(idx, "stepName", e.target.value)}
                          className="form-input"
                          style={{ padding: "0.3rem 0.5rem", fontSize: "0.9rem", background: "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.1)", width: "240px", fontWeight: "600" }}
                        />
                        <div style={{ display: "flex", gap: "1rem", fontSize: "0.8rem", color: "rgb(var(--color-text-muted))" }}>
                          <span>Actor Role: <strong>{step.role}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
                      <div className="form-group" style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontSize: "0.8rem", color: "rgb(var(--color-text-muted))" }}>Min Amount Rule: $</span>
                        <input
                          type="number"
                          value={step.minAmount}
                          onChange={(e) => handleStepDetailChange(idx, "minAmount", Number(e.target.value))}
                          className="form-input"
                          style={{ width: "90px", padding: "0.3rem 0.5rem", fontSize: "0.8rem" }}
                        />
                      </div>

                      <div style={{ display: "flex", gap: "0.25rem" }}>
                        <button
                          onClick={() => moveWorkflowStep(idx, "UP")}
                          disabled={idx === 0}
                          className="btn btn-secondary"
                          style={{ padding: "0.3rem 0.5rem" }}
                        >
                          <Icons.ChevronUp size={16} />
                        </button>
                        <button
                          onClick={() => moveWorkflowStep(idx, "DOWN")}
                          disabled={idx === workflowSteps.length - 1}
                          className="btn btn-secondary"
                          style={{ padding: "0.3rem 0.5rem" }}
                        >
                          <Icons.ChevronDown size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button onClick={handleSaveWorkflowConfig} className="btn btn-primary">
                  <Icons.Save size={16} /> Save Workflow Rules
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: AUDIT LOGS VIEWER (ADMIN ONLY) */}
        {activeTab === "logs" && currentUser?.role === "ADMIN" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
              <div>
                <h2>Security Auditing Trails</h2>
                <p style={{ color: "rgb(var(--color-text-muted))", fontSize: "0.9rem" }}>Organization-wide immutable compliance logs.</p>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {["ALL", "AUDIT", "EXCEPTION", "APP"].map((f) => (
                  <button
                    key={f}
                    onClick={() => { setLogFilter(f); loadLogs(f); }}
                    className="btn"
                    style={{
                      padding: "0.4rem 0.8rem",
                      fontSize: "0.8rem",
                      background: logFilter === f ? "rgb(var(--color-primary))" : "rgba(255,255,255,0.05)",
                      color: "#fff"
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: "1.5rem" }}>
              <div className="table-container" style={{ maxHeight: "600px", overflowY: "auto" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Type</th>
                      <th>Action</th>
                      <th>Message</th>
                      <th>Actor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {systemLogs.map((log) => (
                      <tr key={log._id}>
                        <td style={{ fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td>
                          <span className={`badge badge-${log.type.toLowerCase()}`}>{log.type}</span>
                        </td>
                        <td style={{ fontSize: "0.85rem", fontWeight: "600" }}>{log.action}</td>
                        <td style={{ fontSize: "0.85rem" }}>
                          {log.message}
                          {log.details && (
                            <details style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "rgb(var(--color-text-dim))" }}>
                              <summary>View metadata</summary>
                              <pre style={{ marginTop: "0.25rem", padding: "0.5rem", background: "#0a0a0a", borderRadius: "4px", overflowX: "auto" }}>
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </details>
                          )}
                        </td>
                        <td style={{ fontSize: "0.8rem" }}>
                          {log.actorName ? `${log.actorName} (${log.actorRole})` : "System"}
                        </td>
                      </tr>
                    ))}
                    {systemLogs.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: "center", color: "rgb(var(--color-text-dim))" }}>
                          No audit trails found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: USER & INVITATION DIRECTORY (ADMIN ONLY) */}
        {activeTab === "users" && currentUser?.role === "ADMIN" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
              <div>
                <h2>User & Invitation Directory</h2>
                <p style={{ color: "rgb(var(--color-text-muted))", fontSize: "0.9rem" }}>Manage organization access rights and track invitation status.</p>
              </div>
              <button 
                onClick={() => { setInviteResult(null); setShowInviteModal(true); }} 
                className="btn btn-primary"
              >
                <Icons.UserPlus size={16} /> Invite User
              </button>
            </div>

            <div className="glass-panel" style={{ padding: "1.5rem" }}>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Department</th>
                      <th>Status</th>
                      <th>Onboarding Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {systemUsers.map((user) => (
                      <tr key={user.id}>
                        <td><strong>{user.name}</strong></td>
                        <td>{user.email}</td>
                        <td>
                          <span className="badge badge-draft" style={{ textTransform: "none" }}>{user.role}</span>
                        </td>
                        <td>{user.department ? user.department.name : <span style={{ color: "rgb(var(--color-text-dim))" }}>N/A</span>}</td>
                        <td>
                          {user.isActive ? (
                            <span className="badge badge-paid">Active</span>
                          ) : (
                            <span className="badge badge-warning">Pending Invite</span>
                          )}
                        </td>
                        <td>
                          {!user.isActive ? (
                            <button
                              onClick={() => {
                                // Re-trigger invite to get link
                                setInviteForm({
                                  name: user.name,
                                  email: user.email,
                                  role: user.role,
                                  departmentId: user.department?.id || ""
                                });
                                // Automatically trigger POST request
                                const triggerResend = async () => {
                                  setInviteError("");
                                  setInviteSubmitting(true);
                                  try {
                                    const res = await fetch("/api/admin/invite", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({
                                        name: user.name,
                                        email: user.email,
                                        role: user.role,
                                        departmentId: user.department?.id || ""
                                      })
                                    });
                                    const data = await res.json();
                                    if (data.success) {
                                      setInviteResult(data);
                                    } else {
                                      alert(data.error || "Failed to generate link");
                                    }
                                  } catch (e) {
                                    alert("Error generating link");
                                  } finally {
                                    setInviteSubmitting(false);
                                  }
                                };
                                triggerResend();
                              }}
                              className="btn btn-secondary"
                              style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                            >
                              <Icons.Mail size={12} /> Get Invite Link / Preview
                            </button>
                          ) : (
                            <span style={{ color: "rgb(var(--color-text-dim))", fontSize: "0.85rem" }}>Fully Setup</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {systemUsers.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: "center", color: "rgb(var(--color-text-dim))" }}>
                          No users found in the system.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
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
      {selectedExpense && (
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
