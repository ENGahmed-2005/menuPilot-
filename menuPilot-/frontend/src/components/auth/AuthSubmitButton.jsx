/* ==========================================================================
   AuthSubmitButton.jsx — زر إرسال موحّد لفورمات auth، بمؤشر تحميل صغير
   ========================================================================== */
import { Loader2 } from "lucide-react";

export default function AuthSubmitButton({ loading, children, ...rest }) {
  return (
    <button
      type="submit"
      disabled={loading || rest.disabled}
      className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-ink py-3 text-sm font-medium text-paper transition-colors duration-200 hover:bg-copper hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
      {...rest}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
}
