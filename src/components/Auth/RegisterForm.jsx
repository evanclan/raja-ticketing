import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function RegisterForm({ onSuccess, onSwitchToLogin }) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return false;
    }
    if (!formData.fullName.trim()) {
      setError("Full name is required");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      // Sign up the user
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            role: 'user', // Set default role
          },
        },
      });

      if (error) {
        // Handle specific error cases
        if (error.message.includes("already registered") || error.message.includes("already been registered")) {
          setError("This email is already registered. Please try logging in instead. If you need to reset your account, please contact support.");
        } else if (error.message.includes("Invalid email")) {
          setError("Please enter a valid email address.");
        } else if (error.message.includes("Password")) {
          setError("Password must be at least 6 characters long.");
        } else {
          setError(error.message);
        }
      } else {
        setMessage(
          "Registration successful! Please check your email for verification."
        );
        if (onSuccess) {
          onSuccess(data.user);
        }
      }
    } catch (error) {
      console.error("Registration error:", error);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="test-card" style={{ maxWidth: "400px", margin: "0 auto" }}>
      <h2
        style={{
          fontSize: "1.5rem",
          fontWeight: "bold",
          color: "#1f2937",
          marginBottom: "1.5rem",
          textAlign: "center",
        }}
      >
        アカウント作成
      </h2>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
      >
        {/* Full Name Field */}
        <div>
          <label
            htmlFor="fullName"
            style={{
              display: "block",
              fontSize: "0.875rem",
              fontWeight: "500",
              color: "#374151",
              marginBottom: "0.5rem",
            }}
          >
            氏名
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            value={formData.fullName}
            onChange={handleChange}
            required
            style={{
              width: "100%",
              padding: "0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.375rem",
              fontSize: "1rem",
              outline: "none",
              transition: "border-color 0.2s",
            }}
            placeholder="氏名を入力してください"
          />
        </div>

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
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
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
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
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

        {/* Confirm Password Field */}
        <div>
          <label
            htmlFor="confirmPassword"
            style={{
              display: "block",
              fontSize: "0.875rem",
              fontWeight: "500",
              color: "#374151",
              marginBottom: "0.5rem",
            }}
          >
            パスワード確認
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
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
            placeholder="パスワードを再入力してください"
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
          {loading ? "アカウント作成中..." : "アカウント作成"}
        </button>
      </form>

      {/* Additional Links */}
      <div
        style={{
          marginTop: "1.5rem",
          textAlign: "center",
          fontSize: "0.875rem",
          color: "#6b7280",
        }}
      >
        <p>
          すでにアカウントをお持ちの方は{" "}
          <button
            onClick={onSwitchToLogin}
            style={{
              background: "none",
              border: "none",
              color: "#3b82f6",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            ここでログイン
          </button>
        </p>
      </div>
    </div>
  );
}
