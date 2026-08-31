/* ==========================================================================
   Modal.jsx — نافذة منبثقة عامة (بديل معمّم عن AuthModal اللي كان جوا
   landing.jsx القديم — لو احتجت نافذة تسجيل دخول/تسجيل منبثقة بدل صفحة
   كاملة لاحقًا، ابنيها فوق هذا المكوّن).
   ========================================================================== */
import { X } from "lucide-react";

export default function Modal({ open, onClose, title, children }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-paper-2 p-6 text-ink shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute right-4 top-4 rounded-full p-1.5 text-ink-soft transition-colors hover:bg-ink/8 hover:text-ink"
          onClick={onClose}
          aria-label="إغلاق"
        >
          <X size={18} />
        </button>
        {title && <h2 className="mb-4 pr-8 font-display text-2xl">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
