import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import CreateEventForm from "./CreateEventForm";
import EventList from "./EventList";

export default function AdminDashboard({ onNavigateToEventManagement }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [pendingRegs, setPendingRegs] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingError, setPendingError] = useState("");

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
      // Get pending registrations with user and event details separately
      const { data: pendingRegs, error } = await supabase
        .from("registrations")
        .select("id, user_id, event_id, status")
        .eq("status", "pending");
      
      if (error) throw error;
      
      if (!pendingRegs || pendingRegs.length === 0) {
        setPendingRegs([]);
        return;
      }

      // Get user and event details separately to avoid join issues
      const userIds = [...new Set(pendingRegs.map(reg => reg.user_id))];
      const eventIds = [...new Set(pendingRegs.map(reg => reg.event_id))];

      const [
        { data: usersData, error: usersError },
        { data: eventsData, error: eventsError }
      ] = await Promise.all([
        supabase.from("users").select("id, email").in("id", userIds),
        supabase.from("events").select("id, title").in("id", eventIds)
      ]);

      if (eventsError) {
        console.warn("Failed to fetch events for pending registrations:", eventsError);
      }

      // If users table doesn't exist or has issues, try auth.users
      let finalUsersData = usersData;
      if (usersError || !usersData || usersData.length === 0) {
        finalUsersData = await Promise.all(
          userIds.map(async (userId) => {
            const { data: authUser } = await supabase.auth.admin.getUserById(userId);
            return {
              id: userId,
              email: authUser?.user?.email || 'Unknown'
            };
          })
        );
      }

      // Combine the data
      const pendingWithDetails = pendingRegs.map(reg => {
        const user = finalUsersData?.find(u => u.id === reg.user_id);
        const event = eventsData?.find(e => e.id === reg.event_id);
        return {
          ...reg,
          users: user || { email: 'Unknown' },
          events: event || { title: 'Unknown Event' }
        };
      });

      setPendingRegs(pendingWithDetails);
    } catch (err) {
      setPendingError("Failed to fetch pending registrations: " + err.message);
    } finally {
      setPendingLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchPendingRegs();
  }, []);

  const handleApprove = async (regId) => {
    const { error } = await supabase
      .from("registrations")
      .update({ status: "approved" })
      .eq("id", regId);

    if (!error) {
      fetchPendingRegs(); // Refresh pending list
      // Note: Participants modal should refresh when opened again
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
          管理者ダッシュボードを読み込み中...
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
          + イベント作成
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
          参加承認待ち
        </h3>
        {pendingLoading ? (
          <div>承認待ちを読み込み中...</div>
        ) : pendingError ? (
          <div style={{ color: "#991b1b" }}>{pendingError}</div>
        ) : pendingRegs.length === 0 ? (
          <div style={{ color: "#6b7280" }}>承認待ちはありません。</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f3f4f6" }}>
                <th style={{ padding: "0.5rem", textAlign: "left" }}>
                  ユーザーメールアドレス
                </th>
                                  <th style={{ padding: "0.5rem", textAlign: "left" }}>イベント</th>
                  <th style={{ padding: "0.5rem" }}>操作</th>
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
                      承認
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
                      拒否
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
        onNavigateToEventManagement={onNavigateToEventManagement}
      />
    </div>
  );
}
