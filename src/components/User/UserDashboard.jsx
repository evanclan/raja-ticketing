import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import ParticipantQRCode from "./ParticipantQRCode";
import FamilyRegistration from "./FamilyRegistration";

// Helper to filter unique events by id
function uniqueById(arr) {
  const seen = new Set();
  return arr.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export default function UserDashboard({ user }) {
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [pastEvents, setPastEvents] = useState([]);
  const [participatedEventIds, setParticipatedEventIds] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [participateLoading, setParticipateLoading] = useState(false);
  const [participateSuccess, setParticipateSuccess] = useState("");
  const [registrations, setRegistrations] = useState([]);

  // QR Code modal state
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedEventForQR, setSelectedEventForQR] = useState(null);

  useEffect(() => {
    fetchParticipation();
  }, [user]);

  // Fetch events the user has participated in
  const fetchParticipation = async () => {
    setLoading(true);
    setError("");
    try {
      // Get all registrations for this user
      const { data: regs, error: regError } = await supabase
        .from("registrations")
        .select("event_id, created_at, status, events(*)")
        .eq("user_id", user.id);
      if (regError) throw regError;
      setRegistrations(regs || []);
      const now = new Date();
      const past = [];
      const upcoming = [];
      const eventIds = [];
      (regs || []).forEach((reg) => {
        eventIds.push(reg.event_id);
        const event = reg.events;
        if (!event) return;
        const eventDate = new Date(event.event_date + "T" + event.event_time);
        if (eventDate < now) {
          past.push(event);
        } else {
          upcoming.push(event);
        }
      });
      setParticipatedEventIds(eventIds);
      setPastEvents(past);
      setUpcomingEvents(upcoming);
      fetchUpcomingEvents(eventIds);
    } catch (err) {
      setError("Failed to fetch participation: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch upcoming events the user has NOT participated in
  const fetchUpcomingEvents = async (excludeIds) => {
    try {
      const now = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("status", "active") // Only fetch active events
        .gte("event_date", now)
        .order("event_date", { ascending: true });
      if (error) throw error;
      console.log("Fetched events:", data); // Debug log
      // Exclude already participated events
      const filtered = (data || []).filter((e) => !excludeIds.includes(e.id));
      console.log("Filtered available events:", filtered); // Debug log
      setUpcomingEvents((prev) => [...prev, ...filtered]);
    } catch (err) {
      setError("Failed to fetch upcoming events: " + err.message);
      console.error("Error fetching events:", err); // Debug log
    }
  };

  // Handle participate button
  const handleParticipate = async (event) => {
    setParticipateLoading(true);
    setParticipateSuccess("");
    setError("");
    try {
      const { error } = await supabase
        .from("registrations")
        .insert([{ user_id: user.id, event_id: event.id, status: "pending" }]);
      if (error) throw error;
      setParticipateSuccess(
        "Successfully registered for the event! Awaiting approval for your participation."
      );
      setParticipatedEventIds((prev) => [...prev, event.id]);
      fetchParticipation();
    } catch (err) {
      setError("Failed to register: " + err.message);
    } finally {
      setParticipateLoading(false);
    }
  };

  const showTicket = (event) => {
    setSelectedEventForQR(event);
    setQrModalOpen(true);
  };

  const closeQRModal = () => {
    setQrModalOpen(false);
    setSelectedEventForQR(null);
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", marginTop: "2rem" }}>Loading...</div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 800,
        margin: "2rem auto",
        background: "white",
        borderRadius: 8,
        padding: 32,
      }}
    >
      {/* Smaller title */}
      <h2
        style={{
          fontSize: "1.5rem",
          fontWeight: "bold",
          marginBottom: 24,
          color: "#1f2937",
        }}
      >
        User Dashboard
      </h2>

      {/* Family Registration Section */}
      <FamilyRegistration user={user} />

      {error && (
        <div
          style={{
            color: "#991b1b",
            marginBottom: 16,
            padding: "1rem",
            backgroundColor: "#fef2f2",
            borderRadius: "0.375rem",
            border: "1px solid #fecaca",
          }}
        >
          {error}
        </div>
      )}

      {/* FIRST: Approved Events - Most Important */}
      <div style={{ marginBottom: 40 }}>
        <h3
          style={{
            fontSize: "1.25rem",
            fontWeight: "bold",
            marginBottom: 16,
            color: "#059669",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          ✅ Your Approved Events
        </h3>
        {(() => {
          const approvedEvents = uniqueById(upcomingEvents).filter((event) => {
            const reg = registrations.find((r) => r.event_id === event.id);
            return reg && reg.status === "approved";
          });

          return approvedEvents.length === 0 ? (
            <div
              style={{
                color: "#6b7280",
                padding: "1.5rem",
                backgroundColor: "#f9fafb",
                borderRadius: "0.5rem",
                border: "1px solid #e5e7eb",
                textAlign: "center",
              }}
            >
              No approved events yet. Register for events below!
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: "1rem",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              }}
            >
              {approvedEvents.map((event) => (
                <div
                  key={event.id}
                  style={{
                    padding: "1.5rem",
                    backgroundColor: "#ecfdf5",
                    border: "2px solid #10b981",
                    borderRadius: "0.75rem",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onClick={() => setSelectedEvent(event)}
                >
                  <h4
                    style={{
                      fontWeight: "600",
                      fontSize: "1.1rem",
                      color: "#047857",
                      marginBottom: "0.5rem",
                    }}
                  >
                    🎉 {event.title}
                  </h4>
                  <p
                    style={{
                      color: "#059669",
                      fontSize: "0.9rem",
                      marginBottom: "0.25rem",
                    }}
                  >
                    📅 {event.event_date} at {event.event_time}
                  </p>
                  <p style={{ color: "#059669", fontSize: "0.9rem" }}>
                    📍 {event.location}
                  </p>
                  <div
                    style={{
                      marginTop: "0.75rem",
                      padding: "0.5rem",
                      backgroundColor: "#10b981",
                      color: "white",
                      borderRadius: "0.375rem",
                      textAlign: "center",
                      fontWeight: "500",
                      fontSize: "0.875rem",
                    }}
                  >
                    ✅ Approved - You're In!
                  </div>

                  {/* Add Ticket Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      showTicket(event);
                    }}
                    style={{
                      marginTop: "0.75rem",
                      width: "100%",
                      padding: "0.75rem",
                      backgroundColor: "#3b82f6",
                      color: "white",
                      border: "none",
                      borderRadius: "0.5rem",
                      fontWeight: "500",
                      cursor: "pointer",
                      fontSize: "0.875rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.5rem",
                    }}
                  >
                    🎫 Show My Ticket
                  </button>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* SECOND: Available Events to Register */}
      <div style={{ marginBottom: 40 }}>
        <h3
          style={{
            fontSize: "1.25rem",
            fontWeight: "bold",
            marginBottom: 16,
            color: "#3b82f6",
          }}
        >
          🎫 Available Events
        </h3>
        {(() => {
          const availableEvents = uniqueById(upcomingEvents).filter((event) => {
            const reg = registrations.find((r) => r.event_id === event.id);
            return !reg || reg.status === "rejected";
          });

          return availableEvents.length === 0 ? (
            <div style={{ color: "#6b7280" }}>
              No available events to register for.
            </div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0 }}>
              {availableEvents.map((event) => (
                <li key={event.id} style={{ marginBottom: 12 }}>
                  <button
                    style={{
                      background: "none",
                      border: "none",
                      color: "#3b82f6",
                      fontWeight: 500,
                      fontSize: "1rem",
                      cursor: "pointer",
                      textDecoration: "underline",
                    }}
                    onClick={() => setSelectedEvent(event)}
                  >
                    {event.title} — {event.event_date} {event.event_time}
                  </button>
                </li>
              ))}
            </ul>
          );
        })()}
      </div>

      {/* THIRD: Pending Events */}
      <div style={{ marginBottom: 40 }}>
        <h3
          style={{
            fontSize: "1.25rem",
            fontWeight: "bold",
            marginBottom: 16,
            color: "#f59e0b",
          }}
        >
          ⏳ Pending Approval
        </h3>
        {(() => {
          const pendingEvents = uniqueById(upcomingEvents).filter((event) => {
            const reg = registrations.find((r) => r.event_id === event.id);
            return reg && reg.status === "pending";
          });

          return pendingEvents.length === 0 ? (
            <div style={{ color: "#6b7280" }}>No events awaiting approval.</div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0 }}>
              {pendingEvents.map((event) => (
                <li key={event.id} style={{ marginBottom: 12 }}>
                  <span style={{ fontWeight: 500 }}>
                    {event.title} — {event.event_date} {event.event_time}
                  </span>
                  <span
                    style={{
                      color: "#f59e0b",
                      marginLeft: 8,
                      fontSize: "0.875rem",
                    }}
                  >
                    ⏳ Awaiting admin approval
                  </span>
                </li>
              ))}
            </ul>
          );
        })()}
      </div>

      {/* LAST: Past Events - At the Bottom */}
      <div
        style={{
          marginTop: 48,
          paddingTop: 24,
          borderTop: "2px solid #e5e7eb",
        }}
      >
        <h3
          style={{
            fontSize: "1.1rem",
            fontWeight: "600",
            marginBottom: 16,
            color: "#6b7280",
          }}
        >
          📚 Past Participated Events
        </h3>
        {uniqueById(pastEvents).length === 0 ? (
          <div style={{ color: "#9ca3af", fontSize: "0.9rem" }}>
            No past events.
          </div>
        ) : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {uniqueById(pastEvents).map((event) => (
              <li key={event.id} style={{ marginBottom: 8 }}>
                <span
                  style={{
                    fontWeight: 500,
                    color: "#6b7280",
                    fontSize: "0.9rem",
                  }}
                >
                  {event.title}
                </span>
                <span
                  style={{
                    color: "#9ca3af",
                    fontSize: "0.875rem",
                    marginLeft: 8,
                  }}
                >
                  — {event.event_date} {event.event_time}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {/* Event Details Modal */}
      {selectedEvent && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: 8,
              padding: 32,
              maxWidth: 500,
              width: "90%",
              maxHeight: "90vh",
              overflow: "auto",
            }}
          >
            <h3
              style={{
                fontSize: "1.25rem",
                fontWeight: "bold",
                marginBottom: 12,
              }}
            >
              {selectedEvent.title}
            </h3>
            <p style={{ color: "#6b7280", marginBottom: 8 }}>
              {selectedEvent.event_date} {selectedEvent.event_time}
            </p>
            <p style={{ color: "#6b7280", marginBottom: 8 }}>
              {selectedEvent.location}
            </p>
            <p style={{ marginBottom: 16 }}>{selectedEvent.description}</p>
            {selectedEvent.image_url && (
              <img
                src={selectedEvent.image_url}
                alt={selectedEvent.title}
                style={{ width: "100%", borderRadius: 4, marginBottom: 16 }}
              />
            )}
            {participateSuccess && (
              <div style={{ color: "#166534", marginBottom: 12 }}>
                {participateSuccess}
              </div>
            )}
            <div
              style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}
            >
              <button
                onClick={() => setSelectedEvent(null)}
                style={{
                  padding: "0.5rem 1.25rem",
                  backgroundColor: "#6b7280",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Close
              </button>
              {!participatedEventIds.includes(selectedEvent.id) && (
                <button
                  onClick={() => handleParticipate(selectedEvent)}
                  disabled={participateLoading}
                  style={{
                    padding: "0.5rem 1.25rem",
                    backgroundColor: participateLoading ? "#9ca3af" : "#3b82f6",
                    color: "white",
                    border: "none",
                    borderRadius: 4,
                    fontWeight: 500,
                    cursor: participateLoading ? "not-allowed" : "pointer",
                  }}
                >
                  {participateLoading ? "Registering..." : "Participate"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      <ParticipantQRCode
        event={selectedEventForQR}
        user={user}
        isOpen={qrModalOpen}
        onClose={closeQRModal}
      />
    </div>
  );
}
