import { Link } from "react-router-dom";

export default function Register() {
  const handleSubmit = (e) => {
    e.preventDefault();

    // لاحقًا:
    // POST /api/auth/register
  };

  return (
    <div className="register-page">

      <div className="register-card">

        <h1>Create your account</h1>

        <form onSubmit={handleSubmit}>

          <div>
            <label>Restaurant Name</label>

            <input
              type="text"
              required
            />
          </div>

          <div>
            <label>Email</label>

            <input
              type="email"
              required
            />
          </div>

          <div>
            <label>Password</label>

            <input
              type="password"
              required
            />
          </div>

          <div>
            <label>Confirm Password</label>

            <input
              type="password"
              required
            />
          </div>

          <button type="submit">
            Create account
          </button>

        </form>

        <p>
          Already have an account?{" "}
          <Link to="/login">
            Log in
          </Link>
        </p>

      </div>

    </div>
  );
}