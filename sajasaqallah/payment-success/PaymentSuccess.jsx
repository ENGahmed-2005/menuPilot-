import { Link, useSearchParams } from "react-router-dom";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();

  const selectedPlan = searchParams.get("plan") || "basic";

  const planNames = {
    basic: "Basic",
    pro: "Pro",
    premium: "Premium",
  };

  const planName =
    planNames[selectedPlan] || planNames.basic;

  return (
    <div style={styles.page}>
      <div style={styles.card}>

        <div style={styles.icon}>
          ✓
        </div>

        <h1 style={styles.title}>
          Payment successful
        </h1>

        <p style={styles.text}>
          Your {planName} subscription has been activated successfully.
        </p>

        <div style={styles.planBox}>
          <span style={styles.planLabel}>
            Current plan
          </span>

          <strong style={styles.planName}>
            {planName}
          </strong>
        </div>

        <Link to="/" style={styles.button}>
          Continue to menuPilot
        </Link>

      </div>
    </div>
  );
}

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
    maxWidth: "500px",
    textAlign: "center",
    background: "#272d28",
    border: "1px solid #424a43",
    borderRadius: "28px",
    padding: "40px 34px",
  },

  icon: {
    width: "70px",
    height: "70px",
    borderRadius: "50%",
    background: "#e49b72",
    color: "#1f2420",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    margin: "0 auto 24px",
    fontSize: "34px",
    fontWeight: "700",
  },

  title: {
    margin: "0 0 14px",
    fontSize: "34px",
  },

  text: {
    color: "#b7bdb7",
    lineHeight: "1.6",
    marginBottom: "28px",
  },

  planBox: {
    border: "1px solid #e49b72",
    borderRadius: "16px",
    padding: "16px",
    marginBottom: "26px",
  },

  planLabel: {
    display: "block",
    color: "#aeb5af",
    fontSize: "12px",
    marginBottom: "5px",
  },

  planName: {
    fontSize: "20px",
  },

  button: {
    display: "block",
    background: "#e49b72",
    color: "#1f2420",
    textDecoration: "none",
    borderRadius: "999px",
    padding: "14px 18px",
    fontWeight: "700",
  },
};