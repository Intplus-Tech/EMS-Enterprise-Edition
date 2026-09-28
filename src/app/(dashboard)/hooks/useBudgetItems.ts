"use client";

/**
 * Loads the budget items an approver can book the selected request against.
 *
 * The "Approve Financial Request" dialog has always shown a Budget Item select
 * (designs/approval/Approve Request Modal.png) but nothing ever populated it,
 * so the approver picked from an empty list and the choice was appended to the
 * comment text as prose. These are the department's real items, each carrying
 * the headroom needed to see whether it covers the request.
 *
 * Mirrors `useBudgetContext`: keyed on the request id, with the same guard
 * against a slow response for a previously selected request landing after the
 * one now on screen.
 */
import { useCallback, useEffect, useState } from "react";
import { ExpenseClient } from "../../../services/expense.client";
import { BudgetItemOptionDto } from "../../../types/api";

interface LoadedItems {
  requestId: string;
  data: BudgetItemOptionDto[];
}

export function useBudgetItems(requestId?: string | null) {
  const [loaded, setLoaded] = useState<LoadedItems | null>(null);
  // Bumped to re-fetch after an approval changes an item's reservation.
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!requestId) return;

    let cancelled = false;

    ExpenseClient.budgetItems(requestId)
      .then((items) => {
        if (!cancelled) setLoaded({ requestId, data: items });
      })
      .catch(() => {
        // An empty list is the honest fallback: the dialog then explains that
        // the department has no items rather than silently offering none.
        if (!cancelled) setLoaded({ requestId, data: [] });
      });

    return () => {
      cancelled = true;
    };
  }, [requestId, nonce]);

  const isCurrent = Boolean(requestId) && loaded?.requestId === requestId;

  return {
    budgetItems: isCurrent ? loaded!.data : [],
    budgetItemsLoading: Boolean(requestId) && !isCurrent,
    reloadBudgetItems: useCallback(() => setNonce((n) => n + 1), []),
  };
}
