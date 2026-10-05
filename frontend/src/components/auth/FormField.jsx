/* ==========================================================================
   FormField.jsx — حقل فورم موحّد (label + input بحدود صندوق + أيقونة اختيارية)
   --------------------------------------------------------------------------
   يستخدم في Login/Register/ForgotPassword/ResetPassword عشان أي تعديل على
   شكل الحقل (padding، حدود، حالة الخطأ...) يصير مرة واحدة هنا بدل ما يتكرر
   في 4 ملفات. الأيقونة (icon) بتاخد مكوّن lucide-react جاهز، زي Mail أو Lock.
   ========================================================================== */
export default function FormField({ id, label, icon: Icon, error, endAdornment, className = "", ...rest }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-bold text-ink">
        {label}
      </label>
      <div
        className={`flex min-h-11 items-center gap-2.5 rounded-[var(--radius-control)] border bg-surface px-3.5 transition-colors focus-within:border-copper focus-within:ring-2 focus-within:ring-copper/20 ${
          error ? "border-brick" : "border-line hover:border-ink/25"
        }`}
      >
        {Icon && <Icon size={17} className="shrink-0 text-muted" aria-hidden="true" />}
        <input
          id={id}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-ink outline-none placeholder:text-muted"
          {...rest}
        />
        {endAdornment}
      </div>
      {error && (
        <span id={`${id}-error`} className="mt-1 block text-xs font-bold text-brick" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
