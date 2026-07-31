"use client";

/**
 * Loads and appends to a request's communication thread.
 *
 * Comments were previously pushed into component state and never sent anywhere,
 * so the thread reset on every refresh and no other participant ever saw them.
 */
import { useCallback, useEffect, useState } from "react";
import { ExpenseClient } from "../../../services/expense.client";
import { toErrorMessage } from "../../../services/http";
import { ThreadEntryDto } from "../../../types/api";

interface LoadedThread {
  requestId: string;
  entries: ThreadEntryDto[];
}

const EMPTY: ThreadEntryDto[] = [];

export function useRequestThread(
  requestId?: string | null,
  onError?: (message: string) => void
) {
  const [loaded, setLoaded] = useState<LoadedThread | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!requestId) return;

    // Prevents a stale response overwriting the thread of a newly opened request.
    let cancelled = false;

    ExpenseClient.thread(requestId)
      .then((entries) => {
        if (!cancelled) setLoaded({ requestId, entries });
      })
      .catch(() => {
        if (!cancelled) setLoaded({ requestId, entries: [] });
      });

    return () => {
      cancelled = true;
    };
  }, [requestId]);

  const addComment = useCallback(
    async (message: string, isInternal = false) => {
      if (!requestId || !message.trim() || sending) return false;
      setSending(true);
      try {
        const entries = await ExpenseClient.addComment(requestId, message, isInternal);
        setLoaded({ requestId, entries });
        return true;
      } catch (error) {
        onError?.(toErrorMessage(error, "Could not post the comment."));
        return false;
      } finally {
        setSending(false);
      }
    },
    [requestId, sending, onError]
  );

  // Derived, so a newly opened request never briefly shows the previous thread
  // and no state is set during the effect.
  const isCurrent = Boolean(requestId) && loaded?.requestId === requestId;

  return {
    thread: isCurrent ? loaded!.entries : EMPTY,
    threadLoading: Boolean(requestId) && !isCurrent,
    threadSending: sending,
    addComment,
  };
}
