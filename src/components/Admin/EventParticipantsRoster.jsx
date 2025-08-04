import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabase";

export default function EventParticipantsRoster({
  eventId,
  eventTitle,
  isOpen,
  onClose,
}) {
  const [participants, setParticipants] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchParticipantsRoster = useCallback(async () => {
    if (!eventId) return;

    setLoading(true);
    setError("");

    try {
      // Try to use the new roster function first
      const { data: rosterData, error: rosterError } = await supabase.rpc(
        "get_event_participant_roster",
        { target_event_id: eventId }
      );

      if (rosterError) {
        console.warn(
          "Roster function not available, falling back to direct query"
        );
        await fetchParticipantsDirect();
      } else {
        setParticipants(rosterData || []);
      }

      // Get summary stats
      const { data: summaryData, error: summaryError } = await supabase.rpc(
        "get_event_participant_summary",
        { target_event_id: eventId }
      );

      if (!summaryError && summaryData && summaryData.length > 0) {
        setSummary(summaryData[0]);
      }
    } catch (err) {
      setError("参加者の読み込みに失敗しました: " + err.message);
      console.error("Participants fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  const fetchParticipantsDirect = async () => {
    // Fallback direct query if functions don't exist
    const { data: participantsData, error: participantsError } = await supabase
      .from("event_participants")
      .select(
        `
        full_name,
        email,
        age,
        participant_type,
        relationship_to_user,
        primary_participant_name,
        checked_in_at,
        checked_in_by,
        check_in_method,
        notes
      `
      )
      .eq("event_id", eventId)
      .order("participant_type", { ascending: false })
      .order("primary_participant_name")
      .order("checked_in_at");

    if (participantsError) {
      throw participantsError;
    }

    // Enhance with admin email
    const enhancedParticipants = await Promise.all(
      (participantsData || []).map(async (participant) => {
        let checkedInByEmail = "System";
        if (participant.checked_in_by) {
          try {
            const { data: adminData } = await supabase.auth.admin.getUserById(
              participant.checked_in_by
            );
            checkedInByEmail = adminData?.user?.email || "Unknown Admin";
          } catch {
            checkedInByEmail = "Unknown Admin";
          }
        }

        return {
          participant_name: participant.full_name,
          email: participant.email || "N/A",
          age: participant.age,
          participant_type: participant.participant_type,
          relationship: participant.relationship_to_user || "N/A",
          primary_participant: participant.primary_participant_name || "N/A",
          checked_in_time: participant.checked_in_at,
          checked_in_by_email: checkedInByEmail,
          check_in_method: participant.check_in_method,
          notes: participant.notes,
        };
      })
    );

    setParticipants(enhancedParticipants);
  };

  useEffect(() => {
    if (isOpen && eventId) {
      fetchParticipantsRoster();
    }
  }, [isOpen, eventId, fetchParticipantsRoster]);

  const filteredParticipants = participants.filter(
    (participant) =>
      participant.participant_name
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (participant.email &&
        participant.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (participant.primary_participant &&
        participant.primary_participant
          .toLowerCase()
          .includes(searchTerm.toLowerCase()))
  );

  const exportToCSV = () => {
    const headers = [
      "Name",
      "Email",
      "Age",
      "Type",
      "Relationship",
      "Primary Participant",
      "Check-in Time",
      "Checked In By",
      "Method",
      "Notes",
    ];
    const csvContent = [
      headers.join(","),
      ...filteredParticipants.map((p) =>
        [
          `"${p.participant_name}"`,
          `"${p.email}"`,
          p.age || "",
          `"${p.participant_type}"`,
          `"${p.relationship}"`,
          `"${p.primary_participant}"`,
          `"${new Date(p.checked_in_time).toLocaleString()}"`,
          `"${p.checked_in_by_email}"`,
          `"${p.check_in_method}"`,
          `"${p.notes || ""}"`,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${eventTitle || "Event"}_Participants_${
      new Date().toISOString().split("T")[0]
    }.csv`;
    link.click();
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
        zIndex: 2000,
        padding: "1rem",
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "0.5rem",
          width: "100%",
          maxWidth: "1400px",
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.5rem",
            borderBottom: "1px solid #e5e7eb",
            backgroundColor: "#f9fafb",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: "1.5rem",
                  fontWeight: "bold",
                  color: "#1f2937",
                  margin: "0 0 0.5rem 0",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                📋 イベント参加者名簿
              </h2>
              <p style={{ color: "#6b7280", fontSize: "1rem", margin: 0 }}>
                {eventTitle || "イベント"} - 完全な出席者リスト
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
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>

          {/* Summary Stats */}
          {summary.total_attendees && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                gap: "1rem",
                marginTop: "1rem",
              }}
            >
              <div
                style={{
                  textAlign: "center",
                  padding: "0.75rem",
                  backgroundColor: "white",
                  borderRadius: "0.375rem",
                }}
              >
                <div
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: "bold",
                    color: "#3b82f6",
                  }}
                >
                  {summary.total_attendees}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                  総参加者数
                </div>
              </div>
              <div
                style={{
                  textAlign: "center",
                  padding: "0.75rem",
                  backgroundColor: "white",
                  borderRadius: "0.375rem",
                }}
              >
                <div
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: "bold",
                    color: "#10b981",
                  }}
                >
                  {summary.registered_users}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                  登録ユーザー
                </div>
              </div>
              <div
                style={{
                  textAlign: "center",
                  padding: "0.75rem",
                  backgroundColor: "white",
                  borderRadius: "0.375rem",
                }}
              >
                <div
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: "bold",
                    color: "#f59e0b",
                  }}
                >
                  {summary.family_members}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                  家族メンバー
                </div>
              </div>
              {summary.average_age && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "0.75rem",
                    backgroundColor: "white",
                    borderRadius: "0.375rem",
                  }}
                >
                  <div
                    style={{
                      fontSize: "1.5rem",
                      fontWeight: "bold",
                      color: "#8b5cf6",
                    }}
                  >
                    {summary.average_age}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                    平均年齢
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Search and Export */}
          <div
            style={{
              display: "flex",
              gap: "1rem",
              marginTop: "1rem",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <input
              type="text"
              placeholder="Search participants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                flex: 1,
                minWidth: "300px",
                padding: "0.5rem",
                border: "1px solid #d1d5db",
                borderRadius: "0.375rem",
                fontSize: "0.875rem",
              }}
            />
            <button
              onClick={exportToCSV}
              disabled={participants.length === 0}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#10b981",
                color: "white",
                border: "none",
                borderRadius: "0.375rem",
                fontSize: "0.875rem",
                fontWeight: "500",
                cursor: participants.length === 0 ? "not-allowed" : "pointer",
                opacity: participants.length === 0 ? 0.5 : 1,
              }}
            >
              📥 Export CSV
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: "auto", padding: "1.5rem" }}>
          {error && (
            <div
              style={{
                padding: "1rem",
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "0.5rem",
                color: "#dc2626",
                marginBottom: "1rem",
              }}
            >
              {error}
            </div>
          )}

          {loading ? (
            <div
              style={{
                textAlign: "center",
                padding: "3rem",
                color: "#6b7280",
              }}
            >
              Loading participants roster...
            </div>
          ) : filteredParticipants.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "3rem",
                color: "#6b7280",
                backgroundColor: "#f9fafb",
                borderRadius: "0.5rem",
                border: "2px dashed #d1d5db",
              }}
            >
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📋</div>
              <div
                style={{
                  fontSize: "1.125rem",
                  fontWeight: "500",
                  marginBottom: "0.5rem",
                }}
              >
                {searchTerm
                  ? "No participants match your search"
                  : "No participants found"}
              </div>
              <div style={{ fontSize: "0.875rem" }}>
                {searchTerm
                  ? "Try adjusting your search terms"
                  : "Participants will appear here after they check in"}
              </div>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  backgroundColor: "white",
                  borderRadius: "0.5rem",
                  overflow: "hidden",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: "#f3f4f6" }}>
                    <th
                      style={{
                        padding: "0.75rem",
                        textAlign: "left",
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        color: "#374151",
                      }}
                    >
                      Name
                    </th>
                    <th
                      style={{
                        padding: "0.75rem",
                        textAlign: "left",
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        color: "#374151",
                      }}
                    >
                      Email
                    </th>
                    <th
                      style={{
                        padding: "0.75rem",
                        textAlign: "center",
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        color: "#374151",
                      }}
                    >
                      Age
                    </th>
                    <th
                      style={{
                        padding: "0.75rem",
                        textAlign: "left",
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        color: "#374151",
                      }}
                    >
                      Type
                    </th>
                    <th
                      style={{
                        padding: "0.75rem",
                        textAlign: "left",
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        color: "#374151",
                      }}
                    >
                      Relationship
                    </th>
                    <th
                      style={{
                        padding: "0.75rem",
                        textAlign: "left",
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        color: "#374151",
                      }}
                    >
                      Check-in Time
                    </th>
                    <th
                      style={{
                        padding: "0.75rem",
                        textAlign: "left",
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        color: "#374151",
                      }}
                    >
                      Checked By
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParticipants.map((participant, index) => (
                    <tr
                      key={index}
                      style={{
                        borderBottom: "1px solid #e5e7eb",
                        backgroundColor:
                          participant.participant_type === "registered_user"
                            ? "#f0f9ff"
                            : "white",
                      }}
                    >
                      <td style={{ padding: "0.75rem" }}>
                        <div style={{ fontWeight: "500", color: "#1f2937" }}>
                          {participant.participant_name}
                        </div>
                        {participant.participant_type === "family_member" &&
                          participant.primary_participant !== "N/A" && (
                            <div
                              style={{ fontSize: "0.75rem", color: "#6b7280" }}
                            >
                              with {participant.primary_participant}
                            </div>
                          )}
                      </td>
                      <td
                        style={{
                          padding: "0.75rem",
                          fontSize: "0.875rem",
                          color: "#6b7280",
                        }}
                      >
                        {participant.email}
                      </td>
                      <td
                        style={{
                          padding: "0.75rem",
                          textAlign: "center",
                          fontSize: "0.875rem",
                          color: "#6b7280",
                        }}
                      >
                        {participant.age || "-"}
                      </td>
                      <td style={{ padding: "0.75rem" }}>
                        <span
                          style={{
                            padding: "0.25rem 0.5rem",
                            borderRadius: "0.375rem",
                            fontSize: "0.75rem",
                            fontWeight: "500",
                            backgroundColor:
                              participant.participant_type === "registered_user"
                                ? "#dbeafe"
                                : "#fef3c7",
                            color:
                              participant.participant_type === "registered_user"
                                ? "#1e40af"
                                : "#92400e",
                          }}
                        >
                          {participant.participant_type === "registered_user"
                            ? "👤 User"
                            : "👨‍👩‍👧‍👦 Family"}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "0.75rem",
                          fontSize: "0.875rem",
                          color: "#6b7280",
                        }}
                      >
                        {participant.relationship !== "N/A"
                          ? participant.relationship
                          : "-"}
                      </td>
                      <td
                        style={{
                          padding: "0.75rem",
                          fontSize: "0.875rem",
                          color: "#6b7280",
                        }}
                      >
                        {new Date(participant.checked_in_time).toLocaleString()}
                      </td>
                      <td
                        style={{
                          padding: "0.75rem",
                          fontSize: "0.875rem",
                          color: "#6b7280",
                        }}
                      >
                        {participant.checked_in_by_email}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
