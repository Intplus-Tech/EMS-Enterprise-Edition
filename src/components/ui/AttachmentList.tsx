"use client";

/**
 * AttachmentList — the supporting-documents block shown wherever a request's
 * files are listed (new request, resubmit, request detail, approval panel).
 *
 * Extracted because five screens each need "list the files, open one, maybe
 * remove one, maybe add more" and were previously rendering a single filename
 * in five different ways.
 * Design source: designs/finance-head/Request Detail with Budget & Communication Thread.png
 */

import React, { useRef } from "react";
import * as Icons from "lucide-react";
import { AttachmentDto } from "../../types/api";
import { formatFileSize, MAX_ATTACHMENTS_PER_REQUEST } from "../../domains/attachments/attachment.rules";
import { formatDate } from "./format";

export interface AttachmentListProps {
  attachments: AttachmentDto[];
  /** Opens a document in the viewer. */
  onView: (attachment: AttachmentDto) => void;
  /** Omit to render read-only. */
  onRemove?: (attachment: AttachmentDto) => void;
  /** Omit to hide the upload affordance. */
  onAdd?: (files: FileList) => void;
  uploading?: boolean;
  /** Shown under the heading, e.g. an upload error. */
  error?: string;
  /** Heading text; hidden when omitted. */
  label?: string;
  compact?: boolean;
}

/** Picks an icon that hints at the file type without needing a preview. */
function iconFor(attachment: AttachmentDto) {
  const name = (attachment.name || "").toLowerCase();
  if (/\.(png|jpe?g|gif|webp|bmp|svg)$/.test(name)) return Icons.FileImage;
  if (/\.(pdf)$/.test(name)) return Icons.FileText;
  if (/\.(xlsx?|csv)$/.test(name)) return Icons.FileSpreadsheet;
  return Icons.File;
}

export const AttachmentList: React.FC<AttachmentListProps> = ({
  attachments,
  onView,
  onRemove,
  onAdd,
  uploading = false,
  error,
  label = "Supporting Documents",
  compact = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const atLimit = attachments.length >= MAX_ATTACHMENTS_PER_REQUEST;

  return (
    <div>
      {label && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
          <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "rgb(var(--color-text-muted))" }}>
            {label} ({attachments.length})
          </span>
          {atLimit && (
            <span style={{ fontSize: "0.7rem", color: "rgb(var(--color-text-dim))" }}>
              Limit reached
            </span>
          )}
        </div>
      )}

      {error && (
        <p style={{ fontSize: "0.78rem", color: "#EF4444", margin: "0 0 0.5rem" }}>{error}</p>
      )}

      {/* Empty state — at least one document is mandatory, so say so */}
      {attachments.length === 0 && (
        <p style={{ fontSize: "0.8rem", color: "rgb(var(--color-text-dim))", margin: "0 0 0.6rem" }}>
          No documents attached yet. At least one is required.
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {attachments.map((attachment, idx) => {
          const FileIcon = iconFor(attachment);
          const meta = [
            formatFileSize(attachment.size),
            attachment.uploadedByName,
            attachment.uploadedAt ? formatDate(attachment.uploadedAt) : "",
          ]
            .filter(Boolean)
            .join(" • ");

          return (
            <div
              key={attachment._id || `${attachment.url}-${idx}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.65rem",
                padding: compact ? "0.5rem 0.65rem" : "0.65rem 0.85rem",
                borderRadius: "0.5rem",
                background: "rgb(var(--color-surface-secondary) / 0.5)",
                border: "1px solid rgb(var(--color-card-border) / 0.5)",
              }}
            >
              <FileIcon size={compact ? 15 : 17} style={{ color: "#2563EB", flexShrink: 0 }} />

              <button
                type="button"
                onClick={() => onView(attachment)}
                title={`Open ${attachment.name}`}
                style={{
                  flex: 1,
                  minWidth: 0,
                  textAlign: "left",
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  color: "inherit",
                }}
              >
                <div
                  style={{
                    fontSize: compact ? "0.78rem" : "0.83rem",
                    fontWeight: 600,
                    color: "rgb(var(--color-text))",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {attachment.name}
                </div>
                {meta && (
                  <div style={{ fontSize: "0.7rem", color: "rgb(var(--color-text-muted))" }}>{meta}</div>
                )}
              </button>

              {onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(attachment)}
                  aria-label={`Remove ${attachment.name}`}
                  // The last document cannot go: at least one is mandatory.
                  disabled={attachments.length <= 1}
                  title={
                    attachments.length <= 1
                      ? "A request must keep at least one document"
                      : `Remove ${attachment.name}`
                  }
                  style={{
                    background: "none",
                    border: "none",
                    color: "#EF4444",
                    cursor: attachments.length <= 1 ? "not-allowed" : "pointer",
                    opacity: attachments.length <= 1 ? 0.35 : 1,
                    padding: "0.15rem",
                    lineHeight: 0,
                    flexShrink: 0,
                  }}
                >
                  <Icons.X size={15} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {onAdd && (
        <>
          <input
            ref={inputRef}
            type="file"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files?.length) onAdd(e.target.files);
              // Reset so re-selecting the same file still fires a change event.
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading || atLimit}
            className="btn"
            style={{
              marginTop: "0.6rem",
              width: "100%",
              border: "1px dashed rgb(var(--color-card-border) / 0.9)",
              background: "transparent",
              fontSize: "0.78rem",
              padding: "0.5rem",
              display: "flex",
              justifyContent: "center",
              gap: "0.35rem",
              color: "rgb(var(--color-text-muted))",
              cursor: uploading || atLimit ? "not-allowed" : "pointer",
              opacity: uploading || atLimit ? 0.55 : 1,
            }}
          >
            {uploading ? (
              <>
                <Icons.Loader2 size={14} /> Uploading…
              </>
            ) : (
              <>
                <Icons.Plus size={14} /> Upload Additional Files
              </>
            )}
          </button>
        </>
      )}
    </div>
  );
};
