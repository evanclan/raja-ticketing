import { useState, useEffect } from "react";
import { supabaseHelpers } from "../lib/supabase-helpers";

export default function SimpleConnectionIndicator() {
  const [connected, setConnected] = useState(null);

  useEffect(() => {
    const testConnection = async () => {
      try {
        const result = await supabaseHelpers.checkConnection();
        setConnected(result.success);
      } catch (error) {
        setConnected(false);
      }
    };

    testConnection();
  }, []);

  if (connected === null) {
    return (
      <div
        style={{
          position: "absolute",
          top: "1rem",
          left: "1rem",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          fontSize: "0.75rem",
          color: "#6b7280",
          zIndex: 10,
        }}
      >
        <div
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor: "#fbbf24",
            animation: "pulse 2s infinite",
          }}
        />
        Testing...
      </div>
    );
  }

  return (
    <div
      style={{
        position: "absolute",
        top: "1rem",
        left: "1rem",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        fontSize: "0.75rem",
        color: connected ? "#10b981" : "#ef4444",
        zIndex: 10,
      }}
    >
      <div
        style={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          backgroundColor: connected ? "#10b981" : "#ef4444",
        }}
      />
      {connected ? "DB Connected" : "DB Error"}
    </div>
  );
}
