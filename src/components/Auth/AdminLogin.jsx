import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function AdminLogin({ onSuccess, onBack }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError("Invalid credentials");
      } else {
        // Check if user has admin role
        if (data.user.user_metadata?.role === "admin") {
          if (onSuccess) {
            onSuccess(data.user);
          }
        } else {
          setError("Access denied. Admin privileges required.");
          // Sign out the user since they don't have admin access
          await supabase.auth.signOut();
        }
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="test-card"
      style={{
        maxWidth: "400px",
        margin: "4rem auto",
        textAlign: "center",
        position: "relative",
      }}
    >
      <button
        onClick={onBack}
        style={{
          position: "absolute",
          left: 20,
          top: 20,
          background: "none",
          border: "none",
          color: "#3b82f6",
          fontWeight: "500",
          fontSize: "1.25rem",
          cursor: "pointer",
        }}
      >
        &larr;
      </button>
      <h2
        style={{
          fontSize: "1.5rem",
          fontWeight: "bold",
          color: "#1f2937",
          marginBottom: "1.5rem",
          textAlign: "center",
        }}
      >
        管理者ログイン
      </h2>
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
      >
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
            管理者メールアドレス
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
            placeholder="管理者メールアドレスを入力してください"
          />
        </div>
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
            管理者パスワード
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
            placeholder="管理者パスワードを入力してください"
          />
        </div>
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
        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "0.75rem",
            backgroundColor: loading ? "#9ca3af" : "#dc2626",
            color: "white",
            border: "none",
            borderRadius: "0.375rem",
            fontSize: "1rem",
            fontWeight: "500",
            cursor: loading ? "not-allowed" : "pointer",
            transition: "background-color 0.2s",
          }}
        >
          {loading ? "ログイン中..." : "管理者ログイン"}
        </button>
      </form>
    </div>
  );
}
