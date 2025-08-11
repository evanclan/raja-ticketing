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
    <div className="min-h-dvh">
      <header className="brand-header">
        <div className="brand-bar" />
        <nav className="container brand-nav">
          <div>
            <div className="brand-title">RaJA Ticketing System</div>
            <div className="brand-subtle">Modern event management</div>
          </div>
          {currentUser && (
            <button
              className="btn btn-outline"
              onClick={async () => {
                await supabase.auth.signOut();
                setCurrentUser(null);
              }}
            >
              Sign Out
            </button>
          )}
        </nav>
      </header>
      <main className="container py-6">

        {currentUser ? (
          <div>
            <div className="card mb-6 flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-slate-900">Welcome back</div>
                <p className="muted mt-1">Logged in as: {currentUser.email}</p>
              </div>
              <div className="hidden sm:block" />
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
          <div className="max-w-md mx-auto">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-semibold text-slate-900">RaJA Ticketing System</h1>
              <p className="muted mt-1">Sign in to continue</p>
            </div>
            <AuthContainer onAuthSuccess={handleAuthSuccess} />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
