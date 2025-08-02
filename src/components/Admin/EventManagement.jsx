import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import QRScanner from "./QRScanner";

export default function EventManagement({ event, isOpen, onClose }) {
  const [stats, setStats] = useState({ total: 0, checkedIn: 0, pending: 0 });
  const [checkedInParticipants, setCheckedInParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchEventData = useCallback(async () => {
    if (!event?.id) return;

    setLoading(true);
    setError("");

    try {
      // Get all registrations for this event
      const { data: registrations, error: regError } = await supabase
        .from("registrations")
        .select("id, user_id, status, checked_in_at, checked_in_by, created_at")
        .eq("event_id", event.id)
        .eq("status", "approved")
        .order("checked_in_at", { ascending: false });

      if (regError) throw regError;

      // Calculate stats
      const total = registrations.length;
      const checkedIn = registrations.filter(r => r.checked_in_at).length;
      const pending = total - checkedIn;

      setStats({ total, checkedIn, pending });

      // Get checked-in participants with user details
      const checkedInRegs = registrations.filter(r => r.checked_in_at);
      
      if (checkedInRegs.length > 0) {
        // Get user details and family members for checked-in participants
        const participantsWithDetails = await Promise.all(
          checkedInRegs.map(async (reg) => {
            try {
              // Try to get user from users table first
              let userInfo;
              const { data: userData, error: userError } = await supabase
                .from("users")
                .select("email, full_name")
                .eq("id", reg.user_id)
                .single();

              if (userError || !userData) {
                // Fallback to auth.users
                const { data: authUser } = await supabase.auth.admin.getUserById(reg.user_id);
                userInfo = {
                  email: authUser?.user?.email || 'Unknown',
                  full_name: authUser?.user?.user_metadata?.full_name || 
                            authUser?.user?.raw_user_meta_data?.full_name || 
                            authUser?.user?.email || 'Unknown'
                };
              } else {
                userInfo = userData;
              }

              // Get family members
              const { data: familyMembers } = await supabase
                .from("family_members")
                .select("full_name, age, relationship")
                .eq("user_id", reg.user_id)
                .order("created_at", { ascending: true });

              return {
                ...reg,
                user: userInfo,
                familyMembers: familyMembers || [],
                checkedInTime: new Date(reg.checked_in_at).toLocaleString()
              };
            } catch (err) {
              console.error("Error fetching participant details:", err);
              return {
                ...reg,
                user: { email: 'Error loading', full_name: 'Error loading' },
                familyMembers: [],
                checkedInTime: new Date(reg.checked_in_at).toLocaleString()
              };
            }
          })
        );

        setCheckedInParticipants(participantsWithDetails);
      } else {
        setCheckedInParticipants([]);
      }

    } catch (err) {
      setError("Failed to load event data: " + err.message);
      console.error("Event data fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [event?.id, refreshTrigger]);

  useEffect(() => {
    if (isOpen && event) {
      fetchEventData();
    }
  }, [isOpen, event, fetchEventData]);

  const handleScannerClose = () => {
    setScannerOpen(false);
    // Refresh data after scanner closes (in case someone was checked in)
    setRefreshTrigger(prev => prev + 1);
  };

  const formatDateTime = (date, time) => {
    const eventDate = new Date(`${date}T${time}`);
    return eventDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "1rem"
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "1rem",
          width: "100%",
          maxWidth: "1200px",
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column"
        }}
      >
        {/* Header */}
        <div style={{ 
          padding: "1.5rem", 
          borderBottom: "1px solid #e5e7eb",
          backgroundColor: "#f9fafb"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h2 style={{ 
                fontSize: "1.5rem", 
                fontWeight: "bold", 
                color: "#1f2937",
                margin: "0 0 0.5rem 0" 
              }}>
                🎉 {event?.title}
              </h2>
              <p style={{ 
                color: "#6b7280", 
                fontSize: "0.875rem",
                margin: "0"
              }}>
                📅 {formatDateTime(event?.event_date, event?.event_time)} | 📍 {event?.location}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                padding: "0.5rem",
                backgroundColor: "transparent",
                color: "#6b7280",
                border: "none",
                borderRadius: "0.375rem",
                fontSize: "1.5rem",
                cursor: "pointer",
                lineHeight: 1
              }}
            >
              ✕
            </button>
          </div>

          {/* Stats Cards */}
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", 
            gap: "1rem",
            marginTop: "1rem"
          }}>
            <div style={{
              backgroundColor: "white",
              padding: "1rem",
              borderRadius: "0.5rem",
              textAlign: "center",
              border: "1px solid #e5e7eb"
            }}>
              <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#3b82f6" }}>
                {stats.total}
              </div>
              <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                Total Registered
              </div>
            </div>
            <div style={{
              backgroundColor: "white",
              padding: "1rem",
              borderRadius: "0.5rem",
              textAlign: "center",
              border: "1px solid #e5e7eb"
            }}>
              <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#10b981" }}>
                {stats.checkedIn}
              </div>
              <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                Checked In
              </div>
            </div>
            <div style={{
              backgroundColor: "white",
              padding: "1rem",
              borderRadius: "0.5rem",
              textAlign: "center",
              border: "1px solid #e5e7eb"
            }}>
              <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#f59e0b" }}>
                {stats.pending}
              </div>
              <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                Pending
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ 
            display: "flex", 
            gap: "1rem", 
            marginTop: "1rem",
            justifyContent: "center"
          }}>
            <button
              onClick={() => setScannerOpen(true)}
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: "#7c3aed",
                color: "white",
                border: "none",
                borderRadius: "0.5rem",
                fontSize: "1rem",
                fontWeight: "600",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                transition: "background-color 0.2s"
              }}
            >
              📱 Open QR Scanner
            </button>
            <button
              onClick={() => setRefreshTrigger(prev => prev + 1)}
              disabled={loading}
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "0.5rem",
                fontSize: "1rem",
                fontWeight: "600",
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                opacity: loading ? 0.6 : 1
              }}
            >
              🔄 Refresh Data
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: "auto", padding: "1.5rem" }}>
          {error && (
            <div style={{
              padding: "1rem",
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "0.5rem",
              color: "#dc2626",
              marginBottom: "1rem"
            }}>
              {error}
            </div>
          )}

          <h3 style={{ 
            fontSize: "1.25rem", 
            fontWeight: "bold", 
            color: "#1f2937",
            marginBottom: "1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}>
            ✅ Checked-In Participants ({checkedInParticipants.length})
          </h3>

          {loading ? (
            <div style={{ 
              textAlign: "center", 
              padding: "3rem", 
              color: "#6b7280" 
            }}>
              Loading participants...
            </div>
          ) : checkedInParticipants.length === 0 ? (
            <div style={{ 
              textAlign: "center", 
              padding: "3rem", 
              color: "#6b7280",
              backgroundColor: "#f9fafb",
              borderRadius: "0.5rem",
              border: "2px dashed #d1d5db"
            }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📱</div>
              <div style={{ fontSize: "1.125rem", fontWeight: "500", marginBottom: "0.5rem" }}>
                No participants checked in yet
              </div>
              <div style={{ fontSize: "0.875rem" }}>
                Use the QR Scanner to check in participants as they arrive
              </div>
            </div>
          ) : (
            <div style={{ 
              display: "grid", 
              gap: "1rem",
              gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))"
            }}>
              {checkedInParticipants.map((participant) => (
                <div
                  key={participant.id}
                  style={{
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "0.5rem",
                    padding: "1rem"
                  }}
                >
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    alignItems: "flex-start",
                    marginBottom: "0.75rem"
                  }}>
                    <div>
                      <div style={{ 
                        fontWeight: "600", 
                        color: "#1f2937",
                        fontSize: "1rem"
                      }}>
                        {participant.user.full_name}
                      </div>
                      <div style={{ 
                        color: "#6b7280", 
                        fontSize: "0.875rem" 
                      }}>
                        {participant.user.email}
                      </div>
                    </div>
                    <div style={{
                      backgroundColor: "#10b981",
                      color: "white",
                      padding: "0.25rem 0.5rem",
                      borderRadius: "0.25rem",
                      fontSize: "0.75rem",
                      fontWeight: "500"
                    }}>
                      ✓ Checked In
                    </div>
                  </div>

                  <div style={{ 
                    fontSize: "0.75rem", 
                    color: "#6b7280",
                    marginBottom: "0.5rem"
                  }}>
                    🕐 {participant.checkedInTime}
                  </div>

                  {participant.familyMembers.length > 0 && (
                    <div style={{ 
                      marginTop: "0.75rem",
                      padding: "0.75rem",
                      backgroundColor: "white",
                      borderRadius: "0.375rem",
                      border: "1px solid #e5e7eb"
                    }}>
                      <div style={{ 
                        fontSize: "0.875rem", 
                        fontWeight: "500", 
                        color: "#374151",
                        marginBottom: "0.5rem"
                      }}>
                        👨‍👩‍👧‍👦 Family Members ({participant.familyMembers.length}):
                      </div>
                      {participant.familyMembers.map((family, idx) => (
                        <div 
                          key={idx}
                          style={{ 
                            fontSize: "0.75rem", 
                            color: "#6b7280",
                            marginBottom: "0.25rem"
                          }}
                        >
                          • {family.full_name} 
                          {family.age && ` (${family.age})`}
                          {family.relationship && ` - ${family.relationship}`}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* QR Scanner Modal */}
      <QRScanner
        eventId={event?.id}
        isOpen={scannerOpen}
        onClose={handleScannerClose}
      />
    </div>
  );
}