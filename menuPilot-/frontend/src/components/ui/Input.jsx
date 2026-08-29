/* ==========================================================================
   Input.jsx — حقل إدخال موحّد مع label ورسالة خطأ اختيارية
   ========================================================================== */
export default function Input({ label, error, id, className = "", ...rest }) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-ink-soft">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/50 outline-none transition-colors focus:border-copper focus:ring-2 focus:ring-copper/20 ${
          error ? "border-brick" : "border-ink/15"
        } ${className}`}
        {...rest}
      />
      {error && (
        <span className="text-xs text-brick" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
