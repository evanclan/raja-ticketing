import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";
import SuperuserDashboard from "../Superuser/SuperuserDashboard";

function AdminLoginForm({ onSuccess, onBack, onSuperuser }) {
  return (
    <div
      className="test-card"
      style={{ maxWidth: "400px", margin: "0 auto", position: "relative" }}
    >
      {/* Superuser Button Top Left */}
      <button
        onClick={onSuperuser}
        style={{
          position: "absolute",
          top: 20,
          left: 20,
          backgroundColor: "#3b82f6",
          color: "white",
          border: "none",
          borderRadius: "0.375rem",
          fontWeight: "bold",
          fontSize: "1rem",
          padding: "0.5rem 1.25rem",
          cursor: "pointer",
          zIndex: 10,
        }}
      >
        Superuser
      </button>
      {/* Back Button */}
      <button
        onClick={onBack}
        style={{
          position: "absolute",
          right: 20,
          top: 20,
          background: "none",
          border: "none",
          color: "#3b82f6",
          fontWeight: 500,
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
        Admin Login
      </h2>
      <LoginForm onSuccess={onSuccess} hideGuest hideRegister hideAdmin />
    </div>
  );
}

function SuperuserLogin({ onBack }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);

  // Check for existing superuser session on component mount
  useEffect(() => {
    const savedSuperuser = localStorage.getItem("superuser_logged_in");
    if (savedSuperuser === "true") {
      setLoggedIn(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    // Query the superusers table
    const { data, error } = await supabase
      .from("superusers")
      .select("*")
      .eq("username", username)
      .eq("password", password)
      .single();
    if (error || !data) {
      setError("Invalid username or password");
      setLoading(false);
      return;
    }
    setLoggedIn(true);
    // Store superuser login in localStorage
    localStorage.setItem("superuser_logged_in", "true");
    localStorage.setItem("superuser_username", username);
    setLoading(false);
  };

  const handleSignOut = () => {
    setLoggedIn(false);
    // Clear superuser session from localStorage
    localStorage.removeItem("superuser_logged_in");
    localStorage.removeItem("superuser_username");
    onBack();
  };

  if (loggedIn) {
    // Render the real SuperuserDashboard after login
    return <SuperuserDashboard onSignOut={handleSignOut} />;
  }

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
          fontWeight: 500,
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
        Superuser Login
      </h2>
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
      >
        <div>
          <label
            htmlFor="username"
            style={{
              display: "block",
              fontSize: "0.875rem",
              fontWeight: "500",
              color: "#374151",
              marginBottom: "0.5rem",
            }}
          >
            Username
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
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
            placeholder="Enter username"
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
            Password
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
            placeholder="Enter password"
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
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}

export default function AuthContainer({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adminMode, setAdminMode] = useState(false);
  const [superuserMode, setSuperuserMode] = useState(false);

  useEffect(() => {
    // Check for existing session
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // Check if session is expired and refresh if needed
      if (session?.user) {
        const now = Math.floor(Date.now() / 1000);
        const expiresAt = session.expires_at;

        if (expiresAt && now >= expiresAt) {
          // Session expired, try to refresh
          const { data: refreshData, error: refreshError } =
            await supabase.auth.refreshSession();
          if (refreshError || !refreshData.session) {
            // Refresh failed, clear session
            setUser(null);
          } else {
            setUser(refreshData.session.user);
            if (onAuthSuccess) {
              onAuthSuccess(refreshData.session.user);
            }
          }
        } else {
          setUser(session.user);
          if (onAuthSuccess) {
            onAuthSuccess(session.user);
          }
        }
      }
      setLoading(false);
    };

    checkUser();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setUser(session.user);
        if (onAuthSuccess) {
          onAuthSuccess(session.user);
        }
      } else if (event === "SIGNED_OUT") {
        setUser(null);
      } else if (event === "TOKEN_REFRESHED" && session?.user) {
        setUser(session.user);
        if (onAuthSuccess) {
          onAuthSuccess(session.user);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [onAuthSuccess]);

  const handleAuthSuccess = (userData) => {
    setUser(userData);
    if (onAuthSuccess) {
      onAuthSuccess(userData);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (loading) {
    return (
      <div
        className="test-card"
        style={{ maxWidth: "400px", margin: "0 auto", textAlign: "center" }}
      >
        <div style={{ fontSize: "1rem", color: "#6b7280" }}>Loading...</div>
      </div>
    );
  }

  if (user) {
    return (
      <div
        className="test-card"
        style={{ maxWidth: "400px", margin: "0 auto" }}
      >
        <h2
          style={{
            fontSize: "1.5rem",
            fontWeight: "bold",
            color: "#1f2937",
            marginBottom: "1rem",
            textAlign: "center",
          }}
        >
          Welcome, {user.user_metadata?.full_name || user.email}!
        </h2>

        <div
          style={{
            padding: "1rem",
            backgroundColor: "#f0fdf4",
            borderRadius: "0.375rem",
            marginBottom: "1rem",
            fontSize: "0.875rem",
            color: "#166534",
          }}
        >
          <p>You are successfully logged in.</p>
          <p>Email: {user.email}</p>
        </div>

        <button
          onClick={handleLogout}
          style={{
            width: "100%",
            padding: "0.75rem",
            backgroundColor: "#ef4444",
            color: "white",
            border: "none",
            borderRadius: "0.375rem",
            fontSize: "1rem",
            fontWeight: "500",
            cursor: "pointer",
            transition: "background-color 0.2s",
          }}
        >
          Sign Out
        </button>
      </div>
    );
  }

  if (superuserMode) {
    return <SuperuserLogin onBack={() => setSuperuserMode(false)} />;
  }

  if (adminMode) {
    return (
      <AdminLoginForm
        onSuccess={handleAuthSuccess}
        onBack={() => setAdminMode(false)}
        onSuperuser={() => setSuperuserMode(true)}
      />
    );
  }

  return (
    <div>
      {isLogin ? (
        <LoginForm
          onSuccess={handleAuthSuccess}
          onSwitchToRegister={() => setIsLogin(false)}
          onAdminLogin={() => setAdminMode(true)}
        />
      ) : (
        <RegisterForm
          onSuccess={handleAuthSuccess}
          onSwitchToLogin={() => setIsLogin(true)}
        />
      )}
    </div>
  );
}
