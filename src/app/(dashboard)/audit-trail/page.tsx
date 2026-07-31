"use client";

import { AdminAuditTrailViewerTab } from "../../../components/admin/AdminAuditTrailViewerTab";
import { AUDIT_CSV_COLUMNS, formatAuditLog } from "../../../components/admin/auditTrailRow";
import { datedFilename, downloadCsv } from "../../../components/ui/exportCsv";
import { useDashboard } from "../DashboardProvider";
import { useAuditTrailLogs } from "../hooks/useAuditTrailLogs";

export default function AuditTrailPage() {
  const { currentUser } = useDashboard();
  // Server state for this screen only — it pages against the database rather
  // than reusing the provider's `systemLogs` snapshot.
  const audit = useAuditTrailLogs();

  if (currentUser?.role !== "ADMIN") return null;

  /** Exports the whole filtered set, which spans pages the table never rendered. */
  const handleExport = async () => {
    const all = await audit.fetchAllMatching();
    downloadCsv(datedFilename("audit-trail"), all.map(formatAuditLog), AUDIT_CSV_COLUMNS);
  };

  return (
    <AdminAuditTrailViewerTab
      logs={audit.logs}
      loading={audit.loading}
      error={audit.error}
      filters={audit.filters}
      onFilterChange={audit.updateFilters}
      page={audit.page}
      rowsPerPage={audit.rowsPerPage}
      totalCount={audit.totalCount}
      onPageChange={audit.changePage}
      onExport={handleExport}
      exporting={audit.exporting}
    />
  );
}
