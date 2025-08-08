import { useState } from "react";
import { supabase } from "../../lib/supabase";
import ParticipantsModal from "./ParticipantsModal";
import QRScanner from "./QRScanner";

export default function EventList({ events, onEventDeleted, onEventUpdated, onNavigateToEventManagement }) {
  const [editingEvent, setEditingEvent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // NEW SIMPLE Participants modal state
  const [participantsModalOpen, setParticipantsModalOpen] = useState(false);
  const [selectedEventForParticipants, setSelectedEventForParticipants] =
    useState(null);

  // QR Scanner state
  const [scannerOpen, setScannerOpen] = useState(false);
  const [selectedEventForScanner, setSelectedEventForScanner] = useState(null);



  const handleDelete = async (eventId) => {
    if (!confirm("このイベントを削除してもよろしいですか？")) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", eventId);

      if (error) {
        setError("Error deleting event: " + error.message);
      } else {
        onEventDeleted(eventId);
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async (event) => {
    setLoading(true);
    setError("");

    try {
      const newStatus = event.status === "active" ? "inactive" : "active";
      const { data, error } = await supabase
        .from("events")
        .update({ status: newStatus })
        .eq("id", event.id)
        .select()
        .single();

      if (error) {
        setError("Error updating event: " + error.message);
      } else {
        onEventUpdated(data);
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  // NEW SIMPLE participants handler
  const handleShowParticipants = (event) => {
    console.log("🎯 Opening participants modal for:", event.title);
    setSelectedEventForParticipants(event);
    setParticipantsModalOpen(true);
  };

  const handleCloseParticipants = () => {
    setParticipantsModalOpen(false);
    setSelectedEventForParticipants(null);
  };

  const handleCloseScanner = () => {
    setScannerOpen(false);
    setSelectedEventForScanner(null);
  };

  // Event Management handlers
  const handleStartEvent = (event) => {
    onNavigateToEventManagement(event.id);
  };



  const formatDate = (dateString, timeString) => {
    const date = new Date(dateString + "T" + timeString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  return (
    <div>
      {/* Error Display */}
      {error && (
        <div
          style={{
            padding: "1rem",
            backgroundColor: "#fef2f2",
            color: "#991b1b",
            borderRadius: "0.375rem",
            marginBottom: "1rem",
            border: "1px solid #fecaca",
          }}
        >
          {error}
        </div>
      )}

      {/* Events Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))",
          gap: "1.5rem",
        }}
      >
        {events.map((event) => (
          <div
            key={event.id}
            style={{
              backgroundColor: "white",
              borderRadius: "0.5rem",
              padding: "1.5rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              border:
                event.status === "inactive"
                  ? "2px solid #f3f4f6"
                  : "2px solid transparent",
            }}
          >
            {/* Event Image */}
            {event.image_url && (
              <div style={{ marginBottom: "1rem" }}>
                <img
                  src={event.image_url}
                  alt={event.title}
                  style={{
                    width: "100%",
                    height: "200px",
                    objectFit: "cover",
                    borderRadius: "0.375rem",
                  }}
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              </div>
            )}

            {/* Event Status Badge */}
            <div style={{ marginBottom: "1rem" }}>
              <span
                style={{
                  padding: "0.25rem 0.75rem",
                  borderRadius: "9999px",
                  fontSize: "0.75rem",
                  fontWeight: "500",
                  backgroundColor:
                    event.status === "active" ? "#dcfce7" : "#f3f4f6",
                  color: event.status === "active" ? "#166534" : "#6b7280",
                }}
              >
                {event.status === "active" ? "アクティブ" : "非アクティブ"}
              </span>
            </div>

            {/* Event Title */}
            <h3
              style={{
                fontSize: "1.25rem",
                fontWeight: "bold",
                color: "#1f2937",
                marginBottom: "0.5rem",
              }}
            >
              {event.title}
            </h3>

            {/* Event Details */}
            <div style={{ marginBottom: "1rem" }}>
              <p
                style={{
                  color: "#6b7280",
                  fontSize: "0.875rem",
                  marginBottom: "0.5rem",
                }}
              >
                📅 {formatDate(event.event_date, event.event_time)}
              </p>
              <p
                style={{
                  color: "#6b7280",
                  fontSize: "0.875rem",
                  marginBottom: "0.5rem",
                }}
              >
                📍 {event.location}
              </p>
              <p
                style={{
                  color: "#6b7280",
                  fontSize: "0.875rem",
                  marginBottom: "0.5rem",
                }}
              >
                💰 チケット1枚 {formatPrice(event.price)}
              </p>
              <p
                style={{
                  color: "#6b7280",
                  fontSize: "0.875rem",
                  marginBottom: "0.5rem",
                }}
              >
                🎫 定員: {event.capacity}枚
              </p>
            </div>

            {/* Event Description */}
            <p
              style={{
                color: "#374151",
                fontSize: "0.875rem",
                lineHeight: "1.5",
                marginBottom: "1rem",
              }}
            >
              {event.description}
            </p>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button
                onClick={() => handleStatusToggle(event)}
                disabled={loading}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor:
                    event.status === "active" ? "#f59e0b" : "#10b981",
                  color: "white",
                  border: "none",
                  borderRadius: "0.375rem",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "background-color 0.2s",
                }}
              >
                {event.status === "active" ? "非アクティブ化" : "アクティブ化"}
              </button>

              <button
                onClick={() => setEditingEvent(event)}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: "0.375rem",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  cursor: "pointer",
                  transition: "background-color 0.2s",
                }}
              >
                編集
              </button>

              <button
                onClick={() => handleShowParticipants(event)}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#16a34a",
                  color: "white",
                  border: "none",
                  borderRadius: "0.375rem",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  cursor: "pointer",
                  transition: "background-color 0.2s",
                }}
              >
                👥 参加者
              </button>

              <button
                onClick={() => handleStartEvent(event)}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#7c3aed",
                  color: "white",
                  border: "none",
                  borderRadius: "0.375rem",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  cursor: "pointer",
                  transition: "background-color 0.2s",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                }}
              >
                🎉 イベント開始
              </button>

              <button
                onClick={() => handleDelete(event.id)}
                disabled={loading}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#ef4444",
                  color: "white",
                  border: "none",
                  borderRadius: "0.375rem",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "background-color 0.2s",
                }}
              >
                削除
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Event Modal */}
      {editingEvent && (
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
              backgroundColor: "white",
              borderRadius: "0.5rem",
              padding: "2rem",
              maxWidth: "600px",
              width: "90%",
              maxHeight: "90vh",
              overflow: "auto",
            }}
          >
            <h3
              style={{
                fontSize: "1.25rem",
                fontWeight: "bold",
                color: "#1f2937",
                marginBottom: "1rem",
              }}
            >
              イベント編集: {editingEvent.title}
            </h3>

            <p style={{ color: "#6b7280", marginBottom: "1rem" }}>
              編集機能は次のステップで実装されます。
            </p>

            <div
              style={{
                display: "flex",
                gap: "1rem",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => setEditingEvent(null)}
                style={{
                  padding: "0.75rem 1.5rem",
                  backgroundColor: "transparent",
                  color: "#6b7280",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                  fontSize: "1rem",
                  fontWeight: "500",
                  cursor: "pointer",
                }}
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW FRESH Participants Modal */}
      <ParticipantsModal
        event={selectedEventForParticipants}
        isOpen={participantsModalOpen}
        onClose={handleCloseParticipants}
      />

      {/* QR Scanner Modal */}
      <QRScanner
        eventId={selectedEventForScanner?.id}
        isOpen={scannerOpen}
        onClose={handleCloseScanner}
      />


    </div>
  );
}
