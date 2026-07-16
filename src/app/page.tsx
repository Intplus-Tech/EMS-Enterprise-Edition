"use client";

import { useEffect, useState } from "react";
import * as Icons from "lucide-react";
import { BRANDING } from "../config/branding";

// Helper component to render Lucide Icons dynamically
const DynamicIcon = ({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) => {
  const LucideIcon = (Icons as any)[name];
  if (!LucideIcon) return <Icons.HelpCircle className={className} style={style} />;
  return <LucideIcon className={className} style={style} />;
};

// Seed users configurations for dynamic switching
const SIMULATED_USERS = [
  { email: "initiator@spendflow.com", name: "Ian Initiator", role: "INITIATOR", pass: "init123" },
  { email: "approver@spendflow.com", name: "Audrey Approver", role: "APPROVER", pass: "app123" },
  { email: "head@spendflow.com", name: "Helen Head (Finance Head)", role: "FINANCE_HEAD", pass: "head123" },
  { email: "officer@spendflow.com", name: "Oscar Officer (Finance Officer)", role: "FINANCE_OFFICER", pass: "officer123" },
  { email: "manager@spendflow.com", name: "Marcus Manager (Finance Manager)", role: "FINANCE_MANAGER", pass: "manager123" },
  { email: "admin@spendflow.com", name: "Alice Admin", role: "ADMIN", pass: "admin123" },
];

export default function Dashboard() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [startupError, setStartupError] = useState("");
  const [seeding, setSeeding] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard"); // dashboard, expenses, workflow, logs, users
  
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

  // Initialize and check me
  useEffect(() => {
    fetchSession();
  }, []);

  const fetchSession = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        throw new Error(`Server returned error status: ${res.status}`);
      }
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.user);
        loadDashboardData(data.user);
      } else {
        // Not logged in -> Login as initiator by default for preview
        await handleSwitchUser(SIMULATED_USERS[0]);
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

  const handleSwitchUser = async (userConfig: typeof SIMULATED_USERS[0]) => {
    setLoading(true);
    try {
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userConfig.email, password: userConfig.pass }),
      });
      if (!loginRes.ok) {
        throw new Error(`Server returned error status: ${loginRes.status}`);
      }
      const data = await loginRes.json();
      if (data.success) {
        setCurrentUser(data.user);
        setSelectedExpense(null);
        await loadDashboardData(data.user);
      } else {
        throw new Error(data.error || "Login simulation failed");
      }
    } catch (e: any) {
      console.error(e);
      if (!currentUser) {
        setStartupError("Database connection failed. Please ensure MONGODB_URI is correctly configured in your Vercel Project Settings and whitelisted (0.0.0.0/0) in your MongoDB Atlas cluster.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDatabaseSeed = async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        alert("Database seeded successfully! Resetting session to Admin.");
        await handleSwitchUser(SIMULATED_USERS[0]); // switch back to initiator
      }
    } catch (e: any) {
      console.error(e);
      alert("Error seeding database: " + e.message);
    } finally {
      setSeeding(false);
    }
  };

  // Submit new request
  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
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

  // Initiator submits the request
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
        </div>

        {/* Demo controls and context settings */}
        <div className="glass-card" style={{ padding: "0.75rem", background: "rgba(15, 23, 42, 0.4)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <p style={{ fontSize: "0.75rem", fontWeight: "bold", color: "rgb(var(--color-accent))", textTransform: "uppercase" }}>Demo Control Panel</p>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: "0.7rem", marginBottom: "0.25rem" }}>Simulate Session Role</label>
            <select
              value={SIMULATED_USERS.findIndex(u => u.role === currentUser?.role)}
              onChange={(e) => handleSwitchUser(SIMULATED_USERS[Number(e.target.value)])}
              className="form-select"
              style={{ padding: "0.4rem 0.6rem", fontSize: "0.8rem", background: "#0a0a0a" }}
            >
              {SIMULATED_USERS.map((u, i) => (
                <option key={u.role} value={i}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleDatabaseSeed}
            disabled={seeding}
            className="btn btn-secondary"
            style={{ width: "100%", padding: "0.4rem 0.5rem", fontSize: "0.75rem" }}
          >
            {seeding ? "Resetting Data..." : "Reset System Data"}
          </button>
        </div>

        <div style={{ marginTop: "1rem", padding: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "rgb(var(--color-secondary))" }} />
          <span style={{ fontSize: "0.8rem", color: "rgb(var(--color-text-muted))" }}>{currentUser?.name}</span>
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

        {/* VIEW: EXPENSE REQUESTS HISTORY */}
        {activeTab === "expenses" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
              <div>
                <h2>Expense Requests Directory</h2>
                <p style={{ color: "rgb(var(--color-text-muted))", fontSize: "0.9rem" }}>View requests status track and approval histories.</p>
              </div>
              {currentUser?.role === "INITIATOR" && (
                <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
                  <Icons.Plus size={16} /> Raise New Request
                </button>
              )}
            </div>

            <div className="glass-panel" style={{ padding: "1.5rem" }}>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Req Number</th>
                      <th>Category</th>
                      <th>Description</th>
                      <th>Amount</th>
                      <th>Date Required</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((exp) => (
                      <tr key={exp._id}>
                        <td><strong>{exp.requestNumber}</strong></td>
                        <td>{exp.category}</td>
                        <td style={{ maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {exp.description}
                        </td>
                        <td>${exp.amount.toLocaleString()}</td>
                        <td>{new Date(exp.requiredPaymentDate).toLocaleDateString()}</td>
                        <td>
                          <span className={`badge badge-${exp.status.toLowerCase().replace(/_/g, '-')}`}>{exp.status}</span>
                        </td>
                        <td style={{ display: "flex", gap: "0.5rem" }}>
                          <button onClick={() => setSelectedExpense(exp)} className="btn btn-secondary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}>
                            Details
                          </button>
                          {currentUser.role === "INITIATOR" && (exp.status === "DRAFT" || exp.status === "RETURNED") && (
                            <button onClick={() => handleSubmitRequest(exp._id)} className="btn btn-primary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}>
                              Submit
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {expenses.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: "center", color: "rgb(var(--color-text-dim))" }}>
                          No expense requests found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
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

            <form onSubmit={handleCreateRequest} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
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
                  <label className="form-label">Requested Amount ($)</label>
                  <input
                    type="number"
                    required
                    value={newRequest.amount}
                    onChange={(e) => setNewRequest({ ...newRequest, amount: e.target.value })}
                    placeholder="e.g. 2400"
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
                <button type="submit" className="btn btn-primary">
                  Create Request (Draft)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAILS & ACTIONS MODAL */}
      {selectedExpense && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: "700px", maxHeight: "90vh", overflowY: "auto", padding: "2rem", margin: "auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontWeight: "bold", fontSize: "1.25rem" }}>Request Details: {selectedExpense.requestNumber}</h3>
                <span className={`badge badge-${selectedExpense.status.toLowerCase().replace(/_/g, '-')}`}>{selectedExpense.status}</span>
              </div>
              <button onClick={() => { setSelectedExpense(null); setActionComment(""); }} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer" }}>
                <Icons.X size={24} />
              </button>
            </div>

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
                        background: step.active ? "rgb(var(--color-secondary))" : "rgba(255,255,255,0.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.75rem",
                        fontWeight: "bold",
                        color: step.active ? "#0f172a" : "inherit"
                      }}
                    >
                      {step.active ? "✓" : idx + 1}
                    </div>
                    <span style={{ fontSize: "0.7rem", marginTop: "0.25rem", color: step.active ? "#fff" : "rgb(var(--color-text-dim))" }}>{step.name}</span>
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
                
                {/* Check if current simulation user matches the required step role */}
                {(() => {
                  const requiredRole = currentUser.role; // Simplified simulation checks
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

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
              <button onClick={() => { setSelectedExpense(null); setActionComment(""); }} className="btn btn-secondary">
                Close details
              </button>
            </div>
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
    </div>
  );
}
