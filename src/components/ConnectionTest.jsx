import { useState, useEffect } from "react";
import { supabaseHelpers } from "../lib/supabase-helpers";

export default function ConnectionTest() {
  const [status, setStatus] = useState("Testing connection...");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const testSupabaseConnection = async () => {
      try {
        setStatus("Testing Supabase connection...");
        const testResult = await supabaseHelpers.checkConnection();
        setResult(testResult);

        if (testResult.success) {
          setStatus("✅ Connection successful!");
        } else {
          setStatus("❌ Connection failed: " + testResult.error);
        }
      } catch (error) {
        setStatus("❌ Test failed: " + error.message);
        setResult({ success: false, error: error.message });
      } finally {
        setLoading(false);
      }
    };

    testSupabaseConnection();
  }, []);

  return (
    <div className="test-card" style={{ maxWidth: "28rem", margin: "0 auto" }}>
      <h2
        style={{
          fontSize: "1.25rem",
          fontWeight: "bold",
          color: "#1f2937",
          marginBottom: "1rem",
        }}
      >
        Supabase Connection Test
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div
            style={{
              width: "0.75rem",
              height: "0.75rem",
              borderRadius: "50%",
              backgroundColor: loading
                ? "#fbbf24"
                : result?.success
                ? "#10b981"
                : "#ef4444",
              animation: loading ? "pulse 2s infinite" : "none",
            }}
          ></div>
          <span style={{ fontSize: "0.875rem", fontWeight: "500" }}>
            {status}
          </span>
        </div>

        {result && (
          <div
            style={{
              padding: "0.75rem",
              borderRadius: "0.5rem",
              fontSize: "0.875rem",
              backgroundColor: result.success ? "#f0fdf4" : "#fef2f2",
              color: result.success ? "#166534" : "#991b1b",
              border: `1px solid ${result.success ? "#bbf7d0" : "#fecaca"}`,
            }}
          >
            <strong>Result:</strong> {result.success ? "Success" : "Failed"}
            {result.error && (
              <div style={{ marginTop: "0.5rem" }}>
                <strong>Error:</strong> {result.error}
              </div>
            )}
            {result.data && (
              <div style={{ marginTop: "0.5rem" }}>
                <strong>Database Tables Status:</strong>
                <div style={{ marginTop: "0.25rem", fontSize: "0.75rem" }}>
                  <div>📊 Events: {result.data.events} records</div>
                  <div>👥 Users: {result.data.users} records</div>
                  <div>
                    📝 Registrations: {result.data.registrations} records
                  </div>
                  <div>
                    📋 Guest Applications: {result.data.guest_applications}{" "}
                    records
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
          <p>Environment Variables:</p>
          <p>
            URL: {import.meta.env.VITE_SUPABASE_URL ? "✅ Set" : "❌ Missing"}
          </p>
          <p>
            Key:{" "}
            {import.meta.env.VITE_SUPABASE_ANON_KEY ? "✅ Set" : "❌ Missing"}
          </p>
        </div>
      </div>
    </div>
  );
}
