import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./auth.css";
import { API_URL } from "../lib/api";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));

    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (loading) return;

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed.");
      }

      if (!data.accessToken || !data.user) {
        throw new Error("Invalid response received from the server.");
      }

      sessionStorage.setItem("accessToken", data.accessToken);
      sessionStorage.setItem("user", JSON.stringify(data.user));

      window.dispatchEvent(new Event("shopora-auth-changed"));

      const destinations = {
        admin: "/admin",
        seller: "/seller",
        customer: "/account",
      };

      const requestedDestination = location.state?.from;

      const destination =
        requestedDestination || destinations[data.user.role] || "/account";

      navigate(destination, { replace: true });
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Unable to connect to the server. Please try again."
          : err.message || "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  };

  return (

    <main className="auth-page login-page">
       <button
          type="button"
          className="auth-back-button"
          onClick={() => navigate("/")}
          aria-label="Back to home"
        >
          <span aria-hidden="true">←</span>
          <span>Back to website</span>
        </button>




      <section className="auth-card login-card">
        <a href="/" className="auth-brand">
          Shopora
        </a>
       
        <h1 className="auth-title">login</h1>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email address</label>

            <input
              id="email"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              placeholder="Enter your email address"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">password</label>

            <input
              id="password"
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
              placeholder="Enter your password"
              required
            />
          </div>

          {error && (
            <div className="auth-message error" role="alert">
              {error}
            </div>
          )}

          <button
            className="submit-button"
            type="submit"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Login to account"}
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account?{" "}
          <Link to="/register">Create account</Link>
        </p>
      </section>
    </main>
  );
}