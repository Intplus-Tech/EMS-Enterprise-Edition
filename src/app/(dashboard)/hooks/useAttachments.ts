"use client";

/**
 * Adds and removes documents on a request that already exists.
 *
 * Distinct from the New Request form, which accumulates uploads locally before
 * the request is created: here the request has an id, so each change is
 * persisted immediately and the server returns the authoritative list.
 */
import { useCallback, useState } from "react";
import { ExpenseClient } from "../../../services/expense.client";
import { toErrorMessage } from "../../../services/http";
import { AttachmentDto } from "../../../types/api";

interface UseAttachmentsOptions {
  /** Called with the refreshed list after a successful change. */
  onChanged?: (attachments: AttachmentDto[]) => void;
  onError?: (message: string) => void;
  onSuccess?: (message: string) => void;
}

export function useAttachments({ onChanged, onError, onSuccess }: UseAttachmentsOptions = {}) {
  const [uploading, setUploading] = useState(false);

  const addFiles = useCallback(
    async (requestId: string, files: FileList | File[]) => {
      const list = Array.from(files);
      if (list.length === 0) return false;

      setUploading(true);
      try {
        // Upload in parallel, then record all of them in one write so a partial
        // failure does not leave half the batch attached.
        const uploaded = await Promise.all(list.map((file) => ExpenseClient.uploadDocument(file)));
        const attachments = await ExpenseClient.addAttachments(requestId, uploaded);

        onChanged?.(attachments);
        onSuccess?.(`${list.length} document${list.length === 1 ? "" : "s"} attached.`);
        return true;
      } catch (error) {
        onError?.(toErrorMessage(error, "The documents could not be attached."));
        return false;
      } finally {
        setUploading(false);
      }
    },
    [onChanged, onError, onSuccess]
  );

  const removeAttachment = useCallback(
    async (requestId: string, attachmentId: string) => {
      try {
        const attachments = await ExpenseClient.removeAttachment(requestId, attachmentId);
        onChanged?.(attachments);
        onSuccess?.("Document removed.");
        return true;
      } catch (error) {
        onError?.(toErrorMessage(error, "The document could not be removed."));
        return false;
      }
    },
    [onChanged, onError, onSuccess]
  );

  return { uploading, addFiles, removeAttachment };
}
