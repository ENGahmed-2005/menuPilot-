import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

export default function Register() {
  // =========================================================
  // React Router
  // =========================================================

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // الخطة القادمة من صفحة Pricing
  // مثال:
  // /register?plan=pro
  const planFromUrl = searchParams.get("plan");

  // =========================================================
  // Theme
  // =========================================================

  // أول مرة يكون Dark.
  // بعد ذلك نقرأ اختيار المستخدم من localStorage.
  const [themeMode, setThemeMode] = useState(() => {
    const savedTheme = localStorage.getItem(
      "menuPilot-theme"
    );

    return savedTheme || "dark";
  });

  // حفظ اختيار الـTheme كل مرة يتغير.
  useEffect(() => {
    localStorage.setItem(
      "menuPilot-theme",
      themeMode
    );
  }, [themeMode]);

  const isDarkMode = themeMode === "dark";

  // التبديل بين Dark و Light.
  const toggleTheme = () => {
    setThemeMode((currentTheme) =>
      currentTheme === "dark"
        ? "light"
        : "dark"
    );
  };

  // =========================================================
  // Theme Colors
  // =========================================================

  const theme = isDarkMode
    ? {
        page: "#1f2420",
        card: "#272d28",
        surface: "#222823",
        input: "#1f2420",

        text: "#ede6d6",
        secondaryText: "#b7bdb7",
        mutedText: "#929a93",

        border: "#424a43",
        inputBorder: "#4d5650",

        accent: "#e49b72",
        accentSurface: "#322a25",

        secondaryButton: "#1f2420",

        shadow:
          "0 18px 55px rgba(0, 0, 0, 0.3)",
      }
    : {
        page: "#f5f7f5",
        card: "#ffffff",
        surface: "#f8faf8",
        input: "#ffffff",

        text: "#1f2420",
        secondaryText: "#737c75",
        mutedText: "#8a918c",

        border: "#dde2de",
        inputBorder: "#d7ddd8",

        accent: "#e49b72",
        accentSurface: "#fff3ec",

        secondaryButton: "#ffffff",

        shadow:
          "0 18px 50px rgba(0, 0, 0, 0.08)",
      };

  // =========================================================
  // Steps
  // =========================================================

  // إذا المستخدم جاء من Pricing
  // نبدأ مباشرة من Restaurant Information.
  //
  // إذا دخل /register مباشرة
  // نبدأ من اختيار الخطة.
  const [step, setStep] = useState(
    planFromUrl ? 2 : 1
  );

  // =========================================================
  // Selected Plan
  // =========================================================

  const [selectedPlan, setSelectedPlan] =
    useState(planFromUrl || "basic");

  // =========================================================
  // Form Data
  // =========================================================

  const [formData, setFormData] = useState({
    restaurantName: "",
    restaurantType: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  // =========================================================
  // Errors
  // =========================================================

  const [errors, setErrors] = useState({});

  // =========================================================
  // Plans
  // الأسعار الحالية مؤقتة
  // =========================================================

  const plans = [
    {
      id: "basic",
      name: "Basic",
      price: "$19",
      description:
        "For small restaurants getting started.",
    },
    {
      id: "pro",
      name: "Pro",
      price: "$39",
      description:
        "For growing restaurants that need more control.",
    },
    {
      id: "premium",
      name: "Premium",
      price: "$69",
      description:
        "For restaurants that need the full experience.",
    },
  ];

  const currentPlan =
    plans.find(
      (plan) => plan.id === selectedPlan
    ) || plans[0];

  // =========================================================
  // Input Change
  // =========================================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));

    // إزالة الخطأ من الحقل عند بدء التعديل
    setErrors((previousErrors) => ({
      ...previousErrors,
      [name]: "",
    }));
  };

  // =========================================================
  // STEP 1
  // Choose Plan
  // =========================================================

  const goToRestaurantStep = () => {
    if (!selectedPlan) {
      return;
    }

    setStep(2);
  };

  // =========================================================
  // STEP 2
  // Restaurant Validation
  // =========================================================

  const validateRestaurantInfo = () => {
    const newErrors = {};

    if (!formData.restaurantName.trim()) {
      newErrors.restaurantName =
        "Restaurant name is required.";
    }

    if (!formData.restaurantType) {
      newErrors.restaurantType =
        "Please select restaurant type.";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const goToAccountStep = () => {
    if (!validateRestaurantInfo()) {
      return;
    }

    setStep(3);
  };

  // =========================================================
  // STEP 3
  // Account Validation
  // =========================================================

  const validateAccountInfo = () => {
    const newErrors = {};

    // Email
    if (!formData.email.trim()) {
      newErrors.email =
        "Email is required.";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        formData.email
      )
    ) {
      newErrors.email =
        "Enter a valid email address.";
    }

    // Password
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

    if (!formData.password) {
      newErrors.password =
        "Password is required.";
    } else if (
      !passwordRegex.test(formData.password)
    ) {
      newErrors.password =
        "Password must be at least 8 characters and include uppercase, lowercase, number, and special character.";
    }

    // Confirm Password
    if (!formData.confirmPassword) {
      newErrors.confirmPassword =
        "Please confirm your password.";
    } else if (
      formData.password !==
      formData.confirmPassword
    ) {
      newErrors.confirmPassword =
        "Passwords do not match.";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const goToReviewStep = () => {
    if (!validateAccountInfo()) {
      return;
    }

    setStep(4);
  };

  // =========================================================
  // Final Submit
  // =========================================================

  const handleSubmit = () => {
    console.log({
      ...formData,
      plan: selectedPlan,
    });

    /*
      لاحقًا:
      POST /api/auth/register
    */

    navigate(
      `/checkout?plan=${selectedPlan}`
    );
  };

  // =========================================================
  // Back من Restaurant Information
  // =========================================================

  const handleRestaurantBack = () => {
    // إذا جاء من Pricing
    // نرجعه إلى Pricing.
    if (planFromUrl) {
      navigate("/pricing");
      return;
    }

    // إذا دخل Register مباشرة
    // نرجعه لاختيار الخطة.
    setStep(1);
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <div
      style={{
        ...styles.page,
        background: theme.page,
        color: theme.text,
      }}
    >
      <div style={styles.wrapper}>
        {/* ===================================================
            Top Bar
        =================================================== */}

        <div style={styles.topBar}>
          {/* Logo */}
          <Link
            to="/"
            style={{
              ...styles.logo,
              color: theme.text,
            }}
          >
            menuPilot
          </Link>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            style={{
              ...styles.themeButton,
              background: theme.surface,
              color: theme.text,
              borderColor: theme.border,
            }}
          >
            {isDarkMode
              ? "☀ Light"
              : "🌙 Dark"}
          </button>
        </div>

        {/* ===================================================
            Main Card
        =================================================== */}

        <div
          style={{
            ...styles.card,
            background: theme.card,
            borderColor: theme.border,
            boxShadow: theme.shadow,
          }}
        >
          {/* =================================================
              Progress Indicator
          ================================================= */}

          <div style={styles.steps}>
            {[1, 2, 3, 4].map(
              (number, index) => (
                <div
                  key={number}
                  style={styles.stepItem}
                >
                  <div
                    style={{
                      ...styles.stepCircle,

                      background:
                        step >= number
                          ? theme.accent
                          : theme.input,

                      borderColor:
                        step >= number
                          ? theme.accent
                          : theme.border,

                      color:
                        step >= number
                          ? "#1f2420"
                          : theme.mutedText,
                    }}
                  >
                    {number}
                  </div>

                  {index < 3 && (
                    <div
                      style={{
                        ...styles.stepLine,

                        background:
                          step > number
                            ? theme.accent
                            : theme.border,
                      }}
                    />
                  )}
                </div>
              )
            )}
          </div>

          {/* =================================================
              STEP 1
              Choose Plan
          ================================================= */}

          {step === 1 && (
            <>
              <div style={styles.heading}>
                <span
                  style={{
                    ...styles.badge,
                    color: theme.accent,
                    borderColor: theme.accent,
                    background:
                      theme.accentSurface,
                  }}
                >
                  Subscription
                </span>

                <h1
                  style={{
                    ...styles.title,
                    color: theme.text,
                  }}
                >
                  Choose your plan
                </h1>

                <p
                  style={{
                    ...styles.subtitle,
                    color: theme.secondaryText,
                  }}
                >
                  Select the subscription that fits your
                  restaurant.
                </p>
              </div>

              <div style={styles.planGrid}>
                {plans.map((plan) => {
                  const isSelected =
                    selectedPlan === plan.id;

                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() =>
                        setSelectedPlan(plan.id)
                      }
                      style={{
                        ...styles.planCard,

                        color: theme.text,

                        background: isSelected
                          ? theme.accentSurface
                          : theme.surface,

                        borderColor: isSelected
                          ? theme.accent
                          : theme.border,

                        borderWidth: isSelected
                          ? "2px"
                          : "1px",
                      }}
                    >
                      <span style={styles.planName}>
                        {plan.name}
                      </span>

                      <strong style={styles.planPrice}>
                        {plan.price}

                        <small
                          style={{
                            ...styles.period,
                            color: theme.mutedText,
                          }}
                        >
                          /month
                        </small>
                      </strong>

                      <span
                        style={{
                          ...styles.planDescription,
                          color:
                            theme.secondaryText,
                        }}
                      >
                        {plan.description}
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={goToRestaurantStep}
                style={styles.primaryButton}
              >
                Next
              </button>
            </>
          )}

          {/* =================================================
              STEP 2
              Restaurant Information
          ================================================= */}

          {step === 2 && (
            <>
              <div style={styles.heading}>
                <span
                  style={{
                    ...styles.badge,
                    color: theme.accent,
                    borderColor: theme.accent,
                    background:
                      theme.accentSurface,
                  }}
                >
                  {currentPlan.name} Plan
                </span>

                <h1
                  style={{
                    ...styles.title,
                    color: theme.text,
                  }}
                >
                  Restaurant information
                </h1>

                <p
                  style={{
                    ...styles.subtitle,
                    color: theme.secondaryText,
                  }}
                >
                  Tell us a little about your restaurant.
                </p>
              </div>

              {/* Selected Plan */}
              <div
                style={{
                  ...styles.selectedPlanBox,

                  background:
                    theme.surface,

                  borderColor: theme.accent,
                }}
              >
                <div>
                  <span
                    style={{
                      ...styles.selectedLabel,
                      color: theme.mutedText,
                    }}
                  >
                    Selected plan
                  </span>

                  <strong
                    style={{
                      color: theme.text,
                    }}
                  >
                    {currentPlan.name} —{" "}
                    {currentPlan.price}/month
                  </strong>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    navigate("/pricing")
                  }
                  style={{
                    ...styles.changeButton,
                    color: theme.accent,
                  }}
                >
                  Change
                </button>
              </div>

              <div style={styles.form}>
                {/* Restaurant Name */}
                <div style={styles.field}>
                  <label
                    htmlFor="restaurantName"
                    style={{
                      ...styles.label,
                      color: theme.text,
                    }}
                  >
                    Restaurant Name
                  </label>

                  <input
                    id="restaurantName"
                    name="restaurantName"
                    type="text"
                    value={
                      formData.restaurantName
                    }
                    onChange={handleChange}
                    placeholder="Your restaurant name"
                    style={{
                      ...styles.input,

                      background:
                        theme.input,

                      color: theme.text,

                      borderColor:
                        theme.inputBorder,
                    }}
                  />

                  {errors.restaurantName && (
                    <span style={styles.error}>
                      {errors.restaurantName}
                    </span>
                  )}
                </div>

                {/* Restaurant Type */}
                <div style={styles.field}>
                  <label
                    htmlFor="restaurantType"
                    style={{
                      ...styles.label,
                      color: theme.text,
                    }}
                  >
                    Restaurant Type
                  </label>

                  <select
                    id="restaurantType"
                    name="restaurantType"
                    value={
                      formData.restaurantType
                    }
                    onChange={handleChange}
                    style={{
                      ...styles.input,

                      background:
                        theme.input,

                      color: theme.text,

                      borderColor:
                        theme.inputBorder,
                    }}
                  >
                    <option value="">
                      Select type
                    </option>

                    <option value="restaurant">
                      Restaurant
                    </option>

                    <option value="cafe">
                      Café
                    </option>

                    <option value="fast-food">
                      Fast Food
                    </option>

                    <option value="other">
                      Other
                    </option>
                  </select>

                  {errors.restaurantType && (
                    <span style={styles.error}>
                      {errors.restaurantType}
                    </span>
                  )}
                </div>

                <div style={styles.actions}>
                  <button
                    type="button"
                    onClick={
                      handleRestaurantBack
                    }
                    style={{
                      ...styles.secondaryButton,
                      background:
                        theme.secondaryButton,
                      color: theme.text,
                      borderColor: theme.border,
                    }}
                  >
                    Back
                  </button>

                  <button
                    type="button"
                    onClick={goToAccountStep}
                    style={
                      styles.primaryButton
                    }
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}

          {/* =================================================
              STEP 3
              Account Information
          ================================================= */}

          {step === 3 && (
            <>
              <div style={styles.heading}>
                <span
                  style={{
                    ...styles.badge,
                    color: theme.accent,
                    borderColor: theme.accent,
                    background:
                      theme.accentSurface,
                  }}
                >
                  {currentPlan.name} Plan
                </span>

                <h1
                  style={{
                    ...styles.title,
                    color: theme.text,
                  }}
                >
                  Account information
                </h1>

                <p
                  style={{
                    ...styles.subtitle,
                    color: theme.secondaryText,
                  }}
                >
                  Create the account you'll use to manage
                  menuPilot.
                </p>
              </div>

              <div style={styles.form}>
                {/* Email */}
                <div style={styles.field}>
                  <label
                    htmlFor="email"
                    style={{
                      ...styles.label,
                      color: theme.text,
                    }}
                  >
                    Email
                  </label>

                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    style={{
                      ...styles.input,
                      background:
                        theme.input,
                      color: theme.text,
                      borderColor:
                        theme.inputBorder,
                    }}
                  />

                  {errors.email && (
                    <span style={styles.error}>
                      {errors.email}
                    </span>
                  )}
                </div>

                {/* Password */}
                <div style={styles.field}>
                  <label
                    htmlFor="password"
                    style={{
                      ...styles.label,
                      color: theme.text,
                    }}
                  >
                    Password
                  </label>

                  <input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Create a strong password"
                    style={{
                      ...styles.input,
                      background:
                        theme.input,
                      color: theme.text,
                      borderColor:
                        theme.inputBorder,
                    }}
                  />

                  <span
                    style={{
                      ...styles.helpText,
                      color: theme.mutedText,
                    }}
                  >
                    At least 8 characters with uppercase,
                    lowercase, number and special character.
                  </span>

                  {errors.password && (
                    <span style={styles.error}>
                      {errors.password}
                    </span>
                  )}
                </div>

                {/* Confirm Password */}
                <div style={styles.field}>
                  <label
                    htmlFor="confirmPassword"
                    style={{
                      ...styles.label,
                      color: theme.text,
                    }}
                  >
                    Confirm Password
                  </label>

                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={
                      formData.confirmPassword
                    }
                    onChange={handleChange}
                    placeholder="Repeat your password"
                    style={{
                      ...styles.input,
                      background:
                        theme.input,
                      color: theme.text,
                      borderColor:
                        theme.inputBorder,
                    }}
                  />

                  {errors.confirmPassword && (
                    <span style={styles.error}>
                      {errors.confirmPassword}
                    </span>
                  )}
                </div>

                <div style={styles.actions}>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    style={{
                      ...styles.secondaryButton,
                      background:
                        theme.secondaryButton,
                      color: theme.text,
                      borderColor: theme.border,
                    }}
                  >
                    Back
                  </button>

                  <button
                    type="button"
                    onClick={goToReviewStep}
                    style={
                      styles.primaryButton
                    }
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}

          {/* =================================================
              STEP 4
              Review
          ================================================= */}

          {step === 4 && (
            <>
              <div style={styles.heading}>
                <span
                  style={{
                    ...styles.badge,
                    color: theme.accent,
                    borderColor: theme.accent,
                    background:
                      theme.accentSurface,
                  }}
                >
                  Final step
                </span>

                <h1
                  style={{
                    ...styles.title,
                    color: theme.text,
                  }}
                >
                  Review your details
                </h1>

                <p
                  style={{
                    ...styles.subtitle,
                    color: theme.secondaryText,
                  }}
                >
                  Make sure everything looks correct before
                  continuing.
                </p>
              </div>

              <div
                style={{
                  ...styles.reviewBox,
                  background:
                    theme.surface,
                  borderColor: theme.border,
                }}
              >
                <ReviewRow
                  label="Plan"
                  value={`${currentPlan.name} — ${currentPlan.price}/month`}
                  theme={theme}
                />

                <ReviewRow
                  label="Restaurant"
                  value={
                    formData.restaurantName
                  }
                  theme={theme}
                />

                <ReviewRow
                  label="Type"
                  value={
                    formData.restaurantType
                  }
                  theme={theme}
                />

                <ReviewRow
                  label="Email"
                  value={formData.email}
                  theme={theme}
                />
              </div>

              <div style={styles.actions}>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  style={{
                    ...styles.secondaryButton,
                    background:
                      theme.secondaryButton,
                    color: theme.text,
                    borderColor: theme.border,
                  }}
                >
                  Back
                </button>

                <button
                  type="button"
                  onClick={handleSubmit}
                  style={styles.primaryButton}
                >
                  Continue to payment
                </button>
              </div>
            </>
          )}

          {/* =================================================
              Login Link
          ================================================= */}

          <p
            style={{
              ...styles.bottomText,
              color: theme.secondaryText,
            }}
          >
            Already have an account?{" "}

            <Link
              to="/login"
              style={{
                ...styles.link,
                color: theme.accent,
              }}
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// =========================================================
// Review Row
// =========================================================

function ReviewRow({
  label,
  value,
  theme,
}) {
  return (
    <div
      style={{
        ...styles.reviewRow,
        borderColor: theme.border,
      }}
    >
      <span
        style={{
          ...styles.reviewLabel,
          color: theme.mutedText,
        }}
      >
        {label}
      </span>

      <strong
        style={{
          ...styles.reviewValue,
          color: theme.text,
        }}
      >
        {value}
      </strong>
    </div>
  );
}

// =========================================================
// Styles
// =========================================================

const styles = {
  page: {
    minHeight: "100vh",

    display: "flex",

    alignItems: "flex-start",

    justifyContent: "center",

    padding: "24px 12px",

    transition:
      "background 0.3s ease, color 0.3s ease",
  },

  wrapper: {
    width: "100%",
    maxWidth: "650px",
  },

  // =========================================================
  // Top Bar
  // =========================================================

  topBar: {
    display: "flex",

    alignItems: "center",

    justifyContent: "space-between",

    gap: "16px",

    marginBottom: "18px",
  },

  logo: {
    color: "inherit",

    textDecoration: "none",

    fontSize: "28px",

    fontWeight: "800",
  },

  themeButton: {
    border: "1px solid",

    borderRadius: "999px",

    padding: "8px 14px",

    fontSize: "13px",

    fontWeight: "700",

    cursor: "pointer",

    transition:
      "background 0.25s ease, color 0.25s ease, border-color 0.25s ease, transform 0.2s ease",
  },

  // =========================================================
  // Card
  // =========================================================

  card: {
    width: "100%",

    boxSizing: "border-box",

    border: "1px solid",

    borderRadius: "24px",

    padding:
      "clamp(20px, 5vw, 36px)",

    transition:
      "background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease",
  },

  // =========================================================
  // Progress
  // =========================================================

  steps: {
    display: "flex",

    justifyContent: "center",

    alignItems: "center",

    width: "100%",

    marginBottom: "28px",

    overflow: "hidden",
  },

  stepItem: {
    display: "flex",
    alignItems: "center",
  },

  stepCircle: {
    width: "30px",

    height: "30px",

    flexShrink: 0,

    borderRadius: "50%",

    border: "2px solid",

    display: "flex",

    justifyContent: "center",

    alignItems: "center",

    fontWeight: "700",

    fontSize: "12px",

    transition:
      "background 0.3s ease, border-color 0.3s ease, color 0.3s ease",
  },

  stepLine: {
    width:
      "clamp(24px, 7vw, 45px)",

    height: "2px",

    transition:
      "background 0.3s ease",
  },

  // =========================================================
  // Heading
  // =========================================================

  heading: {
    textAlign: "center",

    marginBottom: "24px",
  },

  badge: {
    display: "inline-block",

    border: "1px solid",

    borderRadius: "999px",

    padding: "7px 12px",

    marginBottom: "14px",

    fontSize: "13px",

    fontWeight: "700",
  },

  title: {
    margin: "0 0 10px",

    fontSize:
      "clamp(25px, 7vw, 30px)",

    lineHeight: "1.15",
  },

  subtitle: {
    margin: 0,

    lineHeight: "1.6",

    fontSize:
      "clamp(14px, 4vw, 16px)",
  },

  // =========================================================
  // Plans
  // =========================================================

  planGrid: {
    display: "grid",

    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",

    gap: "14px",

    marginBottom: "24px",
  },

  planCard: {
    width: "100%",

    border: "1px solid",

    borderRadius: "18px",

    padding: "20px 16px",

    textAlign: "left",

    cursor: "pointer",

    display: "grid",

    gap: "10px",

    transition:
      "background 0.25s ease, border-color 0.25s ease, transform 0.25s ease",
  },

  planName: {
    fontSize: "18px",

    fontWeight: "700",
  },

  planPrice: {
    fontSize: "24px",
  },

  period: {
    fontSize: "11px",

    marginLeft: "3px",
  },

  planDescription: {
    fontSize: "13px",

    lineHeight: "1.5",
  },

  // =========================================================
  // Selected Plan Box
  // =========================================================

  selectedPlanBox: {
    display: "flex",

    alignItems: "center",

    justifyContent: "space-between",

    gap: "14px",

    border: "1px solid",

    borderRadius: "16px",

    padding: "14px 16px",

    marginBottom: "24px",
  },

  selectedLabel: {
    display: "block",

    fontSize: "12px",

    marginBottom: "4px",
  },

  changeButton: {
    border: "none",

    background: "transparent",

    fontWeight: "700",

    cursor: "pointer",
  },

  // =========================================================
  // Form
  // =========================================================

  form: {
    display: "grid",
    gap: "18px",
  },

  field: {
    display: "grid",
    gap: "7px",
  },

  label: {
    fontSize: "14px",
    fontWeight: "600",
  },

  input: {
    width: "100%",

    minWidth: 0,

    boxSizing: "border-box",

    border: "1px solid",

    borderRadius: "12px",

    padding: "13px 14px",

    fontSize: "16px",

    outline: "none",

    transition:
      "background 0.3s ease, color 0.3s ease, border-color 0.3s ease",
  },

  error: {
    fontSize: "12px",

    color: "#ff7f73",

    lineHeight: "1.4",
  },

  helpText: {
    fontSize: "12px",
    lineHeight: "1.5",
  },

  // =========================================================
  // Buttons
  // =========================================================

  actions: {
    display: "grid",

    gridTemplateColumns:
      "minmax(90px, 1fr) minmax(150px, 2fr)",

    gap: "12px",

    marginTop: "22px",
  },

  primaryButton: {
    width: "100%",

    minWidth: 0,

    border: "none",

    borderRadius: "999px",

    padding: "14px",

    background: "#e49b72",

    color: "#1f2420",

    fontSize: "15px",

    fontWeight: "700",

    cursor: "pointer",
  },

  secondaryButton: {
    width: "100%",

    minWidth: 0,

    border: "1px solid",

    borderRadius: "999px",

    padding: "14px",

    fontSize: "15px",

    fontWeight: "700",

    cursor: "pointer",
  },

  // =========================================================
  // Review
  // =========================================================

  reviewBox: {
    border: "1px solid",

    borderRadius: "18px",

    overflow: "hidden",
  },

  reviewRow: {
    display: "grid",

    gridTemplateColumns:
      "minmax(90px, 0.8fr) minmax(0, 1.5fr)",

    gap: "14px",

    padding: "16px",

    borderBottom: "1px solid",

    alignItems: "start",
  },

  reviewLabel: {},

  reviewValue: {
    textAlign: "right",

    overflowWrap: "anywhere",
  },

  // =========================================================
  // Bottom
  // =========================================================

  bottomText: {
    textAlign: "center",

    margin: "24px 0 0",

    fontSize: "14px",

    lineHeight: "1.5",
  },

  link: {
    textDecoration: "none",

    fontWeight: "700",
  },
};