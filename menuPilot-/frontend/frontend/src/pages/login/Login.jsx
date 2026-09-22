import { Link } from "react-router-dom";

export default function Login() {
  const handleSubmit = (e) => {
    e.preventDefault();

    // لاحقًا:
    // POST /api/auth/login
  };

  return (
    <div className="login-page">

      <div className="login-card">

        <h1>Welcome back</h1>

        <p>
          Log in to manage your restaurant.
        </p>

        <form onSubmit={handleSubmit}>

          <div>
            <label>Email</label>

            <input
              type="email"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label>Password</label>

            <input
              type="password"
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit">
            Log in
          </button>

        </form>

        <p>
          Don't have an account?{" "}
          <Link to="/register">
            Create account
          </Link>
        </p>

      </div>

    </div>
  );
}