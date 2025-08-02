import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

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
      console.log("Fetching participants for event:", event.id); // Debug log
      
      // First, get all approved registrations for this event
      const { data: registrations, error: regError } = await supabase
        .from("registrations")
        .select("user_id, created_at, status")
        .eq("event_id", event.id)
        .eq("status", "approved");

      if (regError) {
        throw new Error(regError.message);
      }

      console.log("Found registrations:", registrations); // Debug log

      if (!registrations || registrations.length === 0) {
        setParticipants([]);
        return;
      }

      // Get user details separately to avoid join issues
      const userIds = registrations.map(reg => reg.user_id);
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, email, full_name")
        .in("id", userIds);

      if (usersError) {
        console.warn("Could not fetch from users table, trying auth.users:", usersError);
        // Fallback: get user info from auth metadata
        const participantsWithUserInfo = await Promise.all(
          registrations.map(async (reg) => {
            const { data: authUser } = await supabase.auth.admin.getUserById(reg.user_id);
            return {
              ...reg,
              users: {
                email: authUser?.user?.email || 'Unknown',
                full_name: authUser?.user?.user_metadata?.full_name || authUser?.user?.email || 'Unknown'
              }
            };
          })
        );
        
        // Get family member counts
        const participantsWithFamily = await Promise.all(
          participantsWithUserInfo.map(async (participant) => {
            const { data: familyMembers } = await supabase
              .from("family_members")
              .select("id")
              .eq("user_id", participant.user_id);

            return {
              ...participant,
              familyMemberCount: familyMembers ? familyMembers.length : 0,
            };
          })
        );

        setParticipants(participantsWithFamily);
        return;
      }

      console.log("Found users:", usersData); // Debug log

      // Combine registration and user data
      const participantsWithUserInfo = registrations.map(reg => {
        const user = usersData.find(u => u.id === reg.user_id);
        return {
          ...reg,
          users: user || { email: 'Unknown', full_name: 'Unknown' }
        };
      });

      // Get family member counts for each participant
      const participantsWithFamily = await Promise.all(
        participantsWithUserInfo.map(async (participant) => {
          const { data: familyMembers } = await supabase
            .from("family_members")
            .select("id")
            .eq("user_id", participant.user_id);

          return {
            ...participant,
            familyMemberCount: familyMembers ? familyMembers.length : 0,
          };
        })
      );

      console.log("Final participants with family:", participantsWithFamily); // Debug log
      setParticipants(participantsWithFamily);
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
              {participants.some((p) => p.familyMemberCount > 0) && (
                <span style={{ color: "#3b82f6", fontWeight: "500" }}>
                  {" "}
                  +{" "}
                  {participants.reduce(
                    (sum, p) => sum + p.familyMemberCount,
                    0
                  )}{" "}
                  family members
                </span>
              )}
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
                    Family
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
                {participants.map((participant, index) => (
                  <tr
                    key={participant.user_id || index}
                    style={{ borderBottom: "1px solid #e5e7eb" }}
                  >
                    <td style={{ padding: "0.75rem" }}>
                      {participant.users?.email}
                    </td>
                    <td style={{ padding: "0.75rem" }}>
                      {participant.users?.full_name || "N/A"}
                    </td>
                    <td style={{ padding: "0.75rem" }}>
                      {participant.familyMemberCount > 0 ? (
                        <span
                          style={{
                            backgroundColor: "#dbeafe",
                            color: "#1e40af",
                            padding: "0.25rem 0.5rem",
                            borderRadius: "0.375rem",
                            fontSize: "0.75rem",
                            fontWeight: "500",
                          }}
                        >
                          👨‍👩‍👧‍👦 {participant.familyMemberCount}
                        </span>
                      ) : (
                        <span style={{ color: "#6b7280", fontSize: "0.75rem" }}>
                          None
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "0.75rem" }}>
                      {new Date(participant.created_at).toLocaleDateString()}
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
