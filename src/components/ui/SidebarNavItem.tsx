"use client";

/**
 * One row in the dashboard sidebar. Consumed by `DashboardShell` for every role,
 * so the active treatment is defined once here instead of being re-styled per
 * role — that duplication is why some roles highlighted the active page in grey
 * and others in the brand blue the designs call for.
 *
 * Presentational only: it receives its label, state and click handler and does
 * no routing or data access of its own (rule 1-D).
 */

import React from "react";
import { DynamicIcon } from "../DynamicIcon";

interface SidebarNavItemProps {
  label: string;
  /** Lucide icon name, rendered via DynamicIcon. */
  icon: string;
  isActive: boolean;
  onClick: () => void;
  /** Queue depth pill; omitted or 0 renders nothing. */
  badgeCount?: number;
}

export const SidebarNavItem: React.FC<SidebarNavItemProps> = ({
  label,
  icon,
  isActive,
  onClick,
  badgeCount,
}) => (
  <button
    onClick={onClick}
    // Styling lives in globals.css so the active treatment is themed in one
    // place; `aria-current` carries the state for assistive tech, since colour
    // and weight alone do not.
    className={`btn sidebar-nav-item${isActive ? " active" : ""}`}
    aria-current={isActive ? "page" : undefined}
  >
    <DynamicIcon name={icon} size={18} />
    {label}

    {badgeCount ? <span className="sidebar-nav-badge">{badgeCount}</span> : null}
  </button>
);
