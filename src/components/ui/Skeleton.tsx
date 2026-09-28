/**
 * Skeleton — shimmering placeholders for content that is still loading.
 *
 * Preferred over a spinner wherever the shape of the result is already known
 * (tables, KPI rows), because the layout does not jump when the data lands.
 * `TableSkeleton` is the composition used by the data-table screens.
 */

import React from "react";

export interface SkeletonProps {
  width?: string;
  height?: string;
  /** Pass "9999px" for avatars and pills. */
  radius?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = "100%",
  height = "1rem",
  radius,
  style,
}) => <div className="skeleton" style={{ width, height, borderRadius: radius, ...style }} />;

export interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

/** Placeholder rows sized to the app's `.data-table` rhythm. */
export const TableSkeleton: React.FC<TableSkeletonProps> = ({ rows = 5, columns = 5 }) => (
  <div aria-hidden="true" style={{ display: "flex", flexDirection: "column", gap: "0.85rem", padding: "0.5rem 0" }}>
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div
        key={rowIndex}
        style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: "1rem", alignItems: "center" }}
      >
        {Array.from({ length: columns }).map((__, colIndex) => (
          <Skeleton
            key={colIndex}
            height="0.9rem"
            // Staggered widths stop the block reading as a solid grey grid.
            width={colIndex === 0 ? "70%" : colIndex === columns - 1 ? "45%" : "85%"}
          />
        ))}
      </div>
    ))}
  </div>
);
