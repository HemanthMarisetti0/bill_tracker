import { useState } from "react";
import { loginWithGoogle } from "../services/authService";

import ThemeToggle from "../components/ThemeToggle";
import Credits from "../components/Credits";

import "./Login.css";

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError("");

      await loginWithGoogle();
    } catch (error) {
      console.error("Login failed:", error);
      setError("Unable to sign in with Google. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-background-shape login-shape-one" />
      <div className="login-background-shape login-shape-two" />

      <ThemeToggle className="login-theme-toggle" />

      <main className="login-container">
        <div className="login-card">
          <div className="login-logo">
            <span>₹</span>
          </div>

          <div className="login-heading">
            <span className="login-eyebrow">
              PERSONAL FINANCE
            </span>

            <h1>
              Bill Tracker
            </h1>

            <p>
              Keep all your bills organized,
              track payments, and stay on top
              of your monthly expenses.
            </p>
          </div>

          <div className="login-features">
            <div className="login-feature">
              <span className="feature-icon">✓</span>
              <span>Track all your bills</span>
            </div>

            <div className="login-feature">
              <span className="feature-icon">✓</span>
              <span>Monitor paid & unpaid bills</span>
            </div>

            <div className="login-feature">
              <span className="feature-icon">✓</span>
              <span>Secure Google sign-in</span>
            </div>
          </div>

          <button
            type="button"
            className="google-login-button"
            onClick={() => {
              void handleLogin();
            }}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="login-spinner" />
                Signing in...
              </>
            ) : (
              <>
                <span className="google-icon">
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      fill="#4285F4"
                      d="M21.35 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.23a4.47 4.47 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.92-4.18 2.92-7.22Z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 21.73c2.63 0 4.84-.87 6.45-2.36l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.3v2.53A9.74 9.74 0 0 0 12 21.73Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M6.54 13.81A5.86 5.86 0 0 1 6.23 12c0-.63.11-1.24.31-1.81V7.66H3.3A9.73 9.73 0 0 0 2.27 12c0 1.57.38 3.06 1.03 4.34l3.24-2.53Z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 6.16c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.84 3.23 14.63 2.27 12 2.27a9.74 9.74 0 0 0-8.7 5.39l3.24 2.53c.77-2.31 2.92-4.03 5.46-4.03Z"
                    />
                  </svg>
                </span>

                Continue with Google
              </>
            )}
          </button>

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <p className="login-security">
            🔒 Your bills are private and securely
            stored in your account.
          </p>
        </div>

        <p className="login-footer">
          Simple. Secure. Organized.
        </p>

        <Credits />
      </main>
    </div>
  );
}
