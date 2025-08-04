import { useState } from "react";
import { supabase } from "./lib/supabase";
import AuthContainer from "./components/Auth/AuthContainer";
import AdminDashboard from "./components/Admin/AdminDashboard";
import UserDashboard from "./components/User/UserDashboard";
import EventManagementPage from "./components/Admin/EventManagementPage";

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState("dashboard"); // "dashboard" | "event-management"
  const [selectedEventId, setSelectedEventId] = useState(null);

  const handleAuthSuccess = (user) => {
    setCurrentUser(user);
  };

  const handleNavigateToEventManagement = (eventId) => {
    setSelectedEventId(eventId);
    setCurrentView("event-management");
  };

  const handleBackToDashboard = () => {
    setCurrentView("dashboard");
    setSelectedEventId(null);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f3f4f6",
        padding: "1rem 0",
      }}
    >
      <div className="container">
        <h1
          style={{
            fontSize: window.innerWidth < 640 ? "1.5rem" : "1.875rem",
            fontWeight: "bold",
            textAlign: "center",
            color: "#1f2937",
            marginBottom: "2rem",
            padding: "0 1rem",
          }}
        >
          RaJA Ticketing System
        </h1>

        {currentUser ? (
          <div>
            {/* Navigation Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "1rem 2rem",
                backgroundColor: "white",
                marginBottom: "2rem",
                borderRadius: "0.5rem",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: "bold",
                    color: "#1f2937",
                    margin: 0,
                  }}
                >
                  RaJA Ticketing System
                </h2>
                <p
                  style={{
                    color: "#6b7280",
                    margin: "0.25rem 0 0 0",
                    fontSize: "0.875rem",
                  }}
                >
                  ログイン中: {currentUser.email}
                </p>
              </div>
              <div style={{ display: "flex", gap: "1rem" }}>
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    setCurrentUser(null);
                  }}
                  style={{
                    padding: "0.5rem 1rem",
                    backgroundColor: "#ef4444",
                    color: "white",
                    border: "none",
                    borderRadius: "0.375rem",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                  }}
                >
                  ログアウト
                </button>
              </div>
            </div>

            {/* Show appropriate view based on currentView state */}
            {currentUser.user_metadata?.role === "admin" ? (
              currentView === "event-management" ? (
                <EventManagementPage
                  eventId={selectedEventId}
                  onBack={handleBackToDashboard}
                  currentUser={currentUser}
                />
              ) : (
                <AdminDashboard
                  user={currentUser}
                  onNavigateToEventManagement={handleNavigateToEventManagement}
                />
              )
            ) : (
              <UserDashboard user={currentUser} />
            )}
          </div>
        ) : (
          <AuthContainer onAuthSuccess={handleAuthSuccess} />
        )}
      </div>
    </div>
  );
}

export default App;
