import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import CreateEventForm from "./CreateEventForm";
import EventList from "./EventList";

export default function AdminDashboard() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [pendingRegs, setPendingRegs] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingError, setPendingError] = useState("");

  useEffect(() => {
    fetchEvents();
    fetchPendingRegs();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching events:", error.message);
      } else {
        setEvents(data || []);
      }
    } catch {
      console.error("Failed to fetch events");
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingRegs = async () => {
    setPendingLoading(true);
    setPendingError("");
    try {
      const { data, error } = await supabase
        .from("registrations")
        .select(
          "id, user_id, event_id, status, users:user_id(email), events:event_id(title)"
        )
        .eq("status", "pending");
      if (error) throw error;
      setPendingRegs(data || []);
    } catch (err) {
      setPendingError("Failed to fetch pending registrations: " + err.message);
    } finally {
      setPendingLoading(false);
    }
  };

  const handleApprove = async (regId) => {
    const { error } = await supabase
      .from("registrations")
      .update({ status: "approved" })
      .eq("id", regId);

    if (!error) {
      fetchPendingRegs();
    }
  };

  const handleReject = async (regId) => {
    await supabase
      .from("registrations")
      .update({ status: "rejected" })
      .eq("id", regId);
    fetchPendingRegs();
  };

  const handleEventCreated = (newEvent) => {
    setEvents([newEvent, ...events]);
    setShowCreateForm(false);
  };

  const handleEventDeleted = (eventId) => {
    setEvents(events.filter((event) => event.id !== eventId));
  };

  const handleEventUpdated = (updatedEvent) => {
    setEvents(
      events.map((event) =>
        event.id === updatedEvent.id ? updatedEvent : event
      )
    );
  };

  if (loading) {
    return (
      <div
        className="test-card"
        style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center" }}
      >
        <div style={{ fontSize: "1rem", color: "#6b7280" }}>
          Loading admin dashboard...
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1000, margin: "2rem auto" }}>
      <div style={{ marginBottom: 32 }}>
        <button
          onClick={() => setShowCreateForm(true)}
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: "0.375rem",
            fontSize: "1rem",
            fontWeight: "500",
            cursor: "pointer",
            marginBottom: 16,
          }}
        >
          + Create Event
        </button>
      </div>
      {showCreateForm && (
        <CreateEventForm
          onEventCreated={handleEventCreated}
          onCancel={() => setShowCreateForm(false)}
        />
      )}
      {/* Pending Registrations Section */}
      <div
        style={{
          marginBottom: 32,
          background: "#f9fafb",
          borderRadius: 8,
          padding: 24,
        }}
      >
        <h3
          style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: 12 }}
        >
          Pending Participation Approvals
        </h3>
        {pendingLoading ? (
          <div>Loading pending approvals...</div>
        ) : pendingError ? (
          <div style={{ color: "#991b1b" }}>{pendingError}</div>
        ) : pendingRegs.length === 0 ? (
          <div style={{ color: "#6b7280" }}>No pending approvals.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f3f4f6" }}>
                <th style={{ padding: "0.5rem", textAlign: "left" }}>
                  User Email
                </th>
                <th style={{ padding: "0.5rem", textAlign: "left" }}>Event</th>
                <th style={{ padding: "0.5rem" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {pendingRegs.map((reg) => (
                <tr key={reg.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "0.5rem" }}>
                    {reg.users?.email || reg.user_id}
                  </td>
                  <td style={{ padding: "0.5rem" }}>
                    {reg.events?.title || reg.event_id}
                  </td>
                  <td style={{ padding: "0.5rem" }}>
                    <button
                      onClick={() => handleApprove(reg.id)}
                      style={{
                        padding: "0.25rem 0.75rem",
                        backgroundColor: "#10b981",
                        color: "white",
                        border: "none",
                        borderRadius: "0.375rem",
                        fontWeight: "bold",
                        fontSize: "0.9rem",
                        cursor: "pointer",
                        marginRight: 8,
                      }}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(reg.id)}
                      style={{
                        padding: "0.25rem 0.75rem",
                        backgroundColor: "#ef4444",
                        color: "white",
                        border: "none",
                        borderRadius: "0.375rem",
                        fontWeight: "bold",
                        fontSize: "0.9rem",
                        cursor: "pointer",
                      }}
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <EventList
        events={events}
        onEventDeleted={handleEventDeleted}
        onEventUpdated={handleEventUpdated}
      />
    </div>
  );
}
