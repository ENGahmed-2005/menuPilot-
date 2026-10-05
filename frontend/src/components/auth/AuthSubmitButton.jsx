/* ==========================================================================
   AuthSubmitButton.jsx — زر إرسال موحّد لفورمات auth، بمؤشر تحميل صغير
   ========================================================================== */
import { Loader2 } from "lucide-react";

export default function AuthSubmitButton({ loading, children, ...rest }) {
  return (
    <button
      type="submit"
      disabled={loading || rest.disabled}
      aria-busy={loading || undefined}
      className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-copper text-sm font-bold text-ink transition-[filter,transform] duration-150 hover:brightness-[0.93] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
      {...rest}
    >
      {loading && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}
