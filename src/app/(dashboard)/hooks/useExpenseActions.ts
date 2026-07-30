"use client";

/**
 * Expense workflow actions, shared by every approval surface.
 *
 * Two things used to live inside `ApprovalsTab`: raw `fetch` calls (which
 * engineering rule 1-D forbids in presentational components) and the rule that
 * a Finance Head's decision routes to `/exceptional` while everyone else routes
 * to `/workflow`. That routing is a business rule, so it belongs here rather
 * than being re-derived at each of the twelve call sites that needed it.
 */
import { useCallback, useState } from "react";
import { ExpenseClient } from "../../../services/expense.client";
import { toErrorMessage } from "../../../services/http";
import { SystemRole } from "../../../enums/roles";
import { WorkflowActionType } from "../../../enums/workflowActions";

interface ExpenseActionOptions {
  currentUser: { role?: SystemRole | string } | null;
  /** Refetches dashboard data after a successful transition. */
  reload: () => Promise<void> | void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export function useExpenseActions({ currentUser, reload, onSuccess, onError }: ExpenseActionOptions) {
  const [submitting, setSubmitting] = useState(false);

  /**
   * Finance Head decisions are budget-expansion decisions and use the
   * exceptional route; every other role advances the standard workflow.
   */
  const isFinanceHead = currentUser?.role === SystemRole.FINANCE_HEAD;

  const perform = useCallback(
    async (operation: () => Promise<unknown>, successMessage: string) => {
      if (submitting) return false;
      setSubmitting(true);
      try {
        await operation();
        await reload();
        onSuccess(successMessage);
        return true;
      } catch (error) {
        onError(toErrorMessage(error, "The action could not be completed."));
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [submitting, reload, onSuccess, onError]
  );

  /** Records an approver decision against whichever route the role owns. */
  const decide = useCallback(
    (id: string, action: WorkflowActionType, comment: string, successMessage: string) =>
      perform(
        () =>
          isFinanceHead
            ? ExpenseClient.exceptionalAction(id, action, comment)
            : ExpenseClient.workflowAction(id, action, comment),
        successMessage
      ),
    [perform, isFinanceHead]
  );

  const approve = useCallback(
    (id: string, comment = "Approved.") =>
      decide(id, WorkflowActionType.APPROVE, comment, "Request approved and forwarded to the next stage."),
    [decide]
  );

  const reject = useCallback(
    (id: string, comment: string) =>
      decide(id, WorkflowActionType.REJECT, comment, "Request rejected."),
    [decide]
  );

  const returnForClarification = useCallback(
    (id: string, comment: string) =>
      decide(id, WorkflowActionType.RETURN, comment, "Clarification request sent to the requester."),
    [decide]
  );

  /** Finance Officer: confirm documentation and upload the bank instruction. */
  const verifyAndUpload = useCallback(
    (id: string) =>
      perform(
        () => ExpenseClient.financeUpload(id),
        "Expense verified and instruction uploaded to the bank platform."
      ),
    [perform]
  );

  /** Finance Manager: release the payment and close the request. */
  const releasePayment = useCallback(
    (id: string, reference: string, receipt?: string) =>
      perform(
        () => ExpenseClient.releasePayment(id, reference, receipt),
        `Payment released. Reference: ${reference}`
      ),
    [perform]
  );

  /** Finance Head: approve a one-time budget expansion, optionally adjusted. */
  const approveExpansion = useCallback(
    (id: string, comment: string, adjustedAmount?: number) =>
      perform(
        () =>
          ExpenseClient.exceptionalAction(id, WorkflowActionType.APPROVE, comment, adjustedAmount),
        "Exceptional budget expansion approved."
      ),
    [perform]
  );

  const rejectExpansion = useCallback(
    (id: string, comment: string) =>
      perform(
        () => ExpenseClient.exceptionalAction(id, WorkflowActionType.REJECT, comment),
        "Budget expansion request rejected."
      ),
    [perform]
  );

  const returnExpansion = useCallback(
    (id: string, comment: string) =>
      perform(
        () => ExpenseClient.exceptionalAction(id, WorkflowActionType.RETURN, comment),
        "Request returned to the initiator."
      ),
    [perform]
  );

  return {
    submitting,
    approve,
    reject,
    returnForClarification,
    verifyAndUpload,
    releasePayment,
    approveExpansion,
    rejectExpansion,
    returnExpansion,
  };
}

export type ExpenseActions = ReturnType<typeof useExpenseActions>;
