import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
} from "react-router-dom";

export default function Login() {
  // =========================================================
  // React Router
  // =========================================================

  const navigate = useNavigate();

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

  // حفظ اختيار المستخدم
  useEffect(() => {
    localStorage.setItem(
      "menuPilot-theme",
      themeMode
    );
  }, [themeMode]);

  const isDarkMode = themeMode === "dark";

  // التبديل بين Light و Dark
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
  // State
  // =========================================================

  // 1 = اختيار نوع المستخدم
  // 2 = إظهار الفورم
  const [step, setStep] = useState(1);

  // customer أو restaurant
  const [userType, setUserType] = useState("");

  // لتطبيق Hover animation
  const [hoveredType, setHoveredType] =
    useState("");

  // بيانات الزبون
  const [customerData, setCustomerData] =
    useState({
      fullName: "",
      phone: "",
    });

  // بيانات المطعم
  const [
    restaurantData,
    setRestaurantData,
  ] = useState({
    email: "",
    password: "",
  });

  // رسائل الأخطاء
  const [errors, setErrors] = useState({});

  // =========================================================
  // اختيار نوع المستخدم
  // =========================================================

  const handleUserTypeSelect = (type) => {
    setUserType(type);
    setErrors({});
  };

  // =========================================================
  // الانتقال للخطوة الثانية
  // =========================================================

  const handleNext = () => {
    if (!userType) {
      return;
    }

    setStep(2);
  };

  // =========================================================
  // تحديث بيانات Customer
  // =========================================================

  const handleCustomerChange = (event) => {
    const { name, value } = event.target;

    setCustomerData((previousData) => ({
      ...previousData,
      [name]: value,
    }));

    setErrors((previousErrors) => ({
      ...previousErrors,
      [name]: "",
    }));
  };

  // =========================================================
  // تحديث بيانات Restaurant
  // =========================================================

  const handleRestaurantChange = (event) => {
    const { name, value } = event.target;

    setRestaurantData((previousData) => ({
      ...previousData,
      [name]: value,
    }));

    setErrors((previousErrors) => ({
      ...previousErrors,
      [name]: "",
    }));
  };

  // =========================================================
  // Customer Validation
  // =========================================================

  const validateCustomer = () => {
    const newErrors = {};

    if (!customerData.fullName.trim()) {
      newErrors.fullName =
        "Full name is required.";
    }

    if (!customerData.phone.trim()) {
      newErrors.phone =
        "Phone number is required.";
    } else if (
      !/^[0-9+\s-]{7,15}$/.test(
        customerData.phone
      )
    ) {
      newErrors.phone =
        "Enter a valid phone number.";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  // =========================================================
  // Restaurant Validation
  // =========================================================

  const validateRestaurant = () => {
    const newErrors = {};

    if (!restaurantData.email.trim()) {
      newErrors.email =
        "Email is required.";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        restaurantData.email
      )
    ) {
      newErrors.email =
        "Enter a valid email address.";
    }

    if (!restaurantData.password) {
      newErrors.password =
        "Password is required.";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  // =========================================================
  // Customer Submit
  // =========================================================

  const handleCustomerSubmit = (event) => {
    event.preventDefault();

    if (!validateCustomer()) {
      return;
    }

    console.log(
      "Customer data:",
      customerData
    );

    /*
      لاحقًا:
      POST /api/sessions/open
    */

    // مؤقتًا
    navigate("/customer");
  };

  // =========================================================
  // Restaurant Submit
  // =========================================================

  const handleRestaurantSubmit = (event) => {
    event.preventDefault();

    if (!validateRestaurant()) {
      return;
    }

    console.log(
      "Restaurant login:",
      restaurantData
    );

    /*
      لاحقًا:
      POST /api/auth/login
    */

    // مؤقتًا
    navigate("/");
  };

  // =========================================================
  // Back
  // =========================================================

  const handleBack = () => {
    setStep(1);
    setErrors({});
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
              STEP 1
              اختيار Customer أو Restaurant
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
                  Welcome
                </span>

                <h1
                  style={{
                    ...styles.title,
                    color: theme.text,
                  }}
                >
                  How would you like to continue?
                </h1>

                <p
                  style={{
                    ...styles.subtitle,
                    color: theme.secondaryText,
                  }}
                >
                  Choose the option that best describes you.
                </p>
              </div>

              {/* =================================================
                  Customer + Restaurant Cards
              ================================================= */}

              <div style={styles.options}>
                {/* Customer Card */}
                <button
                  type="button"
                  onClick={() =>
                    handleUserTypeSelect(
                      "customer"
                    )
                  }
                  onMouseEnter={() =>
                    setHoveredType(
                      "customer"
                    )
                  }
                  onMouseLeave={() =>
                    setHoveredType("")
                  }
                  style={{
                    ...styles.optionCard,

                    background:
                      userType === "customer"
                        ? theme.accentSurface
                        : theme.surface,

                    color: theme.text,

                    borderColor:
                      userType === "customer" ||
                      hoveredType === "customer"
                        ? theme.accent
                        : theme.border,

                    borderWidth:
                      userType === "customer"
                        ? "2px"
                        : "1px",

                    transform:
                      hoveredType === "customer"
                        ? "translateY(-8px) scale(1.025)"
                        : "translateY(0) scale(1)",

                    boxShadow:
                      hoveredType === "customer"
                        ? "0 18px 38px rgba(0,0,0,0.18)"
                        : "0 8px 24px rgba(0,0,0,0.06)",
                  }}
                >
                  <div
                    style={{
                      ...styles.icon,

                      background:
                        theme.input,

                      transform:
                        hoveredType ===
                        "customer"
                          ? "scale(1.15) rotate(-3deg)"
                          : "scale(1)",
                    }}
                  >
                    👤
                  </div>

                  <h2
                    style={{
                      ...styles.optionTitle,
                      color: theme.text,
                    }}
                  >
                    Customer
                  </h2>

                  <p
                    style={{
                      ...styles.optionText,
                      color:
                        theme.secondaryText,
                    }}
                  >
                    Browse the menu and order from your
                    table.
                  </p>
                </button>

                {/* Restaurant Card */}
                <button
                  type="button"
                  onClick={() =>
                    handleUserTypeSelect(
                      "restaurant"
                    )
                  }
                  onMouseEnter={() =>
                    setHoveredType(
                      "restaurant"
                    )
                  }
                  onMouseLeave={() =>
                    setHoveredType("")
                  }
                  style={{
                    ...styles.optionCard,

                    background:
                      userType ===
                      "restaurant"
                        ? theme.accentSurface
                        : theme.surface,

                    color: theme.text,

                    borderColor:
                      userType ===
                        "restaurant" ||
                      hoveredType ===
                        "restaurant"
                        ? theme.accent
                        : theme.border,

                    borderWidth:
                      userType ===
                      "restaurant"
                        ? "2px"
                        : "1px",

                    transform:
                      hoveredType ===
                      "restaurant"
                        ? "translateY(-8px) scale(1.025)"
                        : "translateY(0) scale(1)",

                    boxShadow:
                      hoveredType ===
                      "restaurant"
                        ? "0 18px 38px rgba(0,0,0,0.18)"
                        : "0 8px 24px rgba(0,0,0,0.06)",
                  }}
                >
                  <div
                    style={{
                      ...styles.icon,

                      background:
                        theme.input,

                      transform:
                        hoveredType ===
                        "restaurant"
                          ? "scale(1.15) rotate(3deg)"
                          : "scale(1)",
                    }}
                  >
                    🏪
                  </div>

                  <h2
                    style={{
                      ...styles.optionTitle,
                      color: theme.text,
                    }}
                  >
                    Restaurant
                  </h2>

                  <p
                    style={{
                      ...styles.optionText,
                      color:
                        theme.secondaryText,
                    }}
                  >
                    Log in and manage your restaurant.
                  </p>
                </button>
              </div>

              {/* Next */}
              <button
                type="button"
                onClick={handleNext}
                disabled={!userType}
                style={{
                  ...styles.primaryButton,

                  opacity: userType
                    ? 1
                    : 0.45,

                  cursor: userType
                    ? "pointer"
                    : "not-allowed",
                }}
              >
                Next
              </button>
            </>
          )}

          {/* =================================================
              STEP 2
              Customer
          ================================================= */}

          {step === 2 &&
            userType === "customer" && (
              <>
                <div style={styles.heading}>
                  <span
                    style={{
                      ...styles.badge,
                      color: theme.accent,
                      borderColor:
                        theme.accent,
                      background:
                        theme.accentSurface,
                    }}
                  >
                    Customer
                  </span>

                  <h1
                    style={{
                      ...styles.title,
                      color: theme.text,
                    }}
                  >
                    Enter your details
                  </h1>

                  <p
                    style={{
                      ...styles.subtitle,
                      color:
                        theme.secondaryText,
                    }}
                  >
                    Enter your full name and phone number
                    to continue.
                  </p>
                </div>

                <form
                  onSubmit={
                    handleCustomerSubmit
                  }
                  style={styles.form}
                  noValidate
                >
                  {/* Full Name */}
                  <div style={styles.field}>
                    <label
                      htmlFor="fullName"
                      style={{
                        ...styles.label,
                        color: theme.text,
                      }}
                    >
                      Full Name
                    </label>

                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      value={
                        customerData.fullName
                      }
                      onChange={
                        handleCustomerChange
                      }
                      placeholder="Enter your full name"
                      style={{
                        ...styles.input,

                        background:
                          theme.input,

                        color: theme.text,

                        borderColor:
                          theme.inputBorder,
                      }}
                    />

                    {errors.fullName && (
                      <span
                        style={
                          styles.error
                        }
                      >
                        {errors.fullName}
                      </span>
                    )}
                  </div>

                  {/* Phone */}
                  <div style={styles.field}>
                    <label
                      htmlFor="phone"
                      style={{
                        ...styles.label,
                        color: theme.text,
                      }}
                    >
                      Phone Number
                    </label>

                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      inputMode="tel"
                      value={
                        customerData.phone
                      }
                      onChange={
                        handleCustomerChange
                      }
                      placeholder="+970 59 000 0000"
                      style={{
                        ...styles.input,

                        background:
                          theme.input,

                        color: theme.text,

                        borderColor:
                          theme.inputBorder,
                      }}
                    />

                    {errors.phone && (
                      <span
                        style={
                          styles.error
                        }
                      >
                        {errors.phone}
                      </span>
                    )}
                  </div>

                  {/* Buttons */}
                  <div
                    style={styles.actions}
                  >
                    <button
                      type="button"
                      onClick={handleBack}
                      style={{
                        ...styles.secondaryButton,

                        background:
                          theme.secondaryButton,

                        color: theme.text,

                        borderColor:
                          theme.border,
                      }}
                    >
                      Back
                    </button>

                    <button
                      type="submit"
                      style={
                        styles.primaryButton
                      }
                    >
                      Continue
                    </button>
                  </div>
                </form>
              </>
            )}

          {/* =================================================
              STEP 2
              Restaurant
          ================================================= */}

          {step === 2 &&
            userType === "restaurant" && (
              <>
                <div style={styles.heading}>
                  <span
                    style={{
                      ...styles.badge,
                      color: theme.accent,
                      borderColor:
                        theme.accent,
                      background:
                        theme.accentSurface,
                    }}
                  >
                    Restaurant
                  </span>

                  <h1
                    style={{
                      ...styles.title,
                      color: theme.text,
                    }}
                  >
                    Welcome back
                  </h1>

                  <p
                    style={{
                      ...styles.subtitle,
                      color:
                        theme.secondaryText,
                    }}
                  >
                    Log in to manage your restaurant.
                  </p>
                </div>

                <form
                  onSubmit={
                    handleRestaurantSubmit
                  }
                  style={styles.form}
                  noValidate
                >
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
                      value={
                        restaurantData.email
                      }
                      onChange={
                        handleRestaurantChange
                      }
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
                      <span
                        style={
                          styles.error
                        }
                      >
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
                      value={
                        restaurantData.password
                      }
                      onChange={
                        handleRestaurantChange
                      }
                      placeholder="Enter your password"
                      style={{
                        ...styles.input,

                        background:
                          theme.input,

                        color: theme.text,

                        borderColor:
                          theme.inputBorder,
                      }}
                    />

                    {errors.password && (
                      <span
                        style={
                          styles.error
                        }
                      >
                        {errors.password}
                      </span>
                    )}
                  </div>

                  {/* Buttons */}
                  <div
                    style={styles.actions}
                  >
                    <button
                      type="button"
                      onClick={handleBack}
                      style={{
                        ...styles.secondaryButton,

                        background:
                          theme.secondaryButton,

                        color: theme.text,

                        borderColor:
                          theme.border,
                      }}
                    >
                      Back
                    </button>

                    <button
                      type="submit"
                      style={
                        styles.primaryButton
                      }
                    >
                      Log in
                    </button>
                  </div>
                </form>

                {/* Restaurant جديد */}
                <p
                  style={{
                    ...styles.bottomText,
                    color:
                      theme.secondaryText,
                  }}
                >
                  New to menuPilot?{" "}

                  <Link
                    to="/pricing"
                    style={{
                      ...styles.link,
                      color: theme.accent,
                    }}
                  >
                    Get Started
                  </Link>
                </p>
              </>
            )}
        </div>
      </div>
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

    alignItems: "center",

    justifyContent: "center",

    padding: "24px 14px",

    transition:
      "background 0.3s ease, color 0.3s ease",
  },

  wrapper: {
    width: "100%",

    maxWidth: "700px",
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
    textDecoration: "none",

    fontSize: "30px",

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
      "background 0.25s ease, color 0.25s ease, border-color 0.25s ease",
  },

  // =========================================================
  // Main Card
  // =========================================================

  card: {
    width: "100%",

    boxSizing: "border-box",

    border: "1px solid",

    borderRadius: "28px",

    padding:
      "clamp(24px, 5vw, 40px)",

    transition:
      "background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease",
  },

  // =========================================================
  // Heading
  // =========================================================

  heading: {
    textAlign: "center",

    marginBottom: "30px",
  },

  badge: {
    display: "inline-block",

    border: "1px solid",

    borderRadius: "999px",

    padding: "7px 13px",

    marginBottom: "14px",

    fontSize: "13px",

    fontWeight: "700",
  },

  title: {
    margin: "0 0 10px",

    fontSize:
      "clamp(27px, 5vw, 36px)",

    lineHeight: "1.15",
  },

  subtitle: {
    margin: 0,

    lineHeight: "1.6",

    fontSize: "15px",
  },

  // =========================================================
  // Customer + Restaurant
  // =========================================================

  options: {
    display: "grid",

    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",

    gap: "18px",

    marginBottom: "28px",
  },

  optionCard: {
    width: "100%",

    minHeight: "220px",

    boxSizing: "border-box",

    display: "flex",

    flexDirection: "column",

    alignItems: "center",

    justifyContent: "center",

    gap: "14px",

    textAlign: "center",

    padding: "24px 18px",

    border: "1px solid",

    borderRadius: "22px",

    cursor: "pointer",

    transition:
      "transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease, background 0.25s ease",
  },

  icon: {
    width: "64px",

    height: "64px",

    borderRadius: "18px",

    display: "flex",

    alignItems: "center",

    justifyContent: "center",

    fontSize: "30px",

    transition:
      "transform 0.25s ease, background 0.25s ease",
  },

  optionTitle: {
    margin: 0,

    fontSize: "21px",

    fontWeight: "700",
  },

  optionText: {
    margin: 0,

    lineHeight: "1.5",

    fontSize: "14px",

    maxWidth: "200px",
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

    gap: "8px",
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

    padding: "14px",

    fontSize: "16px",

    outline: "none",

    transition:
      "background 0.3s ease, color 0.3s ease, border-color 0.3s ease",
  },

  error: {
    color: "#ff7f73",

    fontSize: "12px",
  },

  // =========================================================
  // Buttons
  // =========================================================

  actions: {
    display: "grid",

    gridTemplateColumns:
      "minmax(90px, 1fr) minmax(150px, 2fr)",

    gap: "12px",

    marginTop: "4px",
  },

  primaryButton: {
    width: "100%",

    border: "none",

    borderRadius: "999px",

    padding: "14px",

    background: "#e49b72",

    color: "#1f2420",

    fontSize: "16px",

    fontWeight: "700",

    cursor: "pointer",
  },

  secondaryButton: {
    width: "100%",

    border: "1px solid",

    borderRadius: "999px",

    padding: "14px",

    fontSize: "16px",

    fontWeight: "700",

    cursor: "pointer",
  },

  // =========================================================
  // Bottom
  // =========================================================

  bottomText: {
    textAlign: "center",

    margin: "24px 0 0",
  },

  link: {
    textDecoration: "none",

    fontWeight: "700",
  },
};