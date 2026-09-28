/* ==========================================================================
   Toast.jsx — short confirmations after an action ("تم إغلاق الجلسة").
   Provider is mounted once in DashboardShell; pages call useToast().
     const toast = useToast(); toast.success("…"); toast.error("…");
   Top of the screen on phones (never covers a bottom cart/action bar),
   bottom-left on larger screens. Announced politely, auto-dismiss after 4 s.
   ========================================================================== */
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

const ToastContext = createContext(null);
const TONES = {
  success: { icon: CheckCircle2, box: "bg-navy text-paper", iconClass: "text-copper" },
  error: { icon: AlertCircle, box: "bg-brick text-paper", iconClass: "text-paper" },
  info: { icon: Info, box: "bg-navy text-paper", iconClass: "text-paper/80" },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);
  const push = useCallback((tone, message) => {
    const id = nextId.current++;
    setToasts((list) => [...list.slice(-2), { id, tone, message }]);
    setTimeout(() => dismiss(id), 4000);
  }, [dismiss]);

  const api = useMemo(() => ({
    success: (m) => push("success", m),
    error: (m) => push("error", m),
    info: (m) => push("info", m),
  }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-4 top-[calc(1rem+env(safe-area-inset-top,0px))] z-[70] flex flex-col items-center gap-2 sm:inset-x-auto sm:bottom-6 sm:left-6 sm:top-auto sm:items-start">
        {toasts.map((t) => {
          const { icon: Icon, box, iconClass } = TONES[t.tone] || TONES.info;
          return (
            <div key={t.id} dir="rtl" className={`pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold shadow-[var(--shadow-dialog)] animate-dialog-in ${box}`}>
              <Icon size={18} className={`shrink-0 ${iconClass}`} aria-hidden="true" />
              <span className="flex-1">{t.message}</span>
              <button type="button" onClick={() => dismiss(t.id)} aria-label="إخفاء" className="-m-1 rounded-lg p-1 opacity-70 hover:opacity-100"><X size={15} aria-hidden="true" /></button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  // Outside the provider (e.g. customer pages) fall back to a no-op.
  return ctx || { success: () => {}, error: () => {}, info: () => {} };
}
