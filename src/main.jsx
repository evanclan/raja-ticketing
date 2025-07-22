import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

// Add error handling for debugging
try {
  console.log("🚀 React app starting...");
  const root = createRoot(document.getElementById("root"));
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
  console.log("✅ React app mounted successfully");
} catch (error) {
  console.error("❌ React mount error:", error);
  // Fallback: Show error message
  document.getElementById("root").innerHTML = `
    <div style="padding: 20px; font-family: Arial, sans-serif;">
      <h2>🔧 Loading Error</h2>
      <p>React app failed to load. Check console for details.</p>
      <pre>${error.message}</pre>
    </div>
  `;
}
