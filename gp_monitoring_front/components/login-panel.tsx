"use client";

import { FormEvent, useState } from "react";
import { BarChart3, Eye, EyeOff, LockKeyhole, LogIn, ShieldCheck, TrendingUp } from "lucide-react";
import { useLoginMutation } from "@/lib/store/api/gpApi";
import { useAppDispatch } from "@/lib/store/hooks";
import { setUser } from "@/lib/store/slices/authSlice";

export function LoginPanel() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [login] = useLoginMutation();
  const dispatch = useAppDispatch();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const result = await login({ username, password }).unwrap();

      dispatch(setUser(result.user));
      window.location.href = "/dashboard";
    } catch (loginError) {
      const message = loginError && typeof loginError === "object" && "data" in loginError
        ? (loginError as any).data?.message ?? "Unable to sign in."
        : "Unable to sign in.";

      setError(String(message));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-shell" aria-label="GP Monitoring login">
        <div className="auth-aside" aria-hidden="true">
          <div className="brand-mark">
            <ShieldCheck size={26} />
          </div>
          <div>
            <p className="eyebrow">Branch performance</p>
            <h1>GP Monitoring</h1>
            <span>Daily sales, profit, and GP reporting in one secure workspace.</span>
          </div>

          <div className="auth-signal">
            <div className="signal-chart">
              <span className="bar bar-one" />
              <span className="bar bar-two" />
              <span className="bar bar-three" />
              <span className="bar bar-four" />
              <span className="bar bar-five" />
            </div>
            <div className="signal-copy">
              <strong>Clear daily visibility</strong>
              <span>Review branch movement as soon as the report is ready.</span>
            </div>
          </div>
        </div>

        <div className="auth-panel">
          <div className="mobile-brand">
            <div className="brand-mark">
              <ShieldCheck size={24} aria-hidden="true" />
            </div>
            <div>
              <p className="eyebrow">Secure access</p>
              <h1>GP Monitoring</h1>
            </div>
          </div>

          <div className="auth-heading">
            <div className="auth-icon-pair">
              <BarChart3 size={20} />
              <TrendingUp size={20} />
            </div>
            <h2>Sign in to dashboard</h2>
            <span>Use your monitoring account to view today&apos;s branch report.</span>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              Username
              <input
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Enter username"
                required
              />
            </label>

            <label>
              Password
              <span className="password-field">
                <input
                  autoComplete="current-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter password"
                  required
                />
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>

            {error ? <p className="form-error">{error}</p> : null}

            <button className="primary-button" disabled={isSubmitting} type="submit">
              {isSubmitting ? <LockKeyhole size={18} /> : <LogIn size={18} />}
              {isSubmitting ? "Signing in" : "Sign in"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
