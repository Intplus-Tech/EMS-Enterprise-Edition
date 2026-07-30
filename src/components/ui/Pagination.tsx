"use client";

/**
 * Pagination — the "Showing X to Y of Z entries" footer plus numbered pager.
 *
 * Every paginated table in the designs uses this exact footer, so it is owned in
 * one place. Purely presentational: the caller keeps `page` state and slices data.
 */

import React from "react";
import * as Icons from "lucide-react";

export interface PaginationProps {
  page: number;
  rowsPerPage: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  /** Noun used in the summary line, e.g. "entries", "users", "departments". */
  itemLabel?: string;
}

/**
 * Builds a compact page list (`1 2 3 … 29`) so long result sets do not overflow
 * the footer. `-1` is the ellipsis marker.
 */
function buildPageList(page: number, totalPages: number): number[] {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
  if (page <= 3) return [1, 2, 3, -1, totalPages];
  if (page >= totalPages - 2) return [1, -1, totalPages - 2, totalPages - 1, totalPages];
  return [1, -1, page, -1, totalPages];
}

export const Pagination: React.FC<PaginationProps> = ({
  page,
  rowsPerPage,
  totalCount,
  onPageChange,
  itemLabel = "entries",
}) => {
  const totalPages = Math.max(1, Math.ceil(totalCount / rowsPerPage));
  const firstRow = totalCount === 0 ? 0 : (page - 1) * rowsPerPage + 1;
  const lastRow = Math.min(page * rowsPerPage, totalCount);

  const stepStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 32,
    height: 32,
    borderRadius: "0.4rem",
    border: "1px solid rgb(var(--color-card-border))",
    background: "transparent",
    color: "rgb(var(--color-text-muted))",
    cursor: "pointer",
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "1rem",
        flexWrap: "wrap",
        paddingTop: "1rem",
        fontSize: "0.82rem",
        color: "rgb(var(--color-text-muted))",
      }}
    >
      <span>
        Showing {firstRow} to {lastRow} of {totalCount} {itemLabel}
      </span>

      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
        <button
          type="button"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          style={{ ...stepStyle, opacity: page <= 1 ? 0.4 : 1, cursor: page <= 1 ? "not-allowed" : "pointer" }}
        >
          <Icons.ChevronLeft size={15} />
        </button>

        {buildPageList(page, totalPages).map((p, idx) =>
          p === -1 ? (
            <span key={`gap-${idx}`} style={{ padding: "0 0.25rem" }}>
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              aria-current={p === page ? "page" : undefined}
              style={{
                ...stepStyle,
                background: p === page ? "#2563EB" : "transparent",
                borderColor: p === page ? "#2563EB" : "rgb(var(--color-card-border))",
                color: p === page ? "#FFFFFF" : "rgb(var(--color-text-muted))",
                fontWeight: p === page ? 700 : 500,
              }}
            >
              {p}
            </button>
          )
        )}

        <button
          type="button"
          aria-label="Next page"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          style={{
            ...stepStyle,
            opacity: page >= totalPages ? 0.4 : 1,
            cursor: page >= totalPages ? "not-allowed" : "pointer",
          }}
        >
          <Icons.ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
};
