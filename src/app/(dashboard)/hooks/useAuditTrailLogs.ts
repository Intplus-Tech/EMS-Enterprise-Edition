"use client";

/**
 * Owns the Audit Trail screen's server state: filters, the current page, and the
 * fetch that turns them into rows.
 *
 * Lives here rather than in `AdminAuditTrailViewerTab` so that tab stays a
 * presentational component (engineering rule 1-D). The viewer used to filter and
 * "paginate" an in-memory array of the newest 100 logs; every query below is now
 * answered by the database.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AdminClient, LogQueryParams } from "../../../services/admin.client";
import { toErrorMessage } from "../../../services/http";
import { LogDto } from "../../../types/api";
import { AuditAction } from "../../../enums/auditActions";

export const AUDIT_ROWS_PER_PAGE = 10;

/** Ceiling matching `LogQuerySchema.limit`; one export cannot drain the collection. */
const EXPORT_LIMIT = 1000;

/** Typing in the text filters must not fire a query per keystroke. */
const FILTER_DEBOUNCE_MS = 350;

export type AuditDateRange = "Today" | "Last 7 Days" | "Last 30 Days";

export interface AuditTrailFilters {
  dateRange: AuditDateRange;
  userName: string;
  reference: string;
  actionType: string;
}

/** "All Actions" is the select's no-filter sentinel, not a stored action code. */
export const ANY_ACTION = "All Actions";

/**
 * Action Type select: the design's labels bound to the codes actually written to
 * the Log collection. Previously the labels were sent as-is, so "Exceptional
 * Approval" matched nothing — no stored action is spelled that way.
 */
export const AUDIT_ACTION_OPTIONS: { label: string; value: string }[] = [
  { label: ANY_ACTION, value: ANY_ACTION },
  { label: "Exceptional Approval", value: AuditAction.EXCEPTIONAL_BUDGET_APPROVED },
  { label: "Generate Payment Instruction", value: AuditAction.EXPENSE_BANK_UPLOADED },
  { label: "Payment Released", value: AuditAction.PAYMENT_RELEASED },
  { label: "Approve", value: AuditAction.EXPENSE_STEP_APPROVED },
];

const DEFAULT_FILTERS: AuditTrailFilters = {
  dateRange: "Last 7 Days",
  userName: "",
  reference: "",
  actionType: ANY_ACTION,
};

const RANGE_DAYS: Record<AuditDateRange, number> = {
  Today: 1,
  "Last 7 Days": 7,
  "Last 30 Days": 30,
};

/** Filters → query params. Kept pure so the export reuses the exact same filter. */
function toQueryParams(filters: AuditTrailFilters): LogQueryParams {
  return {
    user: filters.userName.trim() || undefined,
    reference: filters.reference.trim() || undefined,
    action: filters.actionType !== ANY_ACTION ? filters.actionType : undefined,
    // Computed in the browser so the cutoff follows the viewer's own clock.
    from: new Date(Date.now() - RANGE_DAYS[filters.dateRange] * 86_400_000).toISOString(),
  };
}

export function useAuditTrailLogs() {
  const [filters, setFilters] = useState<AuditTrailFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [logs, setLogs] = useState<LogDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  // Debounced mirror of `filters`; only this drives the fetch.
  const [appliedFilters, setAppliedFilters] = useState<AuditTrailFilters>(DEFAULT_FILTERS);

  useEffect(() => {
    const timer = setTimeout(() => setAppliedFilters(filters), FILTER_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [filters]);

  // Discards the response of a superseded request so a slow early page cannot
  // overwrite the rows of a later one.
  const requestId = useRef(0);

  /**
   * `loading` is switched on by whoever triggers a change (the filter handlers,
   * the pager, the initial `useState`) rather than here — setting state
   * synchronously from the fetch effect would cascade an extra render.
   */
  useEffect(() => {
    const ticket = ++requestId.current;

    AdminClient.listLogs({ ...toQueryParams(appliedFilters), page, limit: AUDIT_ROWS_PER_PAGE })
      .then((result) => {
        if (ticket !== requestId.current) return;
        setLogs(result.logs);
        setTotalCount(result.total);
        // The server clamps the page when filters narrow the result set; follow
        // it so the pager highlights the page actually being shown.
        if (result.page !== page) setPage(result.page);
        setError("");
      })
      .catch((err) => {
        if (ticket !== requestId.current) return;
        setLogs([]);
        setTotalCount(0);
        setError(toErrorMessage(err, "Failed to load audit logs."));
      })
      .finally(() => {
        if (ticket === requestId.current) setLoading(false);
      });
  }, [appliedFilters, page]);

  /** Editing any filter returns to page 1 — page 4 of the old result set is meaningless. */
  const updateFilters = useCallback((patch: Partial<AuditTrailFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
    setLoading(true);
  }, []);

  /** Pager clicks fetch the next slice from the database, not a local array. */
  const changePage = useCallback((next: number) => {
    setPage(next);
    setLoading(true);
  }, []);

  /**
   * Fetches every row matching the current filters (not just the visible page)
   * so the CSV still represents the whole filtered set after paging moved
   * server-side. Returns the rows for the caller to serialise.
   */
  const fetchAllMatching = useCallback(async (): Promise<LogDto[]> => {
    setExporting(true);
    try {
      const result = await AdminClient.listLogs({
        ...toQueryParams(appliedFilters),
        page: 1,
        limit: EXPORT_LIMIT,
      });
      return result.logs;
    } catch (err) {
      setError(toErrorMessage(err, "Failed to export audit logs."));
      return [];
    } finally {
      setExporting(false);
    }
  }, [appliedFilters]);

  return useMemo(
    () => ({
      filters,
      updateFilters,
      logs,
      loading,
      error,
      page,
      changePage,
      rowsPerPage: AUDIT_ROWS_PER_PAGE,
      totalCount,
      exporting,
      fetchAllMatching,
    }),
    [filters, updateFilters, logs, loading, error, page, changePage, totalCount, exporting, fetchAllMatching]
  );
}
