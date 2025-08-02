import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import QRScanner from "./QRScanner";

export default function EventManagementPage({ eventId, onBack, currentUser }) {
  const [event, setEvent] = useState(null);
  const [stats, setStats] = useState({ 
    totalRegistered: 0, 
    totalCheckedIn: 0, 
    totalPending: 0,
    checkedInUsers: 0,
    totalFamilyMembers: 0
  });
  const [checkedInParticipants, setCheckedInParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [editingCheckIn, setEditingCheckIn] = useState(null);

  const fetchEventData = useCallback(async () => {
    if (!eventId) return;

    setLoading(true);
    setError("");

    try {
      // Get event details
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

      if (eventError) throw eventError;
      setEvent(eventData);

      // Get comprehensive stats using our new function
      const { data: statsData, error: statsError } = await supabase
        .rpc("get_event_checkin_stats", { target_event_id: eventId });

      if (statsError) {
        console.warn("Stats function not available, falling back to manual calculation");
        // Fallback to manual calculation if function doesn't exist
        await fetchStatsManually();
      } else if (statsData && statsData.length > 0) {
        const stats = statsData[0];
        const checkedInUsers = stats.total_checked_in || 0;
        const familyMembers = stats.total_family_members || 0;
        
        setStats({
          totalRegistered: stats.total_registered || 0,
          totalCheckedIn: checkedInUsers + familyMembers, // Include family members in total
          totalPending: stats.total_pending || 0,
          checkedInUsers: checkedInUsers,
          totalFamilyMembers: familyMembers
        });
      }

      // Get detailed check-in records
      const { data: checkInsData, error: checkInsError } = await supabase
        .from("event_checkins")
        .select(`
          id,
          user_id,
          checked_in_at,
          checked_in_by,
          check_in_method,
          participant_name,
          participant_email,
          family_members_count,
          notes,
          status
        `)
        .eq("event_id", eventId)
        .eq("status", "active")
        .order("checked_in_at", { ascending: false });

      if (checkInsError) {
        console.warn("Check-ins table might not exist, falling back to registrations");
        await fetchCheckInsFromRegistrations();
      } else {
        // Enhance check-in data with family member details
        const enhancedCheckIns = await Promise.all(
          (checkInsData || []).map(async (checkIn) => {
            try {
              // Get family members
              const { data: familyMembers } = await supabase
                .from("family_members")
                .select("full_name, age, relationship")
                .eq("user_id", checkIn.user_id)
                .order("created_at", { ascending: true });

              // Get admin who checked in
              let checkedInByName = "System";
              if (checkIn.checked_in_by) {
                const { data: adminData } = await supabase.auth.admin.getUserById(checkIn.checked_in_by);
                checkedInByName = adminData?.user?.email || "Unknown Admin";
              }

              return {
                ...checkIn,
                familyMembers: familyMembers || [],
                checkedInByName,
                checkedInTime: new Date(checkIn.checked_in_at).toLocaleString()
              };
            } catch (err) {
              console.error("Error enhancing check-in data:", err);
              return {
                ...checkIn,
                familyMembers: [],
                checkedInByName: "Unknown",
                checkedInTime: new Date(checkIn.checked_in_at).toLocaleString()
              };
            }
          })
        );

        setCheckedInParticipants(enhancedCheckIns);
      }

    } catch (err) {
      setError("Failed to load event data: " + err.message);
      console.error("Event data fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [eventId, refreshTrigger]);

  const fetchStatsManually = async () => {
    // Fallback stats calculation from registrations table
    const { data: registrations } = await supabase
      .from("registrations")
      .select("user_id, status")
      .eq("event_id", eventId);

    const totalRegistered = registrations?.filter(r => r.status === 'approved').length || 0;
    
    // Count checked-in from registrations table (old method)
    const { data: regWithCheckIn } = await supabase
      .from("registrations")
      .select("checked_in_at, user_id")
      .eq("event_id", eventId)
      .eq("status", "approved")
      .not("checked_in_at", "is", null);

    const checkedInUsers = regWithCheckIn?.length || 0;
    
    // Get family member counts for checked-in users
    let totalFamilyMembers = 0;
    if (regWithCheckIn && regWithCheckIn.length > 0) {
      const userIds = regWithCheckIn.map(r => r.user_id);
      const { data: familyData } = await supabase
        .from("family_members")
        .select("user_id")
        .in("user_id", userIds);
      
      totalFamilyMembers = familyData?.length || 0;
    }

    setStats({
      totalRegistered,
      totalCheckedIn: checkedInUsers + totalFamilyMembers, // Include family members
      totalPending: totalRegistered - checkedInUsers,
      checkedInUsers,
      totalFamilyMembers
    });
  };

  const fetchCheckInsFromRegistrations = async () => {
    // Fallback to registrations table if check-ins table doesn't exist
    const { data: registrations } = await supabase
      .from("registrations")
      .select("id, user_id, checked_in_at, checked_in_by, created_at")
      .eq("event_id", eventId)
      .eq("status", "approved")
      .not("checked_in_at", "is", null)
      .order("checked_in_at", { ascending: false });

    if (registrations && registrations.length > 0) {
      const enhancedData = await Promise.all(
        registrations.map(async (reg) => {
          try {
            // Get user info
            let userInfo;
            const { data: userData, error: userError } = await supabase
              .from("users")
              .select("email, full_name")
              .eq("id", reg.user_id)
              .single();

            if (userError || !userData) {
              const { data: authUser } = await supabase.auth.admin.getUserById(reg.user_id);
              userInfo = {
                email: authUser?.user?.email || "Unknown",
                full_name: authUser?.user?.user_metadata?.full_name || 
                          authUser?.user?.raw_user_meta_data?.full_name || 
                          authUser?.user?.email || "Unknown"
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
              id: reg.id,
              user_id: reg.user_id,
              participant_name: userInfo.full_name,
              participant_email: userInfo.email,
              checked_in_at: reg.checked_in_at,
              checked_in_by: reg.checked_in_by,
              check_in_method: "legacy",
              familyMembers: familyMembers || [],
              family_members_count: familyMembers?.length || 0,
              checkedInTime: new Date(reg.checked_in_at).toLocaleString(),
              status: "active"
            };
          } catch (err) {
            console.error("Error processing registration:", err);
            return null;
          }
        })
      );

      setCheckedInParticipants(enhancedData.filter(Boolean));
    }
  };

  useEffect(() => {
    fetchEventData();
  }, [fetchEventData]);

  const handleScannerClose = () => {
    setScannerOpen(false);
    // Refresh data after scanner closes
    setRefreshTrigger(prev => prev + 1);
  };

  const handleEditCheckIn = (checkIn) => {
    setEditingCheckIn(checkIn);
  };

  const handleSaveCheckIn = async (updatedCheckIn) => {
    try {
      const { error } = await supabase
        .from("event_checkins")
        .update({
          notes: updatedCheckIn.notes,
          updated_at: new Date().toISOString()
        })
        .eq("id", updatedCheckIn.id);

      if (error) throw error;

      setEditingCheckIn(null);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      setError("Failed to update check-in: " + err.message);
    }
  };

  const handleDeleteCheckIn = async (checkInId) => {
    if (!confirm("Are you sure you want to remove this check-in?")) return;

    try {
      const { error } = await supabase
        .from("event_checkins")
        .update({ status: "cancelled" })
        .eq("id", checkInId);

      if (error) throw error;

      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      setError("Failed to remove check-in: " + err.message);
    }
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
      hour12: true,
    });
  };

  if (!event) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <div style={{ fontSize: "1.125rem", color: "#6b7280" }}>
          Loading event...
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f9fafb", padding: "1rem" }}>
      {/* Header */}
      <div style={{ 
        maxWidth: "1200px", 
        margin: "0 auto",
        backgroundColor: "white",
        borderRadius: "0.5rem",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        marginBottom: "1.5rem"
      }}>
        <div style={{ padding: "1.5rem" }}>
          {/* Navigation */}
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center",
            marginBottom: "1.5rem"
          }}>
            <button
              onClick={onBack}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 1rem",
                backgroundColor: "#6b7280",
                color: "white",
                border: "none",
                borderRadius: "0.375rem",
                fontSize: "0.875rem",
                fontWeight: "500",
                cursor: "pointer"
              }}
            >
              ← Back to Events
            </button>
            
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                Event Manager: {currentUser?.email}
              </div>
            </div>
          </div>

          {/* Event Info */}
          <div style={{ marginBottom: "1.5rem" }}>
            <h1 style={{ 
              fontSize: "2rem", 
              fontWeight: "bold", 
              color: "#1f2937",
              margin: "0 0 0.5rem 0",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem"
            }}>
              🎉 {event.title}
            </h1>
            <div style={{ 
              color: "#6b7280", 
              fontSize: "1rem",
              display: "flex",
              gap: "2rem",
              flexWrap: "wrap"
            }}>
              <span>📅 {formatDateTime(event.event_date, event.event_time)}</span>
              <span>📍 {event.location}</span>
              <span>🎫 Capacity: {event.capacity}</span>
            </div>
          </div>

          {/* Stats Cards */}
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
            gap: "1rem",
            marginBottom: "1.5rem"
          }}>
            <div style={{
              backgroundColor: "#f0f9ff",
              padding: "1.25rem",
              borderRadius: "0.5rem",
              textAlign: "center",
              border: "1px solid #0ea5e9"
            }}>
              <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#0ea5e9" }}>
                {stats.totalRegistered}
              </div>
              <div style={{ fontSize: "0.875rem", color: "#6b7280", fontWeight: "500" }}>
                Total Registered
              </div>
            </div>

            <div style={{
              backgroundColor: "#f0fdf4",
              padding: "1.25rem",
              borderRadius: "0.5rem",
              textAlign: "center",
              border: "1px solid #22c55e"
            }}>
              <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#22c55e" }}>
                {stats.totalCheckedIn}
              </div>
              <div style={{ fontSize: "0.875rem", color: "#6b7280", fontWeight: "500" }}>
                Total Checked In
              </div>
              <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "0.25rem" }}>
                (includes family members)
              </div>
            </div>

            <div style={{
              backgroundColor: "#fffbeb",
              padding: "1.25rem",
              borderRadius: "0.5rem",
              textAlign: "center",
              border: "1px solid #f59e0b"
            }}>
              <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#f59e0b" }}>
                {stats.totalPending}
              </div>
              <div style={{ fontSize: "0.875rem", color: "#6b7280", fontWeight: "500" }}>
                Pending Check-ins
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ 
            display: "flex", 
            gap: "1rem", 
            justifyContent: "center",
            flexWrap: "wrap"
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
                gap: "0.5rem"
              }}
            >
              📱 QR Scanner
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
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Check-ins List */}
      <div style={{ 
        maxWidth: "1200px", 
        margin: "0 auto",
        backgroundColor: "white",
        borderRadius: "0.5rem",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
      }}>
        <div style={{ padding: "1.5rem" }}>
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

          <h2 style={{ 
            fontSize: "1.5rem", 
            fontWeight: "bold", 
            color: "#1f2937",
            marginBottom: "1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}>
            ✅ Checked-In Participants ({stats.checkedInUsers} users{stats.totalFamilyMembers > 0 ? ` + ${stats.totalFamilyMembers} family = ${stats.totalCheckedIn} total` : ``})
          </h2>

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
              <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>📱</div>
              <div style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "0.5rem" }}>
                No participants checked in yet
              </div>
              <div style={{ fontSize: "1rem" }}>
                Use the QR Scanner to check in participants as they arrive
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {checkedInParticipants.map((participant) => (
                <div
                  key={participant.id}
                  style={{
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "0.5rem",
                    padding: "1.25rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "1rem"
                  }}
                >
                  <div style={{ flex: 1 }}>
                    {/* Participant Info */}
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.75rem" }}>
                      <div>
                        <div style={{ 
                          fontWeight: "700", 
                          color: "#1f2937",
                          fontSize: "1.125rem"
                        }}>
                          {participant.participant_name}
                        </div>
                        <div style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                          {participant.participant_email}
                        </div>
                      </div>
                      <div style={{
                        backgroundColor: "#10b981",
                        color: "white",
                        padding: "0.25rem 0.75rem",
                        borderRadius: "0.375rem",
                        fontSize: "0.75rem",
                        fontWeight: "600"
                      }}>
                        ✓ CHECKED IN
                      </div>
                    </div>

                    {/* Check-in Details */}
                    <div style={{ 
                      display: "flex", 
                      gap: "1.5rem", 
                      fontSize: "0.8rem", 
                      color: "#6b7280",
                      marginBottom: "0.75rem",
                      flexWrap: "wrap"
                    }}>
                      <span>🕐 {participant.checkedInTime}</span>
                      <span>👤 By: {participant.checkedInByName || "System"}</span>
                      <span>📱 Method: {participant.check_in_method || "QR Scanner"}</span>
                      {participant.family_members_count > 0 && (
                        <span>👨‍👩‍👧‍👦 +{participant.family_members_count} family</span>
                      )}
                    </div>

                    {/* Family Members */}
                    {participant.familyMembers && participant.familyMembers.length > 0 && (
                      <div style={{ 
                        marginTop: "0.75rem",
                        padding: "0.75rem",
                        backgroundColor: "white",
                        borderRadius: "0.375rem",
                        border: "1px solid #e5e7eb"
                      }}>
                        <div style={{ 
                          fontSize: "0.875rem", 
                          fontWeight: "600", 
                          color: "#374151",
                          marginBottom: "0.5rem"
                        }}>
                          👨‍👩‍👧‍👦 Family Members ({participant.familyMembers.length}):
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.5rem" }}>
                          {participant.familyMembers.map((family, idx) => (
                            <div 
                              key={idx}
                              style={{ 
                                fontSize: "0.8rem", 
                                color: "#6b7280",
                                backgroundColor: "#f9fafb",
                                padding: "0.5rem",
                                borderRadius: "0.25rem"
                              }}
                            >
                              <strong>{family.full_name}</strong>
                              {family.age && ` (${family.age})`}
                              {family.relationship && (
                                <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                                  {family.relationship}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {participant.notes && (
                      <div style={{
                        marginTop: "0.75rem",
                        padding: "0.5rem",
                        backgroundColor: "#fffbeb",
                        borderRadius: "0.25rem",
                        fontSize: "0.875rem",
                        color: "#92400e"
                      }}>
                        📝 Note: {participant.notes}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      onClick={() => handleEditCheckIn(participant)}
                      style={{
                        padding: "0.5rem",
                        backgroundColor: "#3b82f6",
                        color: "white",
                        border: "none",
                        borderRadius: "0.25rem",
                        fontSize: "0.75rem",
                        cursor: "pointer"
                      }}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDeleteCheckIn(participant.id)}
                      style={{
                        padding: "0.5rem",
                        backgroundColor: "#ef4444",
                        color: "white",
                        border: "none",
                        borderRadius: "0.25rem",
                        fontSize: "0.75rem",
                        cursor: "pointer"
                      }}
                    >
                      🗑️ Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* QR Scanner */}
      <QRScanner
        eventId={eventId}
        isOpen={scannerOpen}
        onClose={handleScannerClose}
      />

      {/* Edit Check-in Modal */}
      {editingCheckIn && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2000
        }}>
          <div style={{
            backgroundColor: "white",
            borderRadius: "0.5rem",
            padding: "1.5rem",
            maxWidth: "500px",
            width: "90%"
          }}>
            <h3 style={{ marginBottom: "1rem", fontSize: "1.25rem", fontWeight: "bold" }}>
              Edit Check-in: {editingCheckIn.participant_name}
            </h3>
            
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>
                Notes:
              </label>
              <textarea
                value={editingCheckIn.notes || ""}
                onChange={(e) => setEditingCheckIn({...editingCheckIn, notes: e.target.value})}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                  minHeight: "100px",
                  fontSize: "0.875rem"
                }}
                placeholder="Add notes about this check-in..."
              />
            </div>

            <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
              <button
                onClick={() => setEditingCheckIn(null)}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#6b7280",
                  color: "white",
                  border: "none",
                  borderRadius: "0.375rem",
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveCheckIn(editingCheckIn)}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#10b981",
                  color: "white",
                  border: "none",
                  borderRadius: "0.375rem",
                  cursor: "pointer"
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}