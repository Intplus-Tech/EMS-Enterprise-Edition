"use client";

/**
 * AttachmentViewModal — full-window viewer for a request's supporting document.
 * Consumed by DashboardShell; opened from any "view attachment" affordance.
 * Design source: designs/initiator/Attachment View - Modal.png
 *
 * Replaces the `alert("Simulated view for: …")` stubs. Documents are already
 * uploaded to Cloudinary and the request stores the resulting URL, so there is
 * a real file to render — images inline, PDFs in a frame, and anything else
 * (or a legacy filename with no URL) falls back to a download prompt.
 */

import React from "react";
import * as Icons from "lucide-react";
import { AttachmentDto } from "../../types/api";
// Shared with the model's `paymentReceiptFile` virtual, so a stored reference
// resolves to the same name and viewability wherever it is rendered.
import { fileNameFromUrl, isStoredUrl } from "../../domains/attachments/attachment.rules";

/**
 * What the viewer opens. Structurally an `AttachmentDto` plus the request it
 * belongs to, so an attachment can be handed straight from `AttachmentList`.
 */
export interface AttachmentTarget extends Partial<AttachmentDto> {
  /** Cloudinary URL, or a bare filename for records created before uploads. */
  url: string;
  requestNumber?: string;
}

interface AttachmentViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  attachment: AttachmentTarget | null;
}

function extensionOf(source: string): string {
  const name = fileNameFromUrl(source);
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
}

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"];

export const AttachmentViewModal: React.FC<AttachmentViewModalProps> = ({
  isOpen,
  onClose,
  attachment,
}) => {
  if (!isOpen || !attachment) return null;

  const source = attachment.url;
  const name = attachment.name || fileNameFromUrl(source);
  const extension = extensionOf(source);
  const viewable = isStoredUrl(source);
  const isImage = viewable && IMAGE_EXTENSIONS.includes(extension);
  const isPdf = viewable && extension === "pdf";

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgb(var(--color-overlay) / 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1100,
        padding: "1.5rem",
      }}
    >
      {/* Close sits outside the sheet, as in the design */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close attachment"
        style={{
          position: "absolute",
          top: "1.25rem",
          right: "1.5rem",
          background: "none",
          border: "none",
          color: "rgb(var(--color-text))",
          cursor: "pointer",
          padding: "0.25rem",
          lineHeight: 0,
        }}
      >
        <Icons.X size={26} />
      </button>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "860px",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          background: "rgb(var(--color-card))",
          border: "1px solid rgb(var(--color-card-border))",
          borderRadius: "0.75rem",
          overflow: "hidden",
        }}
      >
        {/* Header — filename and the actions the design places top-right */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
            padding: "1rem 1.25rem",
            borderBottom: "1px solid rgb(var(--color-card-border))",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", minWidth: 0 }}>
            <Icons.FileText size={18} style={{ color: "#2563EB", flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  color: "rgb(var(--color-text))",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {name}
              </div>
              {attachment.requestNumber && (
                <div style={{ fontSize: "0.75rem", color: "rgb(var(--color-text-muted))" }}>
                  {attachment.requestNumber}
                </div>
              )}
            </div>
          </div>

          {viewable && (
            <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
              <a
                href={source}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ fontSize: "0.8rem", padding: "0.45rem 0.85rem", textDecoration: "none" }}
              >
                <Icons.ExternalLink size={14} /> Open
              </a>
              <a
                href={source}
                download={name}
                className="btn btn-primary"
                style={{ fontSize: "0.8rem", padding: "0.45rem 0.85rem", textDecoration: "none" }}
              >
                <Icons.Download size={14} /> Download
              </a>
            </div>
          )}
        </div>

        {/* Body — inline render where the browser can, guidance where it cannot */}
        <div
          style={{
            flex: 1,
            overflow: "auto",
            background: "rgb(var(--color-surface-secondary))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: isImage ? "1rem" : 0,
            minHeight: "320px",
          }}
        >
          {isImage && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={source}
              alt={name}
              style={{ maxWidth: "100%", maxHeight: "70vh", objectFit: "contain", borderRadius: "0.35rem" }}
            />
          )}

          {isPdf && (
            <iframe
              src={source}
              title={name}
              style={{ width: "100%", height: "70vh", border: "none", background: "#FFFFFF" }}
            />
          )}

          {viewable && !isImage && !isPdf && (
            <div style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
              <Icons.FileQuestion size={44} style={{ color: "rgb(var(--color-text-dim))" }} />
              <p style={{ marginTop: "0.85rem", color: "rgb(var(--color-text-muted))", fontSize: "0.9rem" }}>
                This file type cannot be previewed in the browser.
              </p>
              <a
                href={source}
                download={name}
                className="btn btn-primary"
                style={{ marginTop: "1rem", textDecoration: "none", display: "inline-flex" }}
              >
                <Icons.Download size={16} /> Download {name}
              </a>
            </div>
          )}

          {/* Records predating the upload integration store only a filename. */}
          {!viewable && (
            <div style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
              <Icons.FileWarning size={44} style={{ color: "rgb(var(--color-text-dim))" }} />
              <p style={{ marginTop: "0.85rem", color: "rgb(var(--color-text))", fontWeight: 600 }}>{name}</p>
              <p style={{ marginTop: "0.35rem", color: "rgb(var(--color-text-muted))", fontSize: "0.85rem", maxWidth: "34rem" }}>
                This request references a file name rather than an uploaded document, so there is
                nothing to display. Ask the initiator to re-attach the file.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
