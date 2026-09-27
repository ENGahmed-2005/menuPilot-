/* ==========================================================================
   Input.jsx — labelled field with hint and inline error.
   The error is linked with aria-describedby and aria-invalid, so screen
   readers read it together with the field.
   ========================================================================== */
import { useId } from "react";

export const fieldClasses = (error) =>
  `h-11 w-full rounded-[var(--radius-control)] border bg-surface px-3.5 text-sm text-ink placeholder:text-muted/70 outline-none transition-colors focus:border-copper focus:ring-2 focus:ring-copper/25 disabled:bg-surface-2 ${
    error ? "border-brick" : "border-line hover:border-ink/25"
  }`;

export default function Input({ label, hint, error, id, className = "", required, ...rest }) {
  const autoId = useId();
  const inputId = id || autoId;
  const describedBy = [hint && `${inputId}-hint`, error && `${inputId}-error`].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-bold text-ink">
          {label} {required && <span className="text-brick" aria-hidden="true">*</span>}
        </label>
      )}
      <input id={inputId} required={required} aria-invalid={Boolean(error) || undefined} aria-describedby={describedBy} className={`${fieldClasses(error)} ${className}`} {...rest} />
      {hint && !error && <span id={`${inputId}-hint`} className="text-xs text-muted">{hint}</span>}
      {error && <span id={`${inputId}-error`} className="text-xs font-bold text-brick">{error}</span>}
    </div>
  );
}
