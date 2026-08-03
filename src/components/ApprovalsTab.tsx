import React, { useState, useRef } from "react";
import * as Icons from "lucide-react";
import { ApproveExpansionModal } from "./ApproveExpansionModal";
import { RejectExpansionModal } from "./RejectExpansionModal";
import { ApproveRequestModal, ApproveRequestPayload } from "./modals/ApproveRequestModal";
import { RejectDecision, RejectOrClarifyModal, RejectOrClarifyPayload } from "./modals/RejectOrClarifyModal";
import { CompletedReleaseModal } from "./modals/CompletedReleaseModal";
import { Notice } from "./ui/NoticeBanner";
import { AttachmentDto, AttachmentInput, BudgetContextDto, ThreadEntryDto } from "../types/api";
import { AttachmentTarget } from "./modals/AttachmentViewModal";
import { CommunicationThreadModal } from "./approvals/CommunicationThreadModal";
import { RequestQueueTable } from "./approvals/RequestQueueTable";
import { AttachmentList } from "./ui/AttachmentList";
import { ElectronicSignatureField } from "./ui/ElectronicSignatureField";
import { ModalShell } from "./ui/ModalShell";
import { SubmitButton } from "./ui/SubmitButton";
import { Pagination } from "./ui/Pagination";
import { StatCard } from "./ui/StatCard";
import { EmptyState } from "./ui/EmptyState";
import { formatFileSize } from "../domains/attachments/attachment.rules";
import { formatNaira, formatDate, formatDateTime, humanizeStatus, statusBadgeClass } from "./ui/format";
import { datedFilename, downloadCsv } from "./ui/exportCsv";
import { ExpenseClient } from "../services/expense.client";
import { toErrorMessage } from "../services/http";
import type { ExpenseActions } from "../app/(dashboard)/hooks/useExpenseActions";

interface ApprovalsTabProps {
  currentUser: any;
  expenses: any[];
  approvalDateFilter: "all" | "today";
  setApprovalDateFilter: (filter: "all" | "today") => void;
  approvalDatePicker: string;
  setApprovalDatePicker: (date: string) => void;
  amountSearchQuery: string;
  setAmountSearchQuery: (query: string) => void;
  setSelectedExpense: (expense: any) => void;
  selectedExpense?: any;
  /** Workflow operations injected by the page; this component performs no I/O. */
  actions: ExpenseActions;
  /** Real budget position for the selected request; null while loading. */
  budgetContext?: BudgetContextDto | null;
  /** Persisted communication thread for whichever request is in focus. */
  thread: ThreadEntryDto[];
  threadLoading?: boolean;
  threadSending?: boolean;
  /**
   * Tells the page which request the thread should be loaded for. The release
   * and thread dialogs are opened straight from the Completed list, where
   * `selectedExpense` is null, so without this the thread they showed belonged
   * to no request at all.
   */
  onFocusThreadRequest?: (requestId: string | null) => void;
  /** Posts a comment; resolves false when the save was rejected. */
  onAddComment: (message: string, isInternal?: boolean) => Promise<boolean>;
  /** Opens a stored document in the shared attachment viewer. */
  onViewAttachment: (attachment: AttachmentTarget) => void;
  /** Attaches reviewer evidence to the open request. */
  onAddAttachments: (requestId: string, files: FileList | File[]) => void;
  onRemoveAttachment: (requestId: string, attachmentId: string) => void;
  attachmentsUploading?: boolean;
  /** Surfaces validation feedback through the shell's notice banner. */
  onNotify?: (notice: Notice) => void;
}

/** Rows shown per page in the pipeline tables. */
const ROWS_PER_PAGE = 10;

/**
 * Payment method for a released request. Nothing on the model stores it yet, so
 * it is inferred from the reference prefix — the same rule PaymentHistoryTab
 * uses, kept identical so the two screens never disagree.
 */
function resolvePaymentMethod(expense: any): string {
  if (expense.paymentMethod) return expense.paymentMethod;
  const reference: string = expense.paymentReference || "";
  if (reference.startsWith("CASH")) return "Cash";
  if (reference.startsWith("CHQ")) return "Cheque";
  return "Transfer";
}

export const ApprovalsTab: React.FC<ApprovalsTabProps> = ({
  currentUser,
  expenses,
  approvalDateFilter,
  setApprovalDateFilter,
  approvalDatePicker,
  setApprovalDatePicker,
  amountSearchQuery,
  setAmountSearchQuery,
  setSelectedExpense,
  selectedExpense,
  actions,
  budgetContext,
  thread,
  threadLoading = false,
  threadSending = false,
  onFocusThreadRequest,
  onAddComment,
  onViewAttachment,
  onAddAttachments,
  onRemoveAttachment,
  attachmentsUploading = false,
  onNotify
}) => {
  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<"new" | "processing" | "completed">("processing");
  const [listPage, setListPage] = useState(1);
  const [showClarificationForm, setShowClarificationForm] = useState(false);
  const [clarificationQuestion, setClarificationQuestion] = useState("");
  const [clarificationSignature, setClarificationSignature] = useState("");
  const [directedTo, setDirectedTo] = useState("Initiator");
  const [markAsUrgent, setMarkAsUrgent] = useState(false);
  const [timelineCollapsed, setTimelineCollapsed] = useState(false);
  const [newComment, setNewComment] = useState("");
  // Submission state now lives in useExpenseActions, alongside the I/O it guards.

  // Bulk decision confirmation — one signature authorises the whole batch.
  const [bulkDecision, setBulkDecision] = useState<"APPROVE" | "REJECT" | null>(null);
  const [bulkSignature, setBulkSignature] = useState("");

  // Escalation Modal state
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [escalateJustification, setEscalateJustification] = useState("");
  const [officerAcknowledged, setOfficerAcknowledged] = useState(false);
  const [escalateSignature, setEscalateSignature] = useState("");

  // Finance Manager Role Modals state
  const [showAuthorizeReleaseModal, setShowAuthorizeReleaseModal] = useState(false);
  const [showCompletedReleaseModal, setShowCompletedReleaseModal] = useState(false);
  const [showThreadModal, setShowThreadModal] = useState(false);
  const [showApproveExpansionModal, setShowApproveExpansionModal] = useState(false);
  const [showRejectExpansionModal, setShowRejectExpansionModal] = useState(false);

  // Approver decision dialogs (designs/approval/Approve Request Modal.png & Comment Modal.png).
  // Every financial decision must be signed off in a dialog rather than fired inline.
  const [showApproveRequestModal, setShowApproveRequestModal] = useState(false);
  const [showRejectClarifyModal, setShowRejectClarifyModal] = useState(false);
  // Which chip the dialog opens on. "Insufficient Budget" returns the request to
  // the initiator, "Reject" closes it — two different outcomes that both used to
  // open the dialog on its REJECT default, so the budget button silently
  // rejected requests it was only meant to send back.
  const [rejectClarifyIntent, setRejectClarifyIntent] = useState<RejectDecision>("REJECT");
  const [activeReleaseItem, setActiveReleaseItem] = useState<any>(null);

  /**
   * Opens the release/thread dialogs on a request. The focus callback is what
   * points the page's thread fetch at it — these dialogs are opened from the
   * list, where `selectedExpense` is null.
   */
  const focusReleaseItem = (expense: any) => {
    setActiveReleaseItem(expense);
    onFocusThreadRequest?.(expense ? String(expense._id) : null);
  };
  const [bankRefNumber, setBankRefNumber] = useState("");
  // The uploaded transfer evidence — a real stored document, not a filename.
  const [receipt, setReceipt] = useState<AttachmentInput | null>(null);
  const [receiptUploading, setReceiptUploading] = useState(false);
  const [confirmDebited, setConfirmDebited] = useState(false);
  const [releaseSignature, setReleaseSignature] = useState("");
  const receiptInputRef = useRef<HTMLInputElement>(null);
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [dateRangeFilter, setDateRangeFilter] = useState("30DAYS");

  // Initialize mockup conversation timeline or load from history when selectedExpense changes
  // The communication thread (history + comments, merged and access-filtered)
  // is served by /api/expenses/[id]/comments via the `thread` prop.

  // Handler for the primary decision buttons. All I/O and role→endpoint routing
  // is delegated to `actions` (useExpenseActions); this only decides which
  // action the button maps to and clears local dialog state on success.
  //
  // `signature` is the identity re-confirmation captured by whichever dialog
  // raised the decision. The server verifies it against the caller's password,
  // so no decision path may reach here without one.
  const handleWorkflowClick = async (
    actionType: "APPROVE" | "INSUFFICIENT" | "CLARIFY" | "ESCALATE",
    signature: string,
    decisionComment?: string
  ) => {
    if (!selectedExpense || actions.submitting) return;
    const id = selectedExpense._id;

    if (actionType === "APPROVE") {
      // Finance roles each complete a different terminal step; everyone else
      // simply advances the request to the next approver.
      let ok = false;
      if (currentUser?.role === "FINANCE_OFFICER") {
        ok = await actions.verifyAndUpload(id);
      } else if (currentUser?.role === "FINANCE_MANAGER") {
        // A release must carry a real bank reference, so this screen routes the
        // manager to the release dialog rather than inventing one.
        onNotify?.({
          tone: "error",
          message: "Open the release dialog to record the bank reference and transfer evidence.",
        });
        focusReleaseItem(selectedExpense);
        setBankRefNumber(selectedExpense.paymentReference || "");
        setShowAuthorizeReleaseModal(true);
        return;
      } else {
        ok = await actions.approve(id, decisionComment || "Approved.", signature);
      }
      if (ok) setSelectedExpense(null);
      return;
    }

    if (actionType === "INSUFFICIENT") {
      const ok = await actions.returnForClarification(
        id,
        "Returned due to insufficient departmental budget.",
        signature
      );
      if (ok) setSelectedExpense(null);
      return;
    }

    if (actionType === "CLARIFY") {
      if (!clarificationQuestion.trim()) {
        onNotify?.({ tone: "error", message: "Please enter your question or clarification text." });
        return;
      }
      const comment = `[Clarification Required - Directed to ${directedTo}${markAsUrgent ? " - URGENT" : ""}]: ${clarificationQuestion}`;
      const ok = await actions.returnForClarification(id, comment, signature);
      if (ok) {
        setShowClarificationForm(false);
        setClarificationQuestion("");
        setClarificationSignature("");
        setSelectedExpense(null);
      }
      return;
    }

    // ESCALATE — approving at the officer step forwards to the Finance Head queue.
    const ok = await actions.approve(
      id,
      `[Officer Escalation] Justification: ${escalateJustification}`,
      signature
    );
    if (ok) {
      setShowEscalateModal(false);
      setEscalateJustification("");
      setOfficerAcknowledged(false);
      setEscalateSignature("");
      setSelectedExpense(null);
    }
  };

  // Confirms the "Approve Financial Request" dialog and hands off to the shared
  // workflow handler so the role-specific endpoint routing stays in one place.
  const handleApproveConfirm = async (payload: ApproveRequestPayload) => {
    const budgetNote = payload.budgetItem ? ` [Budget item: ${payload.budgetItem}]` : "";
    setShowApproveRequestModal(false);
    await handleWorkflowClick(
      "APPROVE",
      payload.signature,
      `${payload.justification || "Approved."}${budgetNote}`
    );
  };

  // Confirms the "Reject or Request Clarification" dialog. REJECT closes the request
  // outright; CLARIFY returns it to the initiator for an update.
  const handleRejectOrClarifyConfirm = async (payload: RejectOrClarifyPayload) => {
    if (!selectedExpense || actions.submitting) return;

    const isRejection = payload.decision === "REJECT";
    const ok = isRejection
      ? await actions.reject(selectedExpense._id, payload.reason, payload.signature)
      : await actions.returnForClarification(
          selectedExpense._id,
          `[Clarification Required]: ${payload.reason}`,
          payload.signature
        );

    if (ok) {
      setShowRejectClarifyModal(false);
      setSelectedExpense(null);
    }
  };

  /**
   * Bulk approve/reject from the floating selection bar.
   *
   * Each request is decided individually and the outcome is tallied — the
   * previous version fired the calls and discarded every response, so a batch
   * where the server rejected half the items still reported a clean success.
   * One signature covers the batch; it is verified per request server-side.
   */
  const handleBulkDecision = async (decision: "APPROVE" | "REJECT", signature: string) => {
    const ids = [...selectedIds];
    let succeeded = 0;

    for (const id of ids) {
      const ok =
        decision === "APPROVE"
          ? await actions.approve(id, "Bulk approval", signature)
          : await actions.reject(id, "Bulk rejection", signature);
      if (ok) succeeded += 1;
    }

    setSelectedIds([]);
    setBulkDecision(null);
    setBulkSignature("");

    const failed = ids.length - succeeded;
    onNotify?.(
      failed === 0
        ? { tone: "success", message: `${succeeded} request(s) ${decision.toLowerCase()}d.` }
        : {
            tone: "error",
            message: `${succeeded} of ${ids.length} request(s) ${decision.toLowerCase()}d. ${failed} could not be processed — they may have moved to another stage.`,
          }
    );
  };

  /**
   * Uploads the transfer evidence to storage. The dropzone used to simply set a
   * hardcoded filename, so the "receipt" recorded against a released payment
   * pointed at nothing.
   */
  const handleReceiptUpload = async (files: FileList | File[] | null) => {
    const file = files?.[0];
    if (!file) return;

    setReceiptUploading(true);
    try {
      setReceipt(await ExpenseClient.uploadDocument(file));
    } catch (error) {
      setReceipt(null);
      onNotify?.({ tone: "error", message: toErrorMessage(error, "The receipt could not be uploaded.") });
    } finally {
      setReceiptUploading(false);
    }
  };

  // Finance Manager Payment Release Action
  const handleReleasePayment = async (expToRelease: any) => {
    if (!expToRelease || actions.submitting) return;

    // Each guard is a control requirement, not UI polish: a release without a
    // bank reference cannot be reconciled, the receipt is the audit evidence the
    // label promises, and the debit confirmation is the manager's attestation
    // that funds actually left the corporate account.
    if (!bankRefNumber.trim()) {
      onNotify?.({ tone: "error", message: "Please enter a Bank Reference Number." });
      return;
    }
    if (!receipt) {
      onNotify?.({ tone: "error", message: "Attach the payment receipt or evidence of transfer." });
      return;
    }
    if (!confirmDebited) {
      onNotify?.({
        tone: "error",
        message: "Please confirm the funds have been debited from the corporate account.",
      });
      return;
    }

    const ok = await actions.releasePayment(
      expToRelease._id,
      bankRefNumber,
      releaseSignature,
      receipt.url
    );

    if (ok) {
      setShowAuthorizeReleaseModal(false);
      focusReleaseItem(null);
      setSelectedExpense(null);
      setBankRefNumber("");
      setReceipt(null);
      setConfirmDebited(false);
      setReleaseSignature("");
    }
  };

  // Timeline comment sender
  // Posts to the thread; the parent refreshes it from the server response so
  // the comment survives a reload and is visible to the other participants.
  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedExpense) return;
    // Comments from this screen are internal audit notes, matching the field's
    // own label ("Add an internal comment to this audit trail").
    if (await onAddComment(newComment, true)) {
      setNewComment("");
    }
  };

  // Exports the pipeline slice currently on screen, filters included.
  const handleExportPipeline = () => {
    if (!downloadCsv(datedFilename("processing-pipeline"), filteredList, [
      { header: "Request", value: (e: any) => e.requestNumber },
      { header: "Department", value: (e: any) => e.departmentId?.name ?? "" },
      { header: "Initiator", value: (e: any) => e.initiatorId?.name ?? "" },
      { header: "Category", value: (e: any) => e.category },
      { header: "Amount", value: (e: any) => e.amount },
      { header: "Status", value: (e: any) => e.status },
      { header: "Required Date", value: (e: any) => formatDate(e.requiredPaymentDate) },
      { header: "Payment Reference", value: (e: any) => e.paymentReference ?? "" },
    ])) {
      onNotify?.({ tone: "error", message: "There is nothing to export in this view." });
    }
  };

  // Exports the persisted communication thread for the open request.
  const handleExportThread = () => {
    const target = activeReleaseItem ?? selectedExpense;
    if (!downloadCsv(datedFilename(`thread-${target?.requestNumber ?? "request"}`), thread, [
      { header: "Timestamp", value: (t) => formatDateTime(t.timestamp) },
      { header: "Author", value: (t) => t.authorName },
      { header: "Role", value: (t) => t.authorRole },
      { header: "Type", value: (t) => t.kind },
      { header: "Message", value: (t) => t.message },
    ])) {
      onNotify?.({ tone: "error", message: "This request has no thread entries yet." });
    }
  };

  // Grouping expense items based on Finance views
  const newRequests = expenses.filter(e => e.status === "SENT_TO_FINANCE" || e.status === "APPROVED");
  
  const processingRequests = expenses.filter(e => [
    "UPLOADED_TO_BANK", "PENDING_EXCEPTIONAL", "INSUFFICIENT_BUDGET", "RETURNED", "BUDGET_CHECK", "PENDING_APPROVAL"
  ].includes(e.status));

  const completedRequests = expenses.filter(e => [
    "PAID", "CLOSED", "REJECTED", "CANCELLED"
  ].includes(e.status));

  // Determine active list & count labels
  let currentList = processingRequests;
  if (activeSubTab === "new") currentList = newRequests;
  if (activeSubTab === "completed") currentList = completedRequests;

  /**
   * Applies every control in the bar to the current sub-tab list.
   *
   * The search box, period select and payment-method select each held state
   * that nothing read, so the table always showed the unfiltered list.
   */
  const filteredList = currentList.filter(exp => {
    // The box is labelled "Request ID, Title, or Dept", so it searches all three
    // as well as the amount rather than the amount alone.
    const term = amountSearchQuery.trim().toLowerCase();
    if (term) {
      const haystack = [
        exp.requestNumber,
        exp.description,
        exp.category,
        exp.departmentId?.name,
        exp.initiatorId?.name,
        String(exp.amount),
        Number(exp.amount).toLocaleString(),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(term)) return false;
    }

    const expDate = new Date(exp.createdAt);
    if (approvalDateFilter === "today") {
      const today = new Date();
      if (expDate.toDateString() !== today.toDateString()) return false;
    }

    if (approvalDatePicker) {
      const pickerDate = new Date(approvalDatePicker);
      if (expDate.toDateString() !== pickerDate.toDateString()) return false;
    }

    if (dateRangeFilter === "TODAY") {
      if (expDate.toDateString() !== new Date().toDateString()) return false;
    } else if (dateRangeFilter === "30DAYS") {
      if (expDate.getTime() < Date.now() - 30 * 24 * 60 * 60 * 1000) return false;
    }

    if (methodFilter !== "ALL" && resolvePaymentMethod(exp) !== methodFilter) return false;

    return true;
  });

  // Reset to the first page whenever the visible set changes underneath us.
  const totalPages = Math.max(1, Math.ceil(filteredList.length / ROWS_PER_PAGE));
  const safePage = Math.min(listPage, totalPages);
  const visibleRows = filteredList.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);

  // Documents and approver justifications for the request open in the release
  // dialog. Both used to read `selectedExpense`, which is null in the list view.
  const releaseAttachments: AttachmentDto[] = activeReleaseItem?.attachments ?? [];
  const releaseJustifications: any[] = (activeReleaseItem?.history ?? []).filter(
    (h: any) => h.comment && h.actorRole && h.actorRole !== "INITIATOR"
  );

  // Department spend calculation helper
  const deptExpenses = expenses.filter(e => {
    const dId = selectedExpense?.departmentId?._id || selectedExpense?.departmentId;
    return e.departmentId?._id === dId || e.departmentId === dId;
  });
  
  // A department with no committed spend is a real ₦0; the previous `|| 545000`
  // fallback showed the design's sample figure whenever the total came to zero.
  const totalDeptSpend = deptExpenses
    .filter(e => ["PAID", "CLOSED", "APPROVED", "SENT_TO_FINANCE", "UPLOADED_TO_BANK"].includes(e.status))
    .reduce((sum, e) => sum + e.amount, 0);

  const isSelectedCompleted = selectedExpense ? ["PAID", "CLOSED", "REJECTED", "CANCELLED"].includes(selectedExpense.status) : false;

  /**
   * Whether the request exceeds its department's budget. This was `amount >
   * 30000` — an invented threshold unrelated to any department's allocation.
   * The server-computed context is authoritative; the status flags remain as a
   * fallback for requests already routed down the exception path.
   */
  const isSelectedOverBudget = selectedExpense
    ? (budgetContext?.hasBudget
        ? selectedExpense.amount > (budgetContext.remaining ?? 0)
        : false) ||
      ["INSUFFICIENT_BUDGET", "PENDING_EXCEPTIONAL"].includes(selectedExpense.status)
    : false;

  /**
   * The approval stepper, built from the request's real history so each stage
   * names the person who completed it and carries their timestamp.
   */
  const stageFor = (actions: string[]) =>
    (selectedExpense?.history ?? []).find((h: any) => actions.includes(h.action));

  const initiatedAt = selectedExpense?.createdAt;
  const departmentStep = stageFor(["APPROVE", "APPROVED"]);
  const financeStep = stageFor(["UPLOAD", "UPLOADED_TO_BANK", "VERIFY"]);
  const disbursementStep = stageFor(["RELEASE", "PAID", "PAYMENT_RELEASED"]);

  const workflowStages = selectedExpense
    ? [
        {
          label: "Request Initiated",
          desc: `by ${selectedExpense.initiatorId?.name || "—"}`,
          date: formatDate(initiatedAt),
          active: true,
          current: false,
        },
        {
          label: "Department Approval",
          desc: departmentStep ? `by ${departmentStep.actorName}` : "Awaiting action…",
          date: departmentStep ? formatDate(departmentStep.timestamp) : "",
          active: Boolean(departmentStep),
          current: selectedExpense.status === "PENDING_APPROVAL",
        },
        {
          label: "Finance Verification",
          desc: financeStep ? `by ${financeStep.actorName}` : "Awaiting action…",
          date: financeStep ? formatDate(financeStep.timestamp) : "",
          active: Boolean(financeStep),
          current: selectedExpense.status === "SENT_TO_FINANCE",
        },
        {
          label: "Final Disbursement",
          desc: disbursementStep ? `by ${disbursementStep.actorName}` : "Pending approval…",
          date: disbursementStep ? formatDate(disbursementStep.timestamp) : "",
          active: Boolean(disbursementStep) || ["PAID", "CLOSED"].includes(selectedExpense.status),
          current: selectedExpense.status === "UPLOADED_TO_BANK",
        },
      ]
    : [];

  // RENDER DETAILED REQUEST PROFILE PAGE
  if (selectedExpense) {
    return (
      <div style={{ padding: "0.25rem 0" }}>
        
        {/* Back Link and Action Buttons */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            {isSelectedCompleted ? (
              // Square Style Back Button (Image 3)
              <button 
                onClick={() => { setSelectedExpense(null); setShowClarificationForm(false); }} 
                className="btn btn-secondary"
                style={{ 
                  border: "1.5px solid rgba(59, 130, 246, 0.3)", 
                  background: "rgba(59, 130, 246, 0.05)", 
                  padding: "0.5rem 1.25rem", 
                  borderRadius: "6px", 
                  cursor: "pointer", 
                  fontSize: "0.85rem", 
                  fontWeight: "700", 
                  color: "#3B82F6", 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "0.35rem" 
                }}
              >
                Back
              </button>
            ) : (
              // Default Arrow Back Link
              <button 
                onClick={() => { setSelectedExpense(null); setShowClarificationForm(false); }} 
                style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: "1.25rem", fontWeight: "700", padding: 0 }}
              >
                <Icons.ArrowLeft size={20} />
                Request Profile #{selectedExpense.requestNumber}
              </button>
            )}
            
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.5rem" }}>
              {/* Class comes from the shared status map. Building it from the
                  status string produced names like `badge-pending-approval` and
                  `badge-uploaded-to-bank`, none of which exist in globals.css,
                  so the header badge rendered with no colour on most statuses. */}
              <span className={`badge ${statusBadgeClass(selectedExpense.status)}`} style={{ fontWeight: "700" }}>
                {selectedExpense.status === "SENT_TO_FINANCE" ? "APPROVED BY DEPT HEAD" : humanizeStatus(selectedExpense.status)}
              </span>
              <span style={{ fontSize: "0.85rem", color: "rgb(var(--color-text-muted))" }}>
                Submitted on {new Date(selectedExpense.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          {!isSelectedCompleted && (
            <div style={{ display: "flex", gap: "0.75rem" }}>
              {currentUser?.role === "FINANCE_HEAD" || selectedExpense.status === "PENDING_EXCEPTIONAL" ? (
                <>
                  <button 
                    onClick={() => {
                      setShowRejectExpansionModal(true);
                    }}
                    className="btn btn-danger" 
                    style={{ background: "#B91C1C", color: "#FFFFFF", fontWeight: "700", border: "none" }}
                    disabled={actions.submitting}
                  >
                    Reject Expansion
                  </button>

                  <button 
                    onClick={() => {
                      setShowApproveExpansionModal(true);
                    }}
                    className="btn btn-primary" 
                    style={{ background: "#2563EB", color: "#FFFFFF", fontWeight: "700", border: "none" }}
                    disabled={actions.submitting}
                  >
                    Authorize One-Time Expansion
                  </button>
                </>
              ) : (
                <>
                  {/* Routed through the signed dialog, pre-set to CLARIFY, so
                      returning a request for budget reasons is recorded and
                      signed like every other decision. */}
                  <button
                    onClick={() => { setRejectClarifyIntent("CLARIFY"); setShowRejectClarifyModal(true); }}
                    className="btn"
                    style={{ borderColor: "#3B82F6", color: "#3B82F6", background: "transparent", borderWidth: "1.5px" }}
                    disabled={actions.submitting}
                  >
                    Insufficient Budget
                  </button>
                  {/* Opens the same signed dialog on the REJECT chip */}
                  <button
                    onClick={() => { setRejectClarifyIntent("REJECT"); setShowRejectClarifyModal(true); }}
                    className="btn"
                    style={{ borderColor: "#EF4444", color: "#EF4444", background: "transparent", borderWidth: "1.5px" }}
                    disabled={actions.submitting}
                  >
                    Reject
                  </button>
                  <button 
                    onClick={() => setShowClarificationForm(true)}
                    className="btn" 
                    style={{ borderColor: "#3B82F6", color: "#3B82F6", background: "transparent", borderWidth: "1.5px" }}
                    disabled={actions.submitting}
                  >
                    Request Clarification
                  </button>
                  
                  {isSelectedOverBudget && currentUser?.role === "FINANCE_OFFICER" ? (
                    <button 
                      onClick={() => setShowEscalateModal(true)}
                      className="btn btn-primary"
                      style={{ background: "#2563EB", border: "none" }}
                      disabled={actions.submitting}
                    >
                      Forward to Fin Head
                    </button>
                  ) : (
                    <button 
                      onClick={() => setShowApproveRequestModal(true)}
                      className="btn btn-primary"
                      style={{ background: "#2563EB", border: "none" }}
                      disabled={actions.submitting}
                    >
                      {actions.submitting ? "Processing..." : "Approve"}
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* 2-Column Details Layout */}
        <div style={{ display: "grid", gridTemplateColumns: "7fr 3fr", gap: "1.5rem" }}>
          
          {/* Left Column (70%) */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            
            {/* Request Summary Card */}
            <div className="glass-panel" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem", color: "#2563EB" }}>
                <Icons.Info size={20} />
                <h3 style={{ fontSize: "1.05rem", fontWeight: "700", margin: 0 }}>Request Summary</h3>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", fontSize: "0.9rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div>
                    <span style={{ color: "rgb(var(--color-text-muted))", display: "block", fontSize: "0.8rem", marginBottom: "0.2rem" }}>Department</span>
                    <strong style={{ fontSize: "0.95rem" }}>{selectedExpense.departmentId?.name || "—"}</strong>
                  </div>
                  <div>
                    <span style={{ color: "rgb(var(--color-text-muted))", display: "block", fontSize: "0.8rem", marginBottom: "0.2rem" }}>Initiator</span>
                    <strong style={{ fontSize: "0.95rem" }}>{selectedExpense.initiatorId?.name || "—"}</strong>
                  </div>
                  <div>
                    <span style={{ color: "rgb(var(--color-text-muted))", display: "block", fontSize: "0.8rem", marginBottom: "0.2rem" }}>Submission Date</span>
                    <strong style={{ fontSize: "0.95rem" }}>{new Date(selectedExpense.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</strong>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div>
                    <span style={{ color: "rgb(var(--color-text-muted))", display: "block", fontSize: "0.8rem", marginBottom: "0.2rem" }}>Requested Amount</span>
                    <strong style={{ fontSize: "1.1rem", color: "#2563EB" }}>{formatNaira(selectedExpense.amount)}</strong>
                  </div>
                  {/* Nothing on the model records a priority, so the tile shows
                      the required payment date instead of a badge that always
                      read NORMAL regardless of the request. */}
                  <div>
                    <span style={{ color: "rgb(var(--color-text-muted))", display: "block", fontSize: "0.8rem", marginBottom: "0.2rem" }}>Required Payment Date</span>
                    <strong style={{ fontSize: "0.95rem" }}>{formatDate(selectedExpense.requiredPaymentDate)}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Justification Card */}
            <div className="glass-panel" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem", color: "#2563EB" }}>
                <Icons.FileText size={20} />
                <h3 style={{ fontSize: "1.05rem", fontWeight: "700", margin: 0 }}>Detailed Justification</h3>
              </div>
              <p style={{ margin: 0, fontSize: "0.9rem", lineHeight: "1.6", color: "rgb(var(--color-text-muted))" }}>
                {selectedExpense.description || "No justification was provided with this request."}
              </p>
            </div>

            {/* Collapsible Message History Card */}
            <div className="glass-panel" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#2563EB" }}>
                  <Icons.MessageSquare size={20} />
                  <h3 style={{ fontSize: "1.05rem", fontWeight: "700", margin: 0 }}>Message History</h3>
                  <span style={{ fontSize: "0.8rem", background: "rgb(var(--color-card-border) / 0.32)", padding: "0.15rem 0.5rem", borderRadius: "999px", color: "rgb(var(--color-text-muted))" }}>
                    {thread.length} Total Messages
                  </span>
                </div>
                <button 
                  onClick={() => setTimelineCollapsed(!timelineCollapsed)}
                  style={{ background: "none", border: "none", color: "#2563EB", cursor: "pointer", fontSize: "0.85rem", fontWeight: "600", padding: 0 }}
                >
                  {timelineCollapsed ? "Expand" : "Collapse"}
                </button>
              </div>

              {!timelineCollapsed && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  
                  {/* Message Items Timeline */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {thread.map((entry) => {
                      const isDept = entry.authorRole !== "INITIATOR";
                      return (
                        <div key={entry.id} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                          <div style={{
                            width: "2.25rem",
                            height: "2.25rem",
                            borderRadius: "50%",
                            background: isDept ? "rgba(59, 130, 246, 0.15)" : "rgba(99, 102, 241, 0.15)",
                            color: isDept ? "#3B82F6" : "rgb(var(--color-primary))",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0
                          }}>
                            {isDept ? <Icons.ShieldCheck size={18} /> : <Icons.User size={18} />}
                          </div>

                          <div style={{ flexGrow: 1, background: "rgb(var(--color-card-border) / 0.12)", padding: "0.85rem 1rem", borderRadius: "8px", border: "1px solid rgb(var(--color-card-border) / 0.5)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem", gap: "0.5rem" }}>
                              <span style={{ fontSize: "0.85rem", fontWeight: "700" }}>
                                {entry.authorName} ({humanizeStatus(entry.authorRole)})
                                {/* Internal notes are never shown to the initiator */}
                                {entry.isInternal && (
                                  <span className="badge badge-draft" style={{ marginLeft: "0.4rem", fontSize: "0.65rem" }}>INTERNAL</span>
                                )}
                              </span>
                              <span style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))", whiteSpace: "nowrap" }}>{formatDateTime(entry.timestamp)}</span>
                            </div>
                            <p style={{ margin: 0, fontSize: "0.85rem", color: "rgb(var(--color-text-muted))", lineHeight: "1.4" }}>{entry.message}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add Comment Box */}
                  <form onSubmit={handleSendComment} style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                    <input
                      type="text"
                      placeholder="Add an internal comment to this audit trail..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="form-input"
                      style={{ flexGrow: 1, padding: "0.6rem 0.75rem", fontSize: "0.85rem" }}
                    />
                    <SubmitButton
                      type="submit"
                      loading={threadSending}
                      loadingLabel="Sending…"
                      disabled={!newComment.trim()}
                      style={{ padding: "0.6rem 1.2rem", background: "#2563EB", border: "none" }}
                    >
                      Send
                    </SubmitButton>
                  </form>
                </div>
              )}
            </div>
          </div>

          {/* Right Column (30%) */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            
            {/* Show Request Clarification Form or Details Cards */}
            {showClarificationForm ? (
              <div className="glass-panel" style={{ padding: "1.5rem", background: "rgba(37, 99, 235, 0.05)", border: "1px solid rgba(37, 99, 235, 0.15)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem", color: "#2563EB" }}>
                  <Icons.HelpCircle size={20} />
                  <h3 style={{ fontSize: "1.05rem", fontWeight: "700", margin: 0 }}>Request Clarification</h3>
                </div>
                <p style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))", marginBottom: "1rem" }}>Send a question to the requester</p>

                <div className="form-group" style={{ marginBottom: "1rem" }}>
                  <label className="form-label" style={{ fontSize: "0.8rem", marginBottom: "0.25rem" }}>Directed to</label>
                  <select 
                    value={directedTo} 
                    onChange={(e) => setDirectedTo(e.target.value)}
                    className="form-input"
                    style={{ padding: "0.45rem", fontSize: "0.85rem" }}
                  >
                    <option value="Initiator">Initiator</option>
                    <option value="Dept Head">Department Head</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: "1rem" }}>
                  <label className="form-label" style={{ fontSize: "0.8rem", marginBottom: "0.25rem" }}>Your Question</label>
                  {/* The bold/italic/list/link toolbar the design shows here had
                      no handlers, and the comment is stored and rendered as
                      plain text everywhere it is read — four buttons that
                      silently do nothing are worse than none. */}
                  <textarea
                    rows={4}
                    placeholder="Specify what information is missing or needs clarification..."
                    value={clarificationQuestion}
                    onChange={(e) => setClarificationQuestion(e.target.value)}
                    className="form-textarea"
                    style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0, padding: "0.5rem", fontSize: "0.85rem" }}
                  />
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
                  <input 
                    type="checkbox" 
                    id="urgent" 
                    checked={markAsUrgent} 
                    onChange={(e) => setMarkAsUrgent(e.target.checked)}
                    style={{ width: "1rem", height: "1rem" }}
                  />
                  <label htmlFor="urgent" style={{ fontSize: "0.8rem", cursor: "pointer" }}>Mark as Urgent (Notify immediately)</label>
                </div>

                <div style={{ marginBottom: "1.25rem" }}>
                  <ElectronicSignatureField
                    value={clarificationSignature}
                    onChange={setClarificationSignature}
                    description="Confirm your identity with your account password to return this request."
                  />
                </div>

                <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => { setShowClarificationForm(false); setClarificationQuestion(""); setClarificationSignature(""); }}
                    className="btn btn-secondary"
                    style={{ padding: "0.45rem 1rem", fontSize: "0.8rem" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleWorkflowClick("CLARIFY", clarificationSignature)}
                    className="btn btn-primary"
                    style={{ padding: "0.45rem 1.2rem", fontSize: "0.8rem", background: "#2563EB", border: "none" }}
                    disabled={!clarificationSignature.trim() || !clarificationQuestion.trim() || actions.submitting}
                  >
                    Submit
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Requester Profile Card */}
                <div className="glass-panel" style={{ padding: "1.25rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                    <div style={{
                      width: "3rem",
                      height: "3rem",
                      borderRadius: "50%",
                      background: "rgb(var(--color-card-border) / 0.32)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.25rem",
                      fontWeight: "700",
                      color: "#3B82F6"
                    }}>
                      {selectedExpense.initiatorId?.name?.charAt(0) || "?"}
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: "700" }}>{selectedExpense.initiatorId?.name || "—"}</h4>
                      <span style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))" }}>ID: {selectedExpense.initiatorId?.employeeId || selectedExpense.initiatorId?.email || "—"}</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.8rem", borderTop: "1px solid rgb(var(--color-card-border) / 0.5)", paddingTop: "0.75rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "rgb(var(--color-text-muted))" }}>Account Number</span>
                      <strong>{selectedExpense.vendorBankDetails?.accountNumber || "—"}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "rgb(var(--color-text-muted))" }}>Bank Name</span>
                      <strong>{selectedExpense.vendorBankDetails?.bankName || "—"}</strong>
                    </div>
                  </div>
                </div>

                {/* Dept Budget Card */}
                <div className="glass-panel" style={{ padding: "1.25rem" }}>
                  {/* Allocation comes from the request's own budget period; the
                      badge previously showed a hardcoded ₦12,545,000. */}
                  <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700", color: "rgb(var(--color-text-muted))", display: "block", marginBottom: "0.25rem" }}>
                    DEPT BUDGET{budgetContext?.periodLabel ? ` (${budgetContext.periodLabel.split(" - ").pop()})` : ""}
                  </span>
                  <span style={{ fontSize: "0.7rem", color: "rgb(var(--color-text-muted))" }}>Department Spend</span>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: "0.2rem" }}>
                    <strong style={{ fontSize: "1.25rem" }}>{formatNaira(totalDeptSpend)}</strong>
                    <span className="badge" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10B981", fontWeight: "700", fontSize: "0.75rem", padding: "0.15rem 0.5rem", borderRadius: "4px" }}>
                      {budgetContext?.hasBudget ? formatNaira(budgetContext.totalBudget) : "Not set"}
                    </span>
                  </div>
                </div>

                {/* Documentation Card */}
                <div className="glass-panel" style={{ padding: "1.25rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem", color: "#2563EB" }}>
                    <Icons.Paperclip size={16} />
                    <h4 style={{ margin: 0, fontSize: "0.85rem", fontWeight: "700" }}>Documentation</h4>
                  </div>

                  {/* Real document set. Previously this listed the request's
                      single filename plus two invented files with made-up sizes
                      ("Maintenance_Justification.docx • 846 KB"). Reviewers can
                      now attach their own evidence here. */}
                  <AttachmentList
                    label=""
                    compact
                    attachments={selectedExpense.attachments ?? []}
                    onView={(a) => onViewAttachment({ ...a, requestNumber: selectedExpense.requestNumber })}
                    onAdd={isSelectedCompleted ? undefined : (files) => onAddAttachments(selectedExpense._id, files)}
                    onRemove={
                      isSelectedCompleted
                        ? undefined
                        : (a) => a._id && onRemoveAttachment(selectedExpense._id, a._id)
                    }
                    uploading={attachmentsUploading}
                  />
                </div>
              </>
            )}

            {/* Approval Workflow Checklist Stepper (Always visible below) */}
            <div className="glass-panel" style={{ padding: "1.25rem" }}>
              <h4 style={{ margin: "0 0 1rem 0", fontSize: "0.85rem", fontWeight: "700" }}>Approval Workflow</h4>
              {/* Derived from the request's own history: each stage names the
                  person who actually completed it. The four steps used to carry
                  hardcoded names ("by Sarah Williams", "by Jerry Doe"), so the
                  stepper credited a decision to someone who never made it. */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem", position: "relative" }}>
                {workflowStages.map((step, idx) => (
                  <div key={idx} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", position: "relative" }}>
                    {/* Circle */}
                    <div style={{
                      width: "1.25rem",
                      height: "1.25rem",
                      borderRadius: "50%",
                      background: step.current ? "rgba(59, 130, 246, 0.15)" : step.active ? "#10B981" : "rgb(var(--color-card-border) / 0.20)",
                      border: step.current ? "2px solid #3B82F6" : step.active ? "2px solid #10B981" : "2px solid rgb(var(--color-card-border) / 0.40)",
                      zIndex: 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      {step.active && !step.current && <Icons.Check size={10} style={{ color: "#fff" }} />}
                    </div>
                    {/* Stepper text */}
                    <div>
                      <h5 style={{ margin: 0, fontSize: "0.8rem", fontWeight: "700", color: step.active ? "inherit" : "rgb(var(--color-text-muted))" }}>{step.label}</h5>
                      <p style={{ margin: 0, fontSize: "0.7rem", color: "rgb(var(--color-text-muted))" }}>{step.desc} {step.date && `• ${step.date}`}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* FORWARD TO FINANCE HEAD ESCALATION MODAL (Image 1) */}
        {showEscalateModal && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgb(var(--color-overlay) / 0.75)",
            zIndex: 110,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(4px)"
          }}>
            <div className="glass-panel" style={{
              width: "100%",
              maxWidth: "520px",
              maxHeight: "95vh",
              overflowY: "auto",
              padding: "1.75rem",
              background: "rgb(15, 23, 42)",
              border: "1px solid rgb(var(--color-card-border) / 0.5)",
              borderRadius: "12px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
              color: "#fff"
            }}>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div style={{
                    width: "2.5rem",
                    height: "2.5rem",
                    borderRadius: "8px",
                    background: "rgba(239, 68, 68, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#EF4444"
                  }}>
                    <Icons.Forward size={22} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: "1.15rem", fontWeight: "700", margin: 0 }}>Forward to Fin Head</h3>
                    <span style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))" }}>Escalation for Request {selectedExpense.requestNumber}</span>
                  </div>
                </div>
                <button 
                  onClick={() => { setShowEscalateModal(false); setEscalateJustification(""); setOfficerAcknowledged(false); }}
                  style={{ background: "none", border: "none", color: "rgb(var(--color-text-muted))", cursor: "pointer", padding: 0 }}
                >
                  <Icons.X size={20} />
                </button>
              </div>

              {/* Insufficient Budget Exception Alert Banner */}
              <div style={{
                background: "rgba(239, 68, 68, 0.05)",
                border: "1px solid rgba(239, 68, 68, 0.15)",
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                display: "flex",
                gap: "0.75rem",
                alignItems: "flex-start"
              }}>
                <Icons.AlertTriangle size={18} style={{ color: "#EF4444", flexShrink: 0, marginTop: "0.1rem" }} />
                <div>
                  <h4 style={{ margin: 0, fontSize: "0.85rem", fontWeight: "700", color: "#EF4444" }}>Insufficient Budget Exception</h4>
                  <p style={{ margin: "0.15rem 0 0 0", fontSize: "0.75rem", color: "rgb(var(--color-text-muted))" }}>
                    The requested amount for {selectedExpense.requestNumber} exceeds the quarterly departmental cap.
                  </p>
                </div>
              </div>

              {/* Request Info Cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase", color: "rgb(var(--color-text-muted))" }}>Request Information</span>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div style={{ background: "rgb(var(--color-card-border) / 0.08)", border: "1px solid rgb(var(--color-card-border) / 0.5)", padding: "0.6rem 0.85rem", borderRadius: "6px" }}>
                    <span style={{ display: "block", fontSize: "0.7rem", color: "rgb(var(--color-text-muted))" }}>DEPARTMENT</span>
                    <strong style={{ fontSize: "0.85rem" }}>{selectedExpense.departmentId?.name || "—"}</strong>
                  </div>
                  <div style={{ background: "rgb(var(--color-card-border) / 0.08)", border: "1px solid rgb(var(--color-card-border) / 0.5)", padding: "0.6rem 0.85rem", borderRadius: "6px" }}>
                    <span style={{ display: "block", fontSize: "0.7rem", color: "rgb(var(--color-text-muted))" }}>BUDGET ITEM</span>
                    <strong style={{ fontSize: "0.85rem" }}>{selectedExpense.category || "—"}</strong>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div style={{ background: "rgb(var(--color-card-border) / 0.08)", border: "1px solid rgb(var(--color-card-border) / 0.5)", padding: "0.6rem 0.85rem", borderRadius: "6px" }}>
                    <span style={{ display: "block", fontSize: "0.7rem", color: "rgb(var(--color-text-muted))" }}>BUDGETED</span>
                    {/* The department's real allocation and spend. These were
                        fixed at ₦1,220,000 / ₦1,211,000 for every request, so
                        the Finance Head was shown a variance that was not the
                        one they were being asked to authorise. */}
                    <strong style={{ fontSize: "0.9rem" }}>
                      {budgetContext?.hasBudget ? formatNaira(budgetContext.totalBudget) : "Not set"}
                    </strong>
                  </div>
                  <div style={{ background: "rgb(var(--color-surface-secondary) / 0.4)", border: "1px solid rgb(var(--color-card-border) / 0.4)", padding: "0.6rem 0.85rem", borderRadius: "6px" }}>
                    <span style={{ display: "block", fontSize: "0.7rem", color: "rgb(var(--color-text-muted))" }}>AMOUNT SPENT</span>
                    <strong style={{ fontSize: "0.9rem" }}>
                      {budgetContext?.hasBudget ? formatNaira(budgetContext.utilisedYTD) : "—"}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Request (Over Cap) Card */}
              <div style={{
                background: "rgba(239, 68, 68, 0.03)",
                border: "1px solid rgba(239, 68, 68, 0.15)",
                borderRadius: "8px",
                padding: "0.85rem 1rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                {/* The design labels this the amount *over* the cap, so it now
                    shows the shortfall rather than the full request amount. */}
                <strong style={{ fontSize: "0.9rem", color: "#EF4444" }}>Request (Over Cap)</strong>
                <strong style={{ fontSize: "1.1rem", color: "#EF4444" }}>
                  {budgetContext?.hasBudget
                    ? formatNaira(Math.max(0, selectedExpense.amount - (budgetContext.remaining ?? 0)))
                    : formatNaira(selectedExpense.amount)}
                </strong>
              </div>

              {/* Justification Textarea */}
              <div className="form-group">
                <label className="form-label" style={{ display: "block", fontSize: "0.8rem", marginBottom: "0.35rem" }}>
                  Justification for Escalation <span style={{ color: "#EF4444" }}>*</span>
                </label>
                <textarea
                  rows={3}
                  value={escalateJustification}
                  onChange={(e) => setEscalateJustification(e.target.value)}
                  placeholder="Enter detailed reasoning for why this request should be approved despite the budget variance..."
                  className="form-textarea"
                  style={{ padding: "0.6rem", fontSize: "0.85rem", background: "rgb(var(--color-card-border) / 0.08)", border: "1px solid rgb(var(--color-card-border) / 0.5)" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.25rem", fontSize: "0.7rem", color: "rgb(var(--color-text-muted))" }}>
                  <span>Min. 50 characters required for Finance Head review.</span>
                  <span style={{ color: escalateJustification.length >= 50 ? "#10B981" : "#EF4444" }}>
                    {escalateJustification.length} / 50 characters
                  </span>
                </div>
              </div>

              {/* Acknowledgment Checkbox */}
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                <input 
                  type="checkbox" 
                  id="acknowledge"
                  checked={officerAcknowledged}
                  onChange={(e) => setOfficerAcknowledged(e.target.checked)}
                  style={{ width: "1.1rem", height: "1.1rem", marginTop: "0.1rem", cursor: "pointer" }}
                />
                <label htmlFor="acknowledge" style={{ fontSize: "0.75rem", lineHeight: "1.4", color: "rgb(var(--color-text-muted))", cursor: "pointer" }}>
                  <strong>Officer Acknowledgment</strong>
                  <span style={{ display: "block", marginTop: "0.1rem" }}>
                    I have verified that this request is an urgent exception and requires Finance Head approval. I confirm all supporting documentation has been vetted.
                  </span>
                </label>
              </div>

              <ElectronicSignatureField
                value={escalateSignature}
                onChange={setEscalateSignature}
                description="Confirm your identity with your account password to escalate this request."
              />

              {/* Footer */}
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                <button
                  onClick={() => { setShowEscalateModal(false); setEscalateJustification(""); setOfficerAcknowledged(false); setEscalateSignature(""); }}
                  className="btn btn-secondary"
                  style={{ padding: "0.55rem 1.25rem", fontSize: "0.85rem" }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleWorkflowClick("ESCALATE", escalateSignature)}
                  className="btn btn-primary"
                  style={{ padding: "0.55rem 1.5rem", fontSize: "0.85rem", background: "#2563EB", border: "none" }}
                  disabled={escalateJustification.length < 50 || !officerAcknowledged || !escalateSignature.trim() || actions.submitting}
                >
                  Forward to Finance Head
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    );
  }

  // Calculate total awaiting release for metric card. An empty pipeline is a
  // real ₦0 — the previous `|| 4850200` fallback reported the design's mock
  // figure whenever there was nothing to release.
  const pendingReleaseTotal = expenses
    .filter(e => e.status === "UPLOADED_TO_BANK" || e.status === "SENT_TO_FINANCE")
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  /**
   * Mean days from submission to payment across released requests. This tile
   * read a hardcoded "1.4 Days" regardless of the data.
   */
  const releasedRequests = expenses.filter(e => ["PAID", "CLOSED"].includes(e.status) && e.createdAt);
  const avgReleaseDays = releasedRequests.length
    ? releasedRequests.reduce((sum, e) => {
        const released = new Date(e.paymentDate || e.updatedAt || e.createdAt).getTime();
        return sum + Math.max(0, released - new Date(e.createdAt).getTime());
      }, 0) /
      releasedRequests.length /
      86_400_000
    : null;

  const isFinanceManager = currentUser?.role === "FINANCE_MANAGER";

  // STANDARD WORKFLOW PIPELINE LIST VIEW
  return (
    <div>
      {/* Title Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1.5rem" }}>
        <div>
          <h2 style={{ fontSize: "1.75rem", fontWeight: "700" }}>Pipeline Overview</h2>
          <p style={{ color: "rgb(var(--color-text-muted))", fontSize: "0.95rem", marginTop: "0.25rem" }}>
            Manage and process financial disbursement requests.
          </p>
        </div>

        {/* Action controls next to title. The hand-rolled CSV builder that used
            to sit here duplicated `handleExportPipeline`; both buttons now go
            through the shared `downloadCsv` helper. */}
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          {/* Today toggle + date picker, as a pair — the design pairs them and
              `approvalDatePicker` was already being applied in `filteredList`,
              but nothing on screen could ever set it. */}
          <div style={{ display: "flex", alignItems: "center", borderRadius: "8px", overflow: "hidden", border: "1px solid rgb(var(--color-card-border))" }}>
            <button
              onClick={() => {
                setApprovalDateFilter(approvalDateFilter === "today" ? "all" : "today");
                setApprovalDatePicker("");
                setListPage(1);
              }}
              style={{
                padding: "0.55rem 1rem",
                fontSize: "0.85rem",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                background: approvalDateFilter === "today" ? "#2563EB" : "transparent",
                color: approvalDateFilter === "today" ? "#FFFFFF" : "rgb(var(--color-text))",
              }}
            >
              <Icons.Calendar size={14} />
              {approvalDateFilter === "today" ? "Today Only" : "All Dates"}
            </button>
            <input
              type="date"
              aria-label="Filter the pipeline by date"
              value={approvalDatePicker}
              onChange={(e) => { setApprovalDatePicker(e.target.value); setApprovalDateFilter("all"); setListPage(1); }}
              className="form-input"
              style={{ border: "none", borderRadius: 0, fontSize: "0.85rem", padding: "0.55rem 0.75rem", height: "auto" }}
            />
          </div>

          <button
            onClick={handleExportPipeline}
            className="btn btn-secondary"
            style={{ padding: "0.55rem 1rem", fontSize: "0.85rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.35rem" }}
          >
            <Icons.Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      {/* Top Metric Cards for Finance Manager (Screenshot 5) */}
      {isFinanceManager && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem", marginBottom: "1.5rem" }}>
          <StatCard
            label="Total Value Awaiting Release"
            hint="uploaded to bank, not yet released"
            value={formatNaira(pendingReleaseTotal)}
            icon={<Icons.Banknote size={18} />}
          />
          {/* Measured from the released requests rather than the design's
              placeholder "1.4 Days", which never changed. */}
          <StatCard
            label="Avg. Release Time"
            hint="submission to payment"
            value={avgReleaseDays === null ? "—" : `${avgReleaseDays.toFixed(1)} Days`}
            icon={<Icons.FileText size={18} />}
            tone="neutral"
          />
        </div>
      )}

      {/* Control Bar: search, period and payment method. Every control here is
          applied in `filteredList`; the decorative "Filter" button that opened
          nothing has been removed. */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", flexWrap: "wrap", alignItems: "center" }}>

        <div style={{ position: "relative", flexGrow: 1, minWidth: "260px" }}>
          <Icons.Search size={16} style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "rgb(var(--color-text-muted))" }} />
          <input
            type="text"
            placeholder="Search Request ID, Title, or Dept..."
            value={amountSearchQuery}
            onChange={(e) => { setAmountSearchQuery(e.target.value); setListPage(1); }}
            className="form-input"
            style={{ padding: "0.55rem 0.55rem 0.55rem 2.4rem", fontSize: "0.85rem", borderRadius: "8px", height: "auto" }}
          />
        </div>

        <select
          value={dateRangeFilter}
          onChange={(e) => { setDateRangeFilter(e.target.value); setListPage(1); }}
          className="form-select"
          aria-label="Period"
          style={{ width: "160px", padding: "0.55rem 0.75rem", fontSize: "0.85rem", borderRadius: "8px" }}
        >
          <option value="30DAYS">Last 30 Days</option>
          <option value="TODAY">Today</option>
          <option value="ALL">All Time</option>
        </select>

        <select
          value={methodFilter}
          onChange={(e) => { setMethodFilter(e.target.value); setListPage(1); }}
          className="form-select"
          aria-label="Payment method"
          style={{ width: "150px", padding: "0.55rem 0.75rem", fontSize: "0.85rem", borderRadius: "8px" }}
        >
          <option value="ALL">Method: All</option>
          <option value="Transfer">Transfer</option>
          <option value="Cash">Cash</option>
          <option value="Cheque">Cheque</option>
        </select>

        <button
          onClick={handleExportPipeline}
          className="btn btn-secondary"
          style={{ padding: "0.55rem 1rem", fontSize: "0.85rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.35rem" }}
        >
          <Icons.Download size={15} /> Export
        </button>
      </div>

      {/* Sub-tabs. The designs call for three (New Requests / Processing /
          Completed); only two were reachable, so `newRequests` — which is what
          a Finance Officer actually picks work off — could never be opened.
          Rendered from a list so the tabs and their counts cannot drift. */}
      <div style={{ display: "flex", borderBottom: "1px solid rgb(var(--color-card-border))", marginBottom: "1.25rem", gap: "1.5rem" }}>
        {([
          { id: "new", label: isFinanceManager ? "New Request" : "New Requests", count: newRequests.length, accent: "#2563EB" },
          { id: "processing", label: "Processing", count: processingRequests.length, accent: "#2563EB" },
          { id: "completed", label: isFinanceManager ? "Completed Releases" : "Completed", count: completedRequests.length, accent: "#10B981" },
        ] as const).map((tab) => {
          const active = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveSubTab(tab.id); setListPage(1); setSelectedIds([]); }}
              style={{
                padding: "0.75rem 0.5rem",
                background: "none",
                border: "none",
                borderBottom: active ? `2px solid ${tab.accent}` : "2px solid transparent",
                color: active ? "rgb(var(--color-text))" : "rgb(var(--color-text-muted))",
                fontWeight: 700,
                fontSize: "0.9rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              {tab.label}
              <span style={{
                fontSize: "0.75rem",
                background: active ? tab.accent : `${tab.accent}26`,
                color: active ? "#FFFFFF" : tab.accent,
                padding: "0.15rem 0.55rem",
                borderRadius: "999px",
                fontWeight: "bold",
              }}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Data table. Which layout applies is a property of the role, not of the
          sub-tab: the Finance Manager works a payment run (bank account, payee,
          bulk selection) while the Finance Officer and the departmental
          Approver work a request queue. Both used to render the payment-run
          table, so the officer's screen showed payee bank details it has no use
          for and omitted the "Requested by / Approved by" line and the OVER
          BUDGET flag its design is built around. */}
      <div className="glass-panel" style={{ overflow: "hidden", padding: isFinanceManager ? 0 : "0.5rem 1rem" }}>
        {!isFinanceManager ? (
          <RequestQueueTable
            rows={visibleRows}
            emptyTitle={activeSubTab === "completed" ? "Nothing completed yet" : "Nothing in this queue"}
            emptyDescription={
              activeSubTab === "completed"
                ? "Paid, closed and rejected requests are archived here."
                : "Requests appear here once they reach this stage of the pipeline."
            }
            onOpenRequest={setSelectedExpense}
          />
        ) : activeSubTab !== "completed" ? (
          /* Pending Release Table View (Screenshot 5) */
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ background: "rgb(var(--color-surface-secondary) / 0.5)", borderBottom: "1px solid rgb(var(--color-card-border) / 0.6)", textTransform: "uppercase", fontSize: "0.75rem", color: "rgb(var(--color-text-muted))" }}>
                <th style={{ padding: "0.85rem 0.5rem 0.85rem 1rem", width: "40px" }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filteredList.length && filteredList.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedIds(filteredList.map(item => item._id));
                      else setSelectedIds([]);
                    }}
                    style={{ cursor: "pointer", width: "16px", height: "16px" }}
                  />
                </th>
                <th style={{ padding: "0.85rem 1rem", fontWeight: "700", width: "90px" }}>ID</th>
                <th style={{ padding: "0.85rem 1rem", fontWeight: "700" }}>REQUEST</th>
                <th style={{ padding: "0.85rem 1rem", fontWeight: "700", width: "140px" }}>AMOUNT</th>
                <th style={{ padding: "0.85rem 1rem", fontWeight: "700", width: "180px" }}>BANK ACCOUNT</th>
                <th style={{ padding: "0.85rem 1rem", fontWeight: "700", width: "180px" }}>INITIATOR</th>
                <th style={{ padding: "0.85rem 1rem", fontWeight: "700", width: "140px", textAlign: "center" }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {/* Rows are the current page, not the whole list — the footer used
                  to advertise pagination the table never applied. */}
              {visibleRows.map((exp) => {
                // The column is INITIATOR, so it shows the initiator. It used to
                // fall back to the vendor name and then to an invented person.
                const initiatorName = exp.initiatorId?.name || "Unassigned";
                const initials = initiatorName
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2);
                return (
                  <tr
                    key={exp._id}
                    style={{ borderBottom: "1px solid rgb(var(--color-card-border) / 0.4)", transition: "all 0.15s ease" }}
                  >
                    <td style={{ padding: "1rem 0.5rem 1rem 1rem", width: "40px" }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(exp._id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedIds([...selectedIds, exp._id]);
                          else setSelectedIds(selectedIds.filter(id => id !== exp._id));
                        }}
                        style={{ cursor: "pointer", width: "16px", height: "16px" }}
                      />
                    </td>
                    <td style={{ padding: "1rem", fontWeight: "700", color: "rgb(var(--color-text-muted))" }}>
                      {exp.requestNumber}
                    </td>

                    <td style={{ padding: "1rem" }}>
                      <strong style={{ fontSize: "0.9rem", display: "block", color: "rgb(var(--color-text))" }}>{exp.description}</strong>
                      <span style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))" }}>
                        {[exp.departmentId?.name, exp.category].filter(Boolean).join(" • ") || "—"}
                      </span>
                    </td>

                    <td style={{ padding: "1rem" }}>
                      <strong style={{ fontSize: "1rem", color: "rgb(var(--color-text))" }}>
                        {formatNaira(exp.amount)}
                      </strong>
                    </td>

                    <td style={{ padding: "1rem" }}>
                      <strong style={{ fontSize: "0.85rem", display: "block", color: "rgb(var(--color-text))" }}>
                        {exp.vendorBankDetails?.bankName || "—"}
                      </strong>
                      <span style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))" }}>
                        {exp.vendorBankDetails?.accountNumber || "—"}
                      </span>
                    </td>

                    <td style={{ padding: "1rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(37, 99, 235, 0.15)", color: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: "bold" }}>
                          {initials}
                        </div>
                        <span style={{ fontSize: "0.85rem", fontWeight: "600" }}>{initiatorName}</span>
                      </div>
                    </td>

                    <td style={{ padding: "1rem", textAlign: "center" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem" }}>
                        {/* The design shows the request's status alongside the
                            action; the button alone used to replace it. */}
                        <span className={`badge ${statusBadgeClass(exp.status)}`}>{humanizeStatus(exp.status)}</span>
                        <button
                          onClick={() => {
                            if (isFinanceManager && exp.status === "UPLOADED_TO_BANK") {
                              focusReleaseItem(exp);
                              setBankRefNumber(exp.paymentReference || "");
                              setShowAuthorizeReleaseModal(true);
                            } else {
                              setSelectedExpense(exp);
                            }
                          }}
                          className="btn btn-primary"
                          style={{ padding: "0.4rem 0.9rem", fontSize: "0.78rem", fontWeight: "600", background: "#2563EB", border: "none" }}
                        >
                          View Request
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: 0 }}>
                    <EmptyState
                      icon={<Icons.CheckCircle size={20} />}
                      title="Nothing in this queue"
                      description="Requests appear here once they reach this stage of the pipeline."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          /* Completed Release / History Table View (Screenshot 1) */
          <table className="data-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgb(var(--color-card-border) / 0.6)", textTransform: "uppercase", fontSize: "0.75rem", color: "rgb(var(--color-text-muted))" }}>
                <th style={{ padding: "0.85rem 1rem", fontWeight: "700", width: "90px" }}>ID</th>
                <th style={{ padding: "0.85rem 1rem", fontWeight: "700" }}>REQUEST</th>
                <th style={{ padding: "0.85rem 1rem", fontWeight: "700", width: "120px" }}>AMOUNT</th>
                <th style={{ padding: "0.85rem 1rem", fontWeight: "700", width: "120px" }}>DEPT.</th>
                <th style={{ padding: "0.85rem 1rem", fontWeight: "700", width: "110px" }}>METHOD.</th>
                <th style={{ padding: "0.85rem 1rem", fontWeight: "700", width: "150px" }}>REFERENCE</th>
                <th style={{ padding: "0.85rem 1rem", fontWeight: "700", width: "130px" }}>RELEASED DATE</th>
                <th style={{ padding: "0.85rem 1rem", fontWeight: "700", width: "90px", textAlign: "center" }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {/* Every cell here is the request's own record. Method, reference
                  and released date used to fall back to fixed sample values, so
                  a request that was never paid still showed a bank reference. */}
              {visibleRows.map((exp) => (
                <tr key={exp._id} style={{ borderBottom: "1px solid rgb(var(--color-card-border) / 0.4)" }}>
                  <td style={{ padding: "1rem", fontWeight: "700", color: "rgb(var(--color-text-muted))" }}>
                    {exp.requestNumber}
                  </td>
                  <td style={{ padding: "1rem", fontWeight: "600" }}>{exp.description}</td>
                  <td style={{ padding: "1rem", fontWeight: "700" }}>{formatNaira(exp.amount)}</td>
                  <td style={{ padding: "1rem", color: "rgb(var(--color-text-muted))" }}>
                    {exp.departmentId?.name || "—"}
                  </td>
                  <td style={{ padding: "1rem", color: "rgb(var(--color-text-muted))" }}>
                    {exp.paymentReference ? resolvePaymentMethod(exp) : "—"}
                  </td>
                  <td style={{ padding: "1rem", color: "rgb(var(--color-text-muted))" }}>
                    {exp.paymentReference || "—"}
                  </td>
                  <td style={{ padding: "1rem", color: "rgb(var(--color-text-muted))" }}>
                    {exp.paymentDate ? formatDate(exp.paymentDate) : "—"}
                  </td>
                  <td style={{ padding: "1rem", textAlign: "center" }}>
                    <button
                      onClick={() => {
                        focusReleaseItem(exp);
                        setShowCompletedReleaseModal(true);
                      }}
                      aria-label={`View release ${exp.requestNumber}`}
                      style={{ background: "none", border: "none", color: "rgb(var(--color-text-muted))", cursor: "pointer", padding: "0.3rem" }}
                    >
                      <Icons.Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))}

              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: 0 }}>
                    <EmptyState
                      icon={<Icons.Archive size={20} />}
                      title="No completed releases"
                      description="Released payments appear here once a bank reference has been recorded."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination footer — the shared primitive, so the summary line and the
          rows actually shown can no longer disagree. */}
      {filteredList.length > 0 && (
        <Pagination
          page={safePage}
          rowsPerPage={ROWS_PER_PAGE}
          totalCount={filteredList.length}
          onPageChange={setListPage}
          itemLabel="requests"
        />
      )}

      {/* Bulk decision confirmation — one signature authorises the batch. */}
      <ModalShell
        isOpen={bulkDecision !== null}
        onClose={() => { setBulkDecision(null); setBulkSignature(""); }}
        title={`${bulkDecision === "APPROVE" ? "Approve" : "Reject"} ${selectedIds.length} request(s)`}
        maxWidth="480px"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => { setBulkDecision(null); setBulkSignature(""); }}>
              Cancel
            </button>
            <button
              type="button"
              className={bulkDecision === "APPROVE" ? "btn btn-primary" : "btn btn-danger"}
              disabled={!bulkSignature.trim() || actions.submitting}
              onClick={() => bulkDecision && handleBulkDecision(bulkDecision, bulkSignature)}
            >
              {actions.submitting ? "Processing..." : "Confirm"}
            </button>
          </>
        }
      >
        <p style={{ fontSize: "0.88rem", color: "rgb(var(--color-text-muted))", marginBottom: "1rem" }}>
          This decision is applied to each selected request individually and recorded on every audit trail.
        </p>
        <ElectronicSignatureField
          value={bulkSignature}
          onChange={setBulkSignature}
          description="Confirm your identity with your account password to authorise this batch."
        />
      </ModalShell>

      {/* MODAL 1: REVIEW & AUTHORIZE RELEASE MODAL (Screenshot 4) */}
      {showAuthorizeReleaseModal && activeReleaseItem && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          background: "rgb(var(--color-overlay) / 0.65)", zIndex: 120,
          display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(6px)"
        }}>
          <div className="glass-panel" style={{
            width: "95%", maxWidth: "980px", maxHeight: "90vh", overflowY: "auto",
            background: "rgb(var(--color-surface))", color: "rgb(var(--color-text))", borderRadius: "16px",
            padding: "2rem", boxShadow: "var(--shadow-lg)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
              <div>
                <h2 style={{ fontSize: "1.35rem", fontWeight: "700", margin: 0 }}>Review &amp; Authorize Release</h2>
                <span style={{ fontSize: "0.85rem", color: "#2563EB", fontWeight: "700" }}>{activeReleaseItem.requestNumber}</span>
              </div>
              <button onClick={() => setShowAuthorizeReleaseModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgb(var(--color-text-muted))" }}>
                <Icons.X size={22} />
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "1.75rem" }}>

              {/* Left Column (Review Details) */}
              <div style={{ background: "rgb(var(--color-surface-secondary) / 0.5)", border: "1px solid rgb(var(--color-card-border) / 0.6)", borderRadius: "12px", padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div>
                  <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "rgb(var(--color-text-muted))", letterSpacing: "0.05em", display: "block", marginBottom: "0.6rem" }}>
                    PAYEE ACCOUNT DETAILS
                  </span>
                  {/* Bank details come from the request. There is no sensible
                      placeholder for an account number, so a request missing
                      them says so rather than showing a plausible-looking one. */}
                  <div style={{ background: "rgb(var(--color-card))", border: "1px solid rgb(var(--color-card-border) / 0.6)", borderRadius: "8px", padding: "0.85rem 1rem", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
                    <div>
                      <span style={{ fontSize: "0.7rem", color: "rgb(var(--color-text-muted))", display: "block" }}>Payee Name</span>
                      <strong style={{ fontSize: "0.85rem" }}>{activeReleaseItem.vendorName || "—"}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: "0.7rem", color: "rgb(var(--color-text-muted))", display: "block" }}>Bank</span>
                      <strong style={{ fontSize: "0.85rem" }}>{activeReleaseItem.vendorBankDetails?.bankName || "—"}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: "0.7rem", color: "rgb(var(--color-text-muted))", display: "block" }}>Account Number</span>
                      <strong style={{ fontSize: "0.85rem" }}>{activeReleaseItem.vendorBankDetails?.accountNumber || "—"}</strong>
                    </div>
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#2563EB", marginBottom: "0.6rem" }}>
                    <Icons.Paperclip size={16} />
                    <strong style={{ fontSize: "0.85rem" }}>Documentation</strong>
                  </div>
                  {/* Documents belong to the request being released. This read
                      `selectedExpense`, which is null when the dialog is opened
                      from the list, so it always reported "no documents". */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {releaseAttachments.map((doc, idx) => (
                      <button
                        key={doc._id || `${doc.url}-${idx}`}
                        type="button"
                        onClick={() => onViewAttachment({ ...doc, requestNumber: activeReleaseItem.requestNumber })}
                        style={{ display: "flex", alignItems: "center", gap: "0.6rem", background: "rgb(var(--color-card))", border: "1px solid rgb(var(--color-card-border) / 0.6)", borderRadius: "8px", padding: "0.65rem 0.85rem", cursor: "pointer", textAlign: "left", width: "100%", color: "inherit" }}
                      >
                        <Icons.FileText size={18} style={{ color: "#2563EB", flexShrink: 0 }} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: "0.8rem", fontWeight: "600", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.name}</div>
                          <span style={{ fontSize: "0.7rem", color: "rgb(var(--color-text-muted))" }}>
                            {[formatFileSize(doc.size), doc.uploadedByName].filter(Boolean).join(" • ") || "Supporting document"}
                          </span>
                        </div>
                      </button>
                    ))}
                    {releaseAttachments.length === 0 && (
                      <span style={{ fontSize: "0.78rem", color: "rgb(var(--color-text-muted))" }}>No documents attached.</span>
                    )}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "rgb(var(--color-text-muted))", letterSpacing: "0.05em", display: "block", marginBottom: "0.6rem" }}>
                    JUSTIFICATION SUMMARY
                  </span>
                  {/* Real approver comments off the request's own history. This
                      block previously showed two invented quotations with fixed
                      timestamps — the very evidence the release is judged on. */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                    {releaseJustifications.map((entry, idx) => (
                      <div key={idx} style={{ background: "rgb(var(--color-card))", border: "1px solid rgb(var(--color-card-border) / 0.6)", borderRadius: "8px", padding: "0.75rem 0.85rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem", gap: "0.5rem" }}>
                          <strong style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))" }}>
                            {entry.actorName} ({humanizeStatus(entry.actorRole)})
                          </strong>
                          <span style={{ fontSize: "0.7rem", color: "rgb(var(--color-text-dim))", whiteSpace: "nowrap" }}>
                            {formatDateTime(entry.timestamp)}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: "0.75rem", color: "rgb(var(--color-text-muted))", fontStyle: "italic" }}>
                          &lsquo;{entry.comment}&rsquo;
                        </p>
                      </div>
                    ))}
                    {releaseJustifications.length === 0 && (
                      <span style={{ fontSize: "0.78rem", color: "rgb(var(--color-text-muted))" }}>
                        No approver justifications were recorded on this request.
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setShowThreadModal(true)}
                  style={{ background: "none", border: "none", color: "#2563EB", cursor: "pointer", fontSize: "0.8rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.35rem", padding: 0 }}
                >
                  <Icons.MessageSquare size={16} /> View Full Communication Thread &rarr;
                </button>
              </div>

              {/* Right Column (Confirm Payment Release Form) */}
              <div style={{ background: "rgb(var(--color-card))", border: "1px solid rgb(var(--color-card-border) / 0.6)", borderRadius: "12px", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: "700", margin: 0 }}>Confirm Payment Release</h3>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: "600", marginBottom: "0.35rem" }}>
                    Bank Reference Number <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <Icons.Building size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "rgb(var(--color-text-dim))" }} />
                    <input
                      type="text"
                      placeholder="Enter transaction reference ID"
                      value={bankRefNumber}
                      onChange={(e) => setBankRefNumber(e.target.value)}
                      className="form-input"
                      style={{ paddingLeft: "2.25rem", fontSize: "0.85rem" }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: "0.8rem", fontWeight: "600", marginBottom: "0.35rem" }}>
                    Payment Receipt / Evidence of Transfer <span style={{ color: "#EF4444" }}>*</span>
                  </label>

                  {/* A real upload. Clicking here used to set a fixed filename,
                      so every released payment recorded the same "receipt". */}
                  <input
                    type="file"
                    ref={receiptInputRef}
                    style={{ display: "none" }}
                    accept="image/*,.pdf"
                    onChange={(e) => {
                      handleReceiptUpload(e.target.files);
                      if (receiptInputRef.current) receiptInputRef.current.value = "";
                    }}
                  />
                  <div
                    onClick={() => receiptInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleReceiptUpload(e.dataTransfer.files);
                    }}
                    style={{
                      border: "2px dashed rgb(var(--color-card-border) / 0.9)", borderRadius: "8px", padding: "1.5rem 1rem",
                      textAlign: "center", background: "rgb(var(--color-surface-secondary) / 0.4)", cursor: "pointer"
                    }}
                  >
                    <Icons.UploadCloud size={32} style={{ color: "rgb(var(--color-text-muted))", margin: "0 auto 0.5rem" }} />
                    <div style={{ fontSize: "0.85rem", fontWeight: "700" }}>
                      {receiptUploading
                        ? "Uploading receipt…"
                        : receipt
                          ? `${receipt.name}${receipt.size ? ` • ${formatFileSize(receipt.size)}` : ""}`
                          : "Drop your file here or click to browse"}
                    </div>
                    <span style={{ fontSize: "0.7rem", color: "rgb(var(--color-text-muted))" }}>Supports PDF, PNG, JPG (Max 5MB)</span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start", background: "rgba(37, 99, 235, 0.08)", border: "1px solid rgba(37, 99, 235, 0.2)", padding: "0.75rem", borderRadius: "8px" }}>
                  <input
                    type="checkbox"
                    id="confirmDebited"
                    checked={confirmDebited}
                    onChange={(e) => setConfirmDebited(e.target.checked)}
                    style={{ width: "1.1rem", height: "1.1rem", marginTop: "0.1rem", cursor: "pointer" }}
                  />
                  <label htmlFor="confirmDebited" style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))", lineHeight: "1.4", cursor: "pointer" }}>
                    I confirm that the funds have been successfully debited from the corporate account and the transaction is complete.
                  </label>
                </div>

                <ElectronicSignatureField value={releaseSignature} onChange={setReleaseSignature} />

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "auto" }}>
                  <button onClick={() => setShowAuthorizeReleaseModal(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button
                    onClick={() => handleReleasePayment(activeReleaseItem)}
                    className="btn btn-primary"
                    style={{ background: "#2563EB", border: "none", padding: "0.6rem 1.75rem", fontWeight: "700" }}
                    disabled={!bankRefNumber || !receipt || !confirmDebited || !releaseSignature.trim() || actions.submitting}
                  >
                    {actions.submitting ? "Processing..." : "Paid"}
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Completed release — the shared dialog, which reads the request's own
          payee, reference, date and approver justifications. The copy that used
          to be inlined here carried fabricated fallbacks ("Blessing Okafor",
          account 0012933746, TXN-2026-0789-1234, two invented justification
          quotes) and hardcoded light-mode colours. */}
      <CompletedReleaseModal
        isOpen={showCompletedReleaseModal}
        onClose={() => { setShowCompletedReleaseModal(false); focusReleaseItem(null); }}
        expense={activeReleaseItem}
        onViewThread={() => setShowThreadModal(true)}
      />

      {/* Full communication thread for the request open in the release dialog.
          Its own component now, rendering the real merged thread — the copy that
          lived here was 125 lines of fabricated conversation. */}
      <CommunicationThreadModal
        isOpen={showThreadModal}
        onClose={() => setShowThreadModal(false)}
        expense={activeReleaseItem}
        entries={thread}
        loading={threadLoading}
        onExport={handleExportThread}
      />

      {/* Approver decision dialogs — every approve/reject is signed off in a modal */}
      <ApproveRequestModal
        isOpen={showApproveRequestModal}
        onClose={() => setShowApproveRequestModal(false)}
        expense={selectedExpense}
        submitting={actions.submitting}
        onConfirm={handleApproveConfirm}
      />

      <RejectOrClarifyModal
        isOpen={showRejectClarifyModal}
        onClose={() => setShowRejectClarifyModal(false)}
        expense={selectedExpense}
        initialDecision={rejectClarifyIntent}
        submitting={actions.submitting}
        onConfirm={handleRejectOrClarifyConfirm}
      />

      {/* Finance Head Approve One-Time Budget Expansion Modal */}
      <ApproveExpansionModal
        isOpen={showApproveExpansionModal}
        onClose={() => setShowApproveExpansionModal(false)}
        requestNumber={selectedExpense?.requestNumber ? `#${selectedExpense.requestNumber.replace(/^REQ-/, '')}` : ""}
        requestAmount={selectedExpense?.amount ?? 0}
        remainingBudget={budgetContext?.remaining ?? 0}
        deficitAmount={budgetContext?.criticalGap ?? 0}
        onConfirm={async (notes, signature) => {
          if (!selectedExpense) return;
          if (await actions.approveExpansion(selectedExpense._id, notes, signature)) {
            setShowApproveExpansionModal(false);
            setSelectedExpense(null);
          }
        }}
      />

      {/* Finance Head Reject One-Time Budget Expansion Modal */}
      <RejectExpansionModal
        isOpen={showRejectExpansionModal}
        onClose={() => setShowRejectExpansionModal(false)}
        requestNumber={selectedExpense?.requestNumber ? `#${selectedExpense.requestNumber.replace(/^REQ-/, '')}` : ""}
        requestAmount={selectedExpense?.amount ?? 0}
        remainingBudget={budgetContext?.remaining ?? 0}
        deficitAmount={budgetContext?.criticalGap ?? 0}
        onConfirm={async (reason, signature) => {
          if (!selectedExpense) return;
          if (await actions.rejectExpansion(selectedExpense._id, reason, signature)) {
            setShowRejectExpansionModal(false);
            setSelectedExpense(null);
          }
        }}
      />

      {/* Floating Sticky Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div style={{
          position: "fixed",
          bottom: "2rem",
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgb(var(--color-surface))",
          color: "rgb(var(--color-text))",
          padding: "0.85rem 1.5rem",
          borderRadius: "12px",
          boxShadow: "var(--shadow-glass)",
          display: "flex",
          alignItems: "center",
          gap: "1.25rem",
          zIndex: 100,
          border: "1px solid rgb(var(--color-card-border) / 0.6)"
        }}>
          <span style={{ fontWeight: "700", fontSize: "0.9rem" }}>{selectedIds.length} items selected</span>
          {/* Both open the signed confirmation dialog. They previously fired
              straight through a `confirm()`, so a batch of financial decisions
              was the only path in the app that skipped the signature. */}
          <button
            onClick={() => setBulkDecision("APPROVE")}
            disabled={actions.submitting}
            className="btn btn-primary"
            style={{ background: "#2563EB", border: "none", fontSize: "0.85rem", fontWeight: "700", padding: "0.5rem 1rem" }}
          >
            Approve Selected ({selectedIds.length})
          </button>
          <button
            onClick={() => setBulkDecision("REJECT")}
            disabled={actions.submitting}
            className="btn btn-danger"
            style={{ background: "#EF4444", border: "none", fontSize: "0.85rem", fontWeight: "700", color: "#FFFFFF", padding: "0.5rem 1rem" }}
          >
            Reject Selected ({selectedIds.length})
          </button>
        </div>
      )}

    </div>
  );
};
