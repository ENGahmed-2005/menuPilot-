import { Link } from "react-router-dom";

export default function Pricing() {
  const plans = [
    {
      name: "Basic",
      price: "$19",
      description: "For small restaurants getting started.",
      features: [
        "1 restaurant account",
        "Digital QR menu",
        "Basic order management",
        "Table management",
      ],
    },
    {
      name: "Pro",
      price: "$39",
      description: "For growing restaurants that need more control.",
      features: [
        "Everything in Basic",
        "Kitchen dashboard",
        "Order tracking",
        "Advanced table management",
      ],
    },
    {
      name: "Premium",
      price: "$69",
      description: "For restaurants that need the full experience.",
      features: [
        "Everything in Pro",
        "Sales reports",
        "Priority support",
        "Advanced management tools",
      ],
    },
  ];

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* Header */}
        <div style={styles.header}>
          <Link to="/" style={styles.logo}>
            menuPilot
          </Link>

          <Link to="/login" style={styles.loginLink}>
            Log in
          </Link>
        </div>

        {/* Page heading */}
        <div style={styles.hero}>
          <span style={styles.badge}>
            Simple pricing
          </span>

          <h1 style={styles.title}>
            Choose the plan that fits your restaurant
          </h1>

          <p style={styles.subtitle}>
            Start with the plan that works for your restaurant today.
            You can upgrade later as your business grows.
          </p>
        </div>

        {/* Pricing cards */}
        <div style={styles.grid}>
          {plans.map((plan) => (
            <div
              key={plan.name}
              style={styles.card}
            >
              <h2 style={styles.planName}>
                {plan.name}
              </h2>

              <p style={styles.description}>
                {plan.description}
              </p>

              <div style={styles.priceRow}>
                <span style={styles.price}>
                  {plan.price}
                </span>

                <span style={styles.period}>
                  / month
                </span>
              </div>

              <ul style={styles.features}>
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    style={styles.feature}
                  >
                    <span style={styles.check}>
                      ✓
                    </span>

                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                to={`/register?plan=${plan.name.toLowerCase()}`}
                style={styles.button}
              >
                Get Started
              </Link>
            </div>
          ))}
        </div>

        <p style={styles.note}>
          Choose a plan to create your restaurant account.
        </p>

      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#1f2420",
    color: "#ede6d6",
    padding: "24px",
  },

  container: {
    width: "100%",
    maxWidth: "1180px",
    margin: "0 auto",
  },

  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "70px",
  },

  logo: {
    color: "#ede6d6",
    textDecoration: "none",
    fontSize: "24px",
    fontWeight: "700",
  },

  loginLink: {
    color: "#ede6d6",
    textDecoration: "none",
    fontWeight: "600",
    fontSize: "16px",
  },

  hero: {
    textAlign: "center",
    maxWidth: "760px",
    margin: "0 auto 55px",
  },

  badge: {
    display: "inline-block",
    border: "1px solid #8d998e",
    borderRadius: "999px",
    padding: "8px 14px",
    marginBottom: "20px",
    fontSize: "14px",
  },

  title: {
    fontSize: "clamp(36px, 6vw, 64px)",
    lineHeight: "1.05",
    margin: "0 0 20px",
  },

  subtitle: {
    fontSize: "18px",
    lineHeight: "1.7",
    color: "#b7bdb7",
    margin: 0,
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "24px",
    alignItems: "stretch",
  },

  card: {
    border: "1px solid #424a43",
    borderRadius: "24px",
    padding: "30px",
    background: "#272d28",
    display: "flex",
    flexDirection: "column",
  },

  planName: {
    fontSize: "28px",
    margin: "0 0 12px",
  },

  description: {
    color: "#b7bdb7",
    lineHeight: "1.6",
    minHeight: "52px",
    margin: 0,
  },

  priceRow: {
    margin: "26px 0",
    display: "flex",
    alignItems: "baseline",
    gap: "8px",
  },

  price: {
    fontSize: "48px",
    fontWeight: "700",
  },

  period: {
    color: "#b7bdb7",
  },

  features: {
    listStyle: "none",
    padding: 0,
    margin: "0 0 30px",
    display: "grid",
    gap: "14px",
    flex: 1,
  },

  feature: {
    color: "#d7dbd7",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },

  check: {
    color: "#e49b72",
    fontWeight: "700",
  },

  button: {
    display: "block",
    textAlign: "center",
    textDecoration: "none",
    padding: "14px 18px",
    borderRadius: "999px",
    fontWeight: "700",
    background: "#e49b72",
    color: "#1f2420",
  },

  note: {
    textAlign: "center",
    color: "#929a93",
    marginTop: "32px",
    fontSize: "14px",
  },
};