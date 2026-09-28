/**
 * PaymentHistoryTab
 * Finance Manager view of completed disbursements: searchable, period/method filtered,
 * exportable, with a per-row receipt view. Consumed by src/app/(dashboard)/history/page.tsx.
 * Design source: designs/finance-manager/Payment History (Completed Payments).png
 */
import React, { useMemo, useState } from "react";
import * as Icons from "lucide-react";
import { Pagination } from "./ui/Pagination";
import { EmptyState } from "./ui/EmptyState";
import { CompletedReleaseModal } from "./modals/CompletedReleaseModal";
import { AttachmentDto } from "../types/api";
import { formatNaira, formatDate, paymentMethodOf } from "./ui/format";

const ROWS_PER_PAGE = 4;

// Period presets from the design, expressed as a day window (0 = no cut-off).
const PERIOD_OPTIONS: { label: string; days: number }[] = [
  { label: "Last 30 Days", days: 30 },
  { label: "Last 90 Days", days: 90 },
  { label: "Last 12 Months", days: 365 },
  { label: "All Time", days: 0 },
];

const METHOD_OPTIONS = ["All", "Transfer", "Cash", "Cheque"];

/** A released payment as the list endpoint returns it, department populated. */
interface ExpenseRow {
  _id: string;
  requestNumber: string;
  description: string;
  amount: number;
  status: string;
  departmentId?: { name?: string } | null;
  paymentMethod?: string;
  paymentReference?: string;
  paymentDate?: string;
  updatedAt?: string;
  createdAt: string;
}

interface PaymentHistoryTabProps {
  expenses: ExpenseRow[];
  /**
   * Opens the receipt in the shared viewer. The manager files the evidence on
   * release, so their own ledger must be able to read it back.
   */
  onViewAttachment?: (attachment: AttachmentDto & { requestNumber?: string }) => void;
}

/**
 * `/api/expenses` populates the department, so the name lives on the populated
 * document. Reading a flat `departmentName` — which no expense carries — made
 * the DEPT. column render "—" for every row and the search never match a
 * department.
 */
const deptNameOf = (expense: ExpenseRow): string => expense.departmentId?.name || "";

export const PaymentHistoryTab: React.FC<PaymentHistoryTabProps> = ({ expenses, onViewAttachment }) => {
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState(PERIOD_OPTIONS[0].label);
  const [method, setMethod] = useState("All");
  const [page, setPage] = useState(1);
  const [selectedRelease, setSelectedRelease] = useState<ExpenseRow | null>(null);

  const releases = useMemo(() => {
    const days = PERIOD_OPTIONS.find(p => p.label === period)?.days ?? 0;
    const cutoff = days > 0 ? Date.now() - days * 24 * 60 * 60 * 1000 : 0;
    const term = search.trim().toLowerCase();

    return expenses
      .filter(e => e.status === "PAID" || e.status === "CLOSED")
      .filter(e => {
        const released = new Date(e.paymentDate || e.updatedAt || e.createdAt).getTime();
        if (cutoff && released < cutoff) return false;
        if (method !== "All" && paymentMethodOf(e) !== method) return false;
        if (!term) return true;
        return (
          (e.requestNumber || "").toLowerCase().includes(term) ||
          (e.description || "").toLowerCase().includes(term) ||
          (deptNameOf(e) || "").toLowerCase().includes(term)
        );
      })
      .sort((a, b) =>
        new Date(b.paymentDate || b.updatedAt || b.createdAt).getTime() -
        new Date(a.paymentDate || a.updatedAt || a.createdAt).getTime()
      );
  }, [expenses, search, period, method]);

  // Clamp the page so filtering never strands the table on an out-of-range page.
  const safePage = Math.min(page, Math.max(1, Math.ceil(releases.length / ROWS_PER_PAGE)));
  const visibleRows = releases.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);

  // Client-side CSV export keeps the action useful without a reporting endpoint.
  const handleExport = () => {
    const header = ["ID", "Request", "Amount", "Dept.", "Method", "Reference", "Released Date"];
    const rows = releases.map(e => [
      e.requestNumber,
      e.description,
      e.amount,
      deptNameOf(e),
      paymentMethodOf(e),
      e.paymentReference || "",
      formatDate(e.paymentDate || e.updatedAt || e.createdAt),
    ]);
    const csv = [header, ...rows]
      .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `payment-history-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <h1 style={{ fontSize: "1.9rem", fontWeight: 800, marginBottom: "0.35rem" }}>Pipeline Overview</h1>
      <p style={{ color: "rgb(var(--color-text-muted))", marginBottom: "1.75rem" }}>
        Manage and process financial disbursement requests.
      </p>

      {/* Filter bar */}
      <div
        className="glass-panel"
        style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.85rem", padding: "1rem 1.25rem", marginBottom: "1.5rem" }}
      >
        <div style={{ position: "relative", flex: "1 1 260px" }}>
          <Icons.Search
            size={16}
            style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "rgb(var(--color-text-dim))" }}
          />
          <input
            type="text"
            className="form-input"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search Request ID, Title, or Dept..."
            style={{ paddingLeft: "2.25rem" }}
          />
        </div>

        <select
          className="form-select"
          value={period}
          onChange={(e) => { setPeriod(e.target.value); setPage(1); }}
          style={{ width: "auto", minWidth: "180px" }}
        >
          {PERIOD_OPTIONS.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
        </select>

        <select
          className="form-select"
          value={method}
          onChange={(e) => { setMethod(e.target.value); setPage(1); }}
          style={{ width: "auto", minWidth: "160px" }}
        >
          {METHOD_OPTIONS.map(m => <option key={m} value={m}>Method: {m}</option>)}
        </select>

        <button type="button" onClick={handleExport} className="btn btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
          <Icons.Download size={16} /> Export
        </button>
      </div>

      {/* Released payments */}
      <div className="glass-panel" style={{ padding: "0" }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>REQUEST</th>
                <th style={{ textAlign: "right" }}>AMOUNT</th>
                <th>DEPT.</th>
                <th>METHOD.</th>
                <th>REFERENCE</th>
                <th>RELEASED DATE</th>
                <th style={{ textAlign: "right" }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((e) => (
                <tr key={e._id}>
                  <td><strong>{e.requestNumber}</strong></td>
                  <td>{e.description}</td>
                  <td style={{ textAlign: "right", fontWeight: 700 }}>{formatNaira(e.amount)}</td>
                  <td>{deptNameOf(e) || "—"}</td>
                  <td>{paymentMethodOf(e)}</td>
                  <td>{e.paymentReference || "—"}</td>
                  <td>{formatDate(e.paymentDate || e.updatedAt || e.createdAt)}</td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      type="button"
                      onClick={() => setSelectedRelease(e)}
                      aria-label={`View release ${e.requestNumber}`}
                      style={{ background: "none", border: "none", color: "rgb(var(--color-text-muted))", cursor: "pointer", padding: "0.2rem" }}
                    >
                      <Icons.Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {releases.length === 0 ? (
          <EmptyState
            icon={<Icons.Banknote size={20} />}
            title="No completed payments"
            description="Released disbursements will appear here once payments are confirmed."
          />
        ) : (
          <div style={{ padding: "0 1.25rem 1rem" }}>
            <Pagination
              page={safePage}
              rowsPerPage={ROWS_PER_PAGE}
              totalCount={releases.length}
              onPageChange={setPage}
              itemLabel="pending releases"
            />
          </div>
        )}
      </div>

      <CompletedReleaseModal
        isOpen={!!selectedRelease}
        onClose={() => setSelectedRelease(null)}
        expense={selectedRelease}
        onViewAttachment={onViewAttachment}
      />
    </div>
  );
};
