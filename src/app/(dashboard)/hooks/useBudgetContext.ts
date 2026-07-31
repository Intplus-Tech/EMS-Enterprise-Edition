"use client";

/**
 * Loads the real budget position for whichever request is currently selected.
 *
 * The approval screens used to derive these figures locally from the request
 * amount, so an approver authorising an over-budget request saw a hardcoded
 * ₦250,000 ceiling instead of the department's actual position. This fetches it.
 */
import { useEffect, useState } from "react";
import { ExpenseClient } from "../../../services/expense.client";
import { BudgetContextDto } from "../../../types/api";

interface LoadedContext {
  requestId: string;
  data: BudgetContextDto | null;
}

export function useBudgetContext(requestId?: string | null) {
  const [loaded, setLoaded] = useState<LoadedContext | null>(null);

  useEffect(() => {
    if (!requestId) return;

    // Guards against a slow response for a previously selected request
    // overwriting the context of the one now on screen.
    let cancelled = false;

    ExpenseClient.budgetContext(requestId)
      .then((result) => {
        if (!cancelled) setLoaded({ requestId, data: result });
      })
      .catch(() => {
        // Screens fall back to their "budget not configured" state.
        if (!cancelled) setLoaded({ requestId, data: null });
      });

    return () => {
      cancelled = true;
    };
  }, [requestId]);

  // Both values are derived from what has loaded, so switching requests never
  // briefly shows the previous request's figures and no state is set during
  // the effect (which would cost an extra render pass).
  const isCurrent = Boolean(requestId) && loaded?.requestId === requestId;

  return {
    budgetContext: isCurrent ? loaded!.data : null,
    budgetContextLoading: Boolean(requestId) && !isCurrent,
  };
}
