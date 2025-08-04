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
    <div
      className="test-card"
      style={{ margin: "0 auto", position: "relative" }}
    >
      <SimpleConnectionIndicator />
      <h2
        style={{
          fontSize: "1.5rem",
          fontWeight: "bold",
          color: "#1f2937",
          marginBottom: "1.5rem",
          textAlign: "center",
        }}
      >
        おかえりなさい
      </h2>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
      >
        {/* Email Field */}
        <div>
          <label
            htmlFor="email"
            style={{
              display: "block",
              fontSize: "0.875rem",
              fontWeight: "500",
              color: "#374151",
              marginBottom: "0.5rem",
            }}
          >
            メールアドレス
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
            style={{
              width: "100%",
              padding: "0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.375rem",
              fontSize: "1rem",
              outline: "none",
              transition: "border-color 0.2s",
            }}
            placeholder="メールアドレスを入力してください"
          />
        </div>

        {/* Password Field */}
        <div>
          <label
            htmlFor="password"
            style={{
              display: "block",
              fontSize: "0.875rem",
              fontWeight: "500",
              color: "#374151",
              marginBottom: "0.5rem",
            }}
          >
            パスワード
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            style={{
              width: "100%",
              padding: "0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.375rem",
              fontSize: "1rem",
              outline: "none",
              transition: "border-color 0.2s",
            }}
            placeholder="パスワードを入力してください"
          />
        </div>

        {/* Error Message */}
        {error && (
          <div
            style={{
              padding: "0.75rem",
              backgroundColor: "#fef2f2",
              color: "#991b1b",
              borderRadius: "0.375rem",
              fontSize: "0.875rem",
              border: "1px solid #fecaca",
            }}
          >
            {error}
          </div>
        )}

        {/* Success Message */}
        {message && (
          <div
            style={{
              padding: "0.75rem",
              backgroundColor: "#f0fdf4",
              color: "#166534",
              borderRadius: "0.375rem",
              fontSize: "0.875rem",
              border: "1px solid #bbf7d0",
            }}
          >
            {message}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "0.75rem",
            backgroundColor: loading ? "#9ca3af" : "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: "0.375rem",
            fontSize: "1rem",
            fontWeight: "500",
            cursor: loading ? "not-allowed" : "pointer",
            transition: "background-color 0.2s",
          }}
        >
          {loading ? "ログイン中..." : "ログイン"}
        </button>

        {/* Guest Mode Button */}
        {!hideGuest && (
          <button
            type="button"
            onClick={handleGuestMode}
            style={{
              width: "100%",
              padding: "0.75rem",
              backgroundColor: "transparent",
              color: "#6b7280",
              border: "1px solid #d1d5db",
              borderRadius: "0.375rem",
              fontSize: "1rem",
              fontWeight: "500",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            ゲストとして続行
          </button>
        )}
      </form>

      {/* Additional Links */}
      {!hideRegister && (
        <div
          style={{
            marginTop: "1.5rem",
            textAlign: "center",
            fontSize: "0.875rem",
            color: "#6b7280",
          }}
        >
          <p>
            アカウントをお持ちでない方は{" "}
            <button
              onClick={handleGuestMode}
              style={{
                background: "none",
                border: "none",
                color: "#3b82f6",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              ここで登録
            </button>
          </p>
        </div>
      )}
    </div>
  );
}
