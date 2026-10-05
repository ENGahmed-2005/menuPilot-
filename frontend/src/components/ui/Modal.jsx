/* ==========================================================================
   Modal.jsx — accessible dialog.
   Esc and backdrop close it, focus moves inside on open and returns to the
   trigger on close, Tab stays inside, and the page behind doesn't scroll.
   size: sm | md | lg | xl
   ========================================================================== */
import { useId, useRef } from "react";
import { X } from "lucide-react";
import { t, dir } from "../../i18n";
import { useDialog } from "../../hooks/useDialog";

const SIZES = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-2xl", xl: "max-w-5xl" };

export default function Modal({ open, onClose, title, description, size = "md", footer, bodyClassName = "px-6 py-5", children }) {
  const panelRef = useRef(null);
  const titleId = useId();
  const descId = useId();
  useDialog(open, panelRef, onClose);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/55 p-0 backdrop-blur-[2px] animate-fade-in sm:items-center sm:p-4" onMouseDown={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        dir={dir}
        onMouseDown={(event) => event.stopPropagation()}
        className={`relative flex max-h-[92vh] w-full ${SIZES[size] || SIZES.md} flex-col rounded-t-[var(--radius-panel)] bg-surface text-ink shadow-[var(--shadow-dialog)] outline-none animate-dialog-in sm:rounded-[var(--radius-panel)]`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
          <div>
            {title && <h2 id={titleId} className="text-lg font-extrabold">{title}</h2>}
            {description && <p id={descId} className="mt-1 text-sm text-muted">{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label={t("إغلاق")} className="-m-1.5 rounded-full p-2 text-muted transition-colors hover:bg-ink/[0.06] hover:text-ink">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className={`min-h-0 flex-1 overflow-y-auto ${bodyClassName}`}>{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}
