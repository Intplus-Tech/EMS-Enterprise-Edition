/**
 * FieldError — the inline message under a form control.
 *
 * Consumed by any dialog doing per-field validation. Renders nothing when there
 * is no message, so call sites read `<FieldError message={errors.amount} />`
 * rather than repeating a `{show && <p>}` guard at every field.
 *
 * Presentational only: it is told what is wrong, it never decides.
 */

import React from "react";
import * as Icons from "lucide-react";

export interface FieldErrorProps {
  /** Omitted or empty when the field is valid — nothing is rendered. */
  message?: string;
  /** Ties the message to its control via `aria-describedby`. */
  id?: string;
}

export const FieldError: React.FC<FieldErrorProps> = ({ message, id }) => {
  if (!message) return null;

  return (
    // `alert` rather than `status`: the message appears in response to the
    // user's own edit, so interrupting is the expected behaviour.
    <p className="form-error" id={id} role="alert">
      <Icons.AlertCircle size={13} style={{ flexShrink: 0, marginTop: "0.1rem" }} aria-hidden />
      <span>{message}</span>
    </p>
  );
};
