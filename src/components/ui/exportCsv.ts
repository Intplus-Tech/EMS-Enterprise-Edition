/**
 * Client-side CSV export.
 *
 * The export buttons across the reporting, directory and pipeline screens were
 * `alert("Exporting…")` stubs. The data they export is already in memory, so a
 * Blob download is the whole job — no server round-trip and no new dependency.
 */

/** A column definition: the header text and how to read it off a row. */
export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

/**
 * Escapes one field per RFC 4180.
 *
 * The leading-apostrophe guard defends against CSV injection: a value starting
 * `=`, `+`, `-` or `@` is executed as a formula when the file is opened in
 * Excel or Sheets, and these exports contain user-supplied text.
 */
function escapeField(raw: string | number | null | undefined): string {
  const value = raw === null || raw === undefined ? "" : String(raw);
  const guarded = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${guarded.replace(/"/g, '""')}"`;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => escapeField(c.header)).join(",");
  const body = rows.map((row) => columns.map((c) => escapeField(c.value(row))).join(","));
  return [header, ...body].join("\r\n");
}

/**
 * Builds a CSV and triggers a download.
 * Returns false when there is nothing to export so callers can report it.
 */
export function downloadCsv<T>(filename: string, rows: T[], columns: CsvColumn<T>[]): boolean {
  if (rows.length === 0) return false;

  // The BOM makes Excel read the file as UTF-8, without which "₦" is mangled.
  const blob = new Blob(["﻿", toCsv(rows, columns)], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return true;
}

/** `expense-report-2026-07-30.csv` — dated so repeat exports do not collide. */
export function datedFilename(prefix: string): string {
  return `${prefix}-${new Date().toISOString().split("T")[0]}.csv`;
}
