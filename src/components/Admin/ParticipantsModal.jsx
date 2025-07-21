import { useState, useEffect } from "react";

export default function ParticipantsModal({ event, isOpen, onClose }) {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && event) {
      fetchParticipants();
    }
  }, [isOpen, event]);

  const fetchParticipants = async () => {
    setLoading(true);
    setError("");
    setParticipants([]);

    try {
      // Use server-side endpoint to get participants
      const response = await fetch(
        `${
          import.meta.env.VITE_API_BASE_URL || "http://localhost:3001"
        }/api/event/${event.id}/participants`
      );

      if (!response.ok) {
        throw new Error(
          `Server error: ${response.status} ${response.statusText}`
        );
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      setParticipants(result.participants || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
          🎉 Participants for: {event?.title}
        </h3>

        {loading && (
          <div style={{ padding: "2rem", textAlign: "center" }}>
            Loading participants...
          </div>
        )}

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
            Error: {error}
          </div>
        )}

        {!loading && !error && participants.length === 0 && (
          <div
            style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}
          >
            No approved participants yet.
          </div>
        )}

        {!loading && !error && participants.length > 0 && (
          <div>
            <p style={{ marginBottom: "1rem", color: "#6b7280" }}>
              Found {participants.length} approved participant(s)
            </p>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f3f4f6" }}>
                  <th
                    style={{
                      padding: "0.75rem",
                      textAlign: "left",
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    Email
                  </th>
                  <th
                    style={{
                      padding: "0.75rem",
                      textAlign: "left",
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    Name
                  </th>
                  <th
                    style={{
                      padding: "0.75rem",
                      textAlign: "left",
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    Registered
                  </th>
                </tr>
              </thead>
              <tbody>
                {participants.map((participant) => (
                  <tr
                    key={participant.id}
                    style={{ borderBottom: "1px solid #e5e7eb" }}
                  >
                    <td style={{ padding: "0.75rem" }}>{participant.email}</td>
                    <td style={{ padding: "0.75rem" }}>{participant.name}</td>
                    <td style={{ padding: "0.75rem" }}>
                      {new Date(participant.registeredAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "1.5rem",
          }}
        >
          <button
            onClick={fetchParticipants}
            disabled={loading}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: loading ? "#9ca3af" : "#10b981",
              color: "white",
              border: "none",
              borderRadius: "0.375rem",
              fontSize: "0.875rem",
              fontWeight: "500",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            🔄 Refresh
          </button>

          <button
            onClick={onClose}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: "#6366f1",
              color: "white",
              border: "none",
              borderRadius: "0.375rem",
              fontSize: "1rem",
              fontWeight: "500",
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
