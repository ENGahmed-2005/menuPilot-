import { useState } from "react";
import {
  Link,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

export default function Checkout() {
  // نستخدم useSearchParams لقراءة الخطة من الرابط:
  // مثال: /checkout?plan=pro
  const [searchParams] = useSearchParams();

  // نستخدم useNavigate للانتقال إلى صفحة النجاح بعد الدفع التجريبي.
  const navigate = useNavigate();

  // إذا لم توجد خطة في الرابط، نستخدم Basic كخطة افتراضية.
  const selectedPlan = searchParams.get("plan") || "basic";

  // بيانات الخطط الحالية.
  // هذه الأسعار مؤقتة إلى أن يحدد الفريق الأسعار الحقيقية.
  const planDetails = {
    basic: {
      name: "Basic",
      price: "$19",
    },

    pro: {
      name: "Pro",
      price: "$39",
    },

    premium: {
      name: "Premium",
      price: "$69",
    },
  };

  // نحدد بيانات الخطة التي اختارها المستخدم.
  // إذا وصلت قيمة غير موجودة نرجع إلى Basic.
  const currentPlan =
    planDetails[selectedPlan] || planDetails.basic;

  // نخزن بيانات الفورم داخل state.
  const [formData, setFormData] = useState({
    cardholderName: "",
    cardNumber: "",
    expiry: "",
    cvv: "",
  });

  // نخزن رسائل الأخطاء لكل input.
  const [errors, setErrors] = useState({});

  // نستخدم loading لمنع المستخدم من الضغط على زر الدفع أكثر من مرة.
  const [isLoading, setIsLoading] = useState(false);

  // ========================================================================
  // تحديث بيانات الفورم
  // ========================================================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  };

  // ========================================================================
  // التحقق من البيانات
  // ========================================================================

  const validateForm = () => {
    const newErrors = {};

    // التحقق من اسم صاحب البطاقة.
    if (!formData.cardholderName.trim()) {
      newErrors.cardholderName =
        "Cardholder name is required.";
    }

    // إزالة المسافات من رقم البطاقة.
    const cleanCardNumber =
      formData.cardNumber.replace(/\s/g, "");

    // تحقق بسيط فقط للواجهة التجريبية.
    // لاحقًا بوابة الدفع الحقيقية هي التي تتحقق من البطاقة.
    if (!cleanCardNumber) {
      newErrors.cardNumber =
        "Card number is required.";
    } else if (!/^\d{16}$/.test(cleanCardNumber)) {
      newErrors.cardNumber =
        "Card number must contain 16 digits.";
    }

    // التحقق من تاريخ الانتهاء بصيغة MM/YY.
    if (!formData.expiry.trim()) {
      newErrors.expiry =
        "Expiry date is required.";
    } else if (
      !/^(0[1-9]|1[0-2])\/\d{2}$/.test(
        formData.expiry
      )
    ) {
      newErrors.expiry =
        "Use expiry format MM/YY.";
    }

    // CVV يجب أن يكون 3 أو 4 أرقام.
    if (!formData.cvv.trim()) {
      newErrors.cvv =
        "CVV is required.";
    } else if (!/^\d{3,4}$/.test(formData.cvv)) {
      newErrors.cvv =
        "CVV must contain 3 or 4 digits.";
    }

    // نخزن الأخطاء لعرضها تحت الحقول.
    setErrors(newErrors);

    // إذا لم توجد أخطاء نرجع true.
    return Object.keys(newErrors).length === 0;
  };

  // ========================================================================
  // إرسال نموذج الدفع
  // ========================================================================

  const handlePayment = (e) => {
    // منع reload للصفحة.
    e.preventDefault();

    // إذا كانت البيانات غير صحيحة نتوقف.
    if (!validateForm()) {
      return;
    }

    // تشغيل loading.
    setIsLoading(true);

    // ----------------------------------------------------------------------
    // مهم:
    // هذا دفع تجريبي فقط.
    //
    // لا يجب لاحقًا إرسال Card Number أو CVV مباشرة إلى Backend menuPilot.
    // عند اختيار Payment Gateway حقيقية، يتم استخدام SDK/API الخاصة بها.
    // ----------------------------------------------------------------------

    console.log("Checkout plan:", selectedPlan);

    // محاكاة انتظار عملية الدفع لمدة قصيرة.
    setTimeout(() => {
      setIsLoading(false);

      // بعد النجاح التجريبي نذهب إلى صفحة success.
      navigate(
        `/payment-success?plan=${selectedPlan}`
      );
    }, 1000);
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>

        {/* Logo يرجع إلى الصفحة الرئيسية */}
        <Link to="/" style={styles.logo}>
          menuPilot
        </Link>

        {/* عنوان الصفحة */}
        <div style={styles.heading}>
          <span style={styles.badge}>
            Checkout
          </span>

          <h1 style={styles.title}>
            Complete your subscription
          </h1>

          <p style={styles.subtitle}>
            Review your selected plan before continuing
            to payment.
          </p>
        </div>

        {/* ملخص الخطة والسعر */}
        <div style={styles.summary}>
          <div>
            <span style={styles.summaryLabel}>
              Selected plan
            </span>

            <strong style={styles.planName}>
              {currentPlan.name}
            </strong>
          </div>

          <div style={styles.priceBox}>
            <strong style={styles.price}>
              {currentPlan.price}
            </strong>

            <span style={styles.period}>
              / month
            </span>
          </div>
        </div>

        {/* نموذج الدفع */}
        <form
          onSubmit={handlePayment}
          style={styles.form}
          noValidate
        >
          {/* اسم صاحب البطاقة */}
          <div style={styles.field}>
            <label
              htmlFor="cardholderName"
              style={styles.label}
            >
              Cardholder Name
            </label>

            <input
              id="cardholderName"
              name="cardholderName"
              type="text"
              value={formData.cardholderName}
              onChange={handleChange}
              placeholder="Name on card"
              style={styles.input}
            />

            {errors.cardholderName && (
              <span style={styles.error}>
                {errors.cardholderName}
              </span>
            )}
          </div>

          {/* رقم البطاقة */}
          <div style={styles.field}>
            <label
              htmlFor="cardNumber"
              style={styles.label}
            >
              Card Number
            </label>

            <input
              id="cardNumber"
              name="cardNumber"
              type="text"
              inputMode="numeric"
              value={formData.cardNumber}
              onChange={handleChange}
              placeholder="1234 5678 9012 3456"
              style={styles.input}
            />

            {errors.cardNumber && (
              <span style={styles.error}>
                {errors.cardNumber}
              </span>
            )}
          </div>

          {/* Expiry + CVV بجانب بعض */}
          <div style={styles.row}>

            {/* Expiry */}
            <div style={styles.field}>
              <label
                htmlFor="expiry"
                style={styles.label}
              >
                Expiry
              </label>

              <input
                id="expiry"
                name="expiry"
                type="text"
                value={formData.expiry}
                onChange={handleChange}
                placeholder="MM/YY"
                style={styles.input}
              />

              {errors.expiry && (
                <span style={styles.error}>
                  {errors.expiry}
                </span>
              )}
            </div>

            {/* CVV */}
            <div style={styles.field}>
              <label
                htmlFor="cvv"
                style={styles.label}
              >
                CVV
              </label>

              <input
                id="cvv"
                name="cvv"
                type="password"
                inputMode="numeric"
                value={formData.cvv}
                onChange={handleChange}
                placeholder="123"
                style={styles.input}
              />

              {errors.cvv && (
                <span style={styles.error}>
                  {errors.cvv}
                </span>
              )}
            </div>

          </div>

          {/* زر الدفع */}
          <button
            type="submit"
            style={{
              ...styles.button,
              ...(isLoading
                ? styles.disabledButton
                : {}),
            }}
            disabled={isLoading}
          >
            {isLoading
              ? "Processing..."
              : `Pay ${currentPlan.price}`}
          </button>

        </form>

        {/* الرجوع إلى صفحة التسجيل */}
        <div style={styles.footer}>
          <Link
            to={`/register?plan=${selectedPlan}`}
            style={styles.backLink}
          >
            Back to registration
          </Link>
        </div>

      </div>
    </div>
  );
}


// ==========================================================================
// Styles الخاصة بصفحة Checkout فقط.
// لا نعدل index.css حتى لا نؤثر على صفحات الفريق.
// ==========================================================================

const styles = {
  page: {
    minHeight: "100vh",
    background: "#1f2420",
    color: "#ede6d6",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "32px 20px",
  },

  card: {
    width: "100%",
    maxWidth: "520px",
    background: "#272d28",
    border: "1px solid #424a43",
    borderRadius: "28px",
    padding: "34px",
  },

  logo: {
    color: "#ede6d6",
    textDecoration: "none",
    fontSize: "24px",
    fontWeight: "700",
    display: "inline-block",
    marginBottom: "28px",
  },

  heading: {
    marginBottom: "24px",
  },

  badge: {
    display: "inline-block",
    border: "1px solid #7f8a80",
    borderRadius: "999px",
    padding: "7px 12px",
    fontSize: "13px",
    marginBottom: "14px",
  },

  title: {
    margin: "0 0 12px",
    fontSize: "34px",
    lineHeight: "1.1",
  },

  subtitle: {
    color: "#b7bdb7",
    margin: 0,
    lineHeight: "1.6",
  },

  summary: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    padding: "18px",
    border: "1px solid #e49b72",
    borderRadius: "16px",
    marginBottom: "24px",
  },

  summaryLabel: {
    display: "block",
    fontSize: "12px",
    color: "#aeb5af",
    marginBottom: "5px",
  },

  planName: {
    fontSize: "20px",
  },

  priceBox: {
    textAlign: "right",
  },

  price: {
    fontSize: "24px",
  },

  period: {
    color: "#aeb5af",
    marginLeft: "4px",
  },

  form: {
    display: "grid",
    gap: "18px",
  },

  row: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "14px",
  },

  field: {
    display: "grid",
    gap: "8px",
  },

  label: {
    fontSize: "14px",
    fontWeight: "600",
  },

  input: {
    width: "100%",
    border: "1px solid #4d5650",
    background: "#1f2420",
    color: "#ede6d6",
    borderRadius: "12px",
    padding: "13px 14px",
    fontSize: "15px",
    outline: "none",
  },

  error: {
    color: "#ff9a8f",
    fontSize: "12px",
    lineHeight: "1.5",
  },

  button: {
    width: "100%",
    border: "none",
    borderRadius: "999px",
    padding: "14px 18px",
    background: "#e49b72",
    color: "#1f2420",
    fontWeight: "700",
    fontSize: "16px",
    cursor: "pointer",
  },

  disabledButton: {
    opacity: 0.7,
    cursor: "not-allowed",
  },

  footer: {
    marginTop: "20px",
    textAlign: "center",
  },

  backLink: {
    color: "#e49b72",
    textDecoration: "none",
    fontWeight: "600",
  },
};