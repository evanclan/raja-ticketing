import { useState } from "react";
import { supabase } from "../../lib/supabase";
import SimpleConnectionIndicator from "../SimpleConnectionIndicator";

export default function LoginForm({
  onSuccess,
  onSwitchToRegister,
  hideGuest,
  hideRegister,
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
      } else {
        // Prevent admin login on user login page
        if (data.user.user_metadata?.role === "admin") {
          setError("Admin accounts must use the Admin Login page.");
          await supabase.auth.signOut();
        } else {
          setMessage("Login successful!");
          if (onSuccess) {
            onSuccess(data.user);
          }
        }
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGuestMode = () => {
    if (onSwitchToRegister) {
      onSwitchToRegister();
    }
  };

  return (
    <div className="card relative">
      <SimpleConnectionIndicator />
      <h2 className="text-xl font-semibold text-slate-900 text-center mb-4">
        Welcome Back
      </h2>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Email Field */}
        <div>
          <label htmlFor="email" className="label">Email Address</label>
          <input id="email" type="email" value={email}
                 onChange={(e) => setEmail(e.target.value)} required
                 autoComplete="username" className="input" placeholder="name@example.com" />
        </div>

        {/* Password Field */}
        <div>
          <label htmlFor="password" className="label">Password</label>
          <input id="password" type="password" value={password}
                 onChange={(e) => setPassword(e.target.value)} required
                 autoComplete="current-password" className="input" placeholder="••••••••" />
        </div>

        {/* Error Message */}
        {error && (
          <div className="text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm">{error}</div>
        )}

        {/* Success Message */}
        {message && (
          <div className="text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-sm">{message}</div>
        )}

        {/* Submit Button */}
        <button type="submit" disabled={loading} className="btn btn-primary w-full">
          {loading ? "Signing in..." : "Sign In"}
        </button>

        {/* Guest Mode Button */}
        {!hideGuest && (
          <button type="button" onClick={handleGuestMode} className="btn btn-outline w-full">
            Continue as Guest
          </button>
        )}
      </form>

      {/* Additional Links */}
      {!hideRegister && (
        <div className="text-center text-sm muted mt-4">
          <p>
            Don’t have an account?{" "}
            <button onClick={handleGuestMode} className="text-brand-600 hover:underline">
              Register here
            </button>
          </p>
        </div>
      )}
    </div>
  );
}
