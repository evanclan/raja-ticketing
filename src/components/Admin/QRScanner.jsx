import { useState, useEffect, useRef, useCallback } from "react";
import QrScanner from "qr-scanner";
import { supabase } from "../../lib/supabase";

export default function QRScanner({ eventId, isOpen, onClose }) {
  const [scanning, setScanning] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [error, setError] = useState("");
  const [checkInResult, setCheckInResult] = useState(null);
  const [stats, setStats] = useState(null);
  const videoRef = useRef(null);
  const scannerRef = useRef(null);

  useEffect(() => {
    if (isOpen && eventId) {
      fetchStats();
    }
  }, [isOpen, eventId, fetchStats]);

  useEffect(() => {
    if (isOpen && videoRef.current) {
      startScanner();
    }
    return () => {
      stopScanner();
    };
  }, [isOpen, startScanner]);

  const fetchStats = useCallback(async () => {
    try {
      // Get check-in stats directly from Supabase
      const { data, error } = await supabase
        .from("registrations")
        .select("status, checked_in")
        .eq("event_id", eventId);

      if (error) throw error;

      const total = data.length;
      const checkedIn = data.filter((r) => r.checked_in).length;
      const pending = total - checkedIn;

      setStats({
        total,
        checkedIn,
        pending,
      });
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  }, [eventId]);

  const startScanner = useCallback(async () => {
    try {
      setError("");

      if (scannerRef.current) {
        scannerRef.current.destroy();
      }

      const scanner = new QrScanner(
        videoRef.current,
        (result) => handleScanResult(result.data),
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: "environment", // Use back camera on mobile
        }
      );

      scannerRef.current = scanner;
      await scanner.start();
      setScanning(true);
    } catch (err) {
      console.error("Scanner error:", err);
      setError("Failed to start camera. Please check permissions.");
    }
  }, [handleScanResult]);

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.destroy();
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const handleScanResult = useCallback(
    async (qrData) => {
      // Prevent duplicate scans
      if (qrData === lastResult) return;
      setLastResult(qrData);

      // Pause scanning temporarily
      if (scannerRef.current) {
        scannerRef.current.pause();
      }

      try {
        setCheckInResult(null);
        setError("");

        // Parse QR code data and verify check-in directly with Supabase
        let qrCodeData;
        try {
          qrCodeData = JSON.parse(qrData);
        } catch {
          setCheckInResult({
            success: false,
            message: "Invalid QR code format",
            error: "QR code data is not valid JSON",
          });
          return;
        }

        const { eventId: qrEventId, userId } = qrCodeData;

        if (!qrEventId || !userId) {
          setCheckInResult({
            success: false,
            message: "Invalid QR code",
            error: "Missing event ID or user ID",
          });
          return;
        }

        // Check if this QR code is for the current event being scanned
        if (qrEventId !== eventId) {
          setCheckInResult({
            success: false,
            message: "Invalid QR code",
            error: "This QR code is not for the current event",
          });
          return;
        }

        // Verify the participant is registered for this event
        const { data: registration, error: fetchError } = await supabase
          .from("registrations")
          .select(
            `
          id,
          status,
          checked_in,
          created_at,
          users!inner(email, full_name)
        `
          )
          .eq("event_id", qrEventId)
          .eq("user_id", userId)
          .eq("status", "approved")
          .single();

        if (fetchError || !registration) {
          setCheckInResult({
            success: false,
            message: "Participant not found",
            error: "No approved registration found for this participant",
          });
          return;
        }

        if (registration.checked_in) {
          // Fetch family members for already checked in user too
          const { data: familyMembers } = await supabase
            .from("family_members")
            .select("full_name, age, relationship, notes")
            .eq("user_id", userId)
            .order("created_at", { ascending: true });

          setCheckInResult({
            success: false,
            message: "Already checked in",
            participant: registration.users,
            familyMembers: familyMembers || [],
            registrationDate: new Date(
              registration.created_at
            ).toLocaleDateString(),
            timestamp: new Date().toLocaleString(),
            alreadyCheckedIn: true,
          });
          return;
        }

        // Fetch family members for this user
        const { data: familyMembers } = await supabase
          .from("family_members")
          .select("full_name, age, relationship, notes")
          .eq("user_id", userId)
          .order("created_at", { ascending: true });

        // Show participant details for admin approval (don't auto check-in)
        setCheckInResult({
          success: null, // null means pending approval
          message: "Participant verification",
          participant: registration.users,
          familyMembers: familyMembers || [],
          registrationDate: new Date(
            registration.created_at
          ).toLocaleDateString(),
          registrationId: registration.id,
          userId: userId,
          pendingApproval: true,
        });

        // Don't auto-resume scanning - wait for admin decision
      } catch (err) {
        setError("Check-in verification failed: " + err.message);
        // Resume scanning after error
        setTimeout(() => {
          if (scannerRef.current) {
            scannerRef.current.start();
          }
          setLastResult(null);
        }, 2000);
      }
    },
    [eventId, lastResult]
  );

  const handleApproveEntrance = async () => {
    try {
      const { error: updateError } = await supabase
        .from("registrations")
        .update({
          checked_in: true,
          checked_in_at: new Date().toISOString(),
        })
        .eq("id", checkInResult.registrationId);

      if (updateError) {
        setError("Check-in failed: " + updateError.message);
        return;
      }

      // Update result to show success
      setCheckInResult({
        ...checkInResult,
        success: true,
        message: "Entrance approved - Check-in successful!",
        timestamp: new Date().toLocaleString(),
        pendingApproval: false,
      });

      // Update stats after successful check-in
      fetchStats();

      // Resume scanning after 3 seconds
      setTimeout(() => {
        if (scannerRef.current) {
          scannerRef.current.start();
        }
        setLastResult(null);
      }, 3000);
    } catch (err) {
      setError("Failed to approve entrance: " + err.message);
    }
  };

  const handleRejectEntrance = () => {
    // Update result to show rejection
    setCheckInResult({
      ...checkInResult,
      success: false,
      message: "Entrance rejected by admin",
      pendingApproval: false,
    });

    // Resume scanning after 2 seconds
    setTimeout(() => {
      if (scannerRef.current) {
        scannerRef.current.start();
      }
      setLastResult(null);
    }, 2000);
  };

  const handleClose = () => {
    stopScanner();
    onClose();
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
        backgroundColor: "rgba(0,0,0,0.9)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: "1rem",
          padding: "1.5rem",
          maxWidth: 500,
          width: "95%",
          maxHeight: "95vh",
          overflow: "auto",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <h3
            style={{
              fontSize: "1.25rem",
              fontWeight: "bold",
              color: "#1f2937",
              marginBottom: "0.5rem",
            }}
          >
            📱 QR Code Scanner
          </h3>
          <p style={{ color: "#6b7280", fontSize: "0.9rem" }}>
            Point camera at participant's QR code
          </p>
        </div>

        {/* Stats */}
        {stats && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "0.75rem",
              marginBottom: "1.5rem",
            }}
          >
            <div
              style={{
                textAlign: "center",
                padding: "0.75rem",
                backgroundColor: "#f3f4f6",
                borderRadius: "0.5rem",
              }}
            >
              <div
                style={{
                  fontSize: "1.5rem",
                  fontWeight: "bold",
                  color: "#059669",
                }}
              >
                {stats.total}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Total</div>
            </div>
            <div
              style={{
                textAlign: "center",
                padding: "0.75rem",
                backgroundColor: "#f3f4f6",
                borderRadius: "0.5rem",
              }}
            >
              <div
                style={{
                  fontSize: "1.5rem",
                  fontWeight: "bold",
                  color: "#3b82f6",
                }}
              >
                {stats.checkedIn}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                Checked In
              </div>
            </div>
            <div
              style={{
                textAlign: "center",
                padding: "0.75rem",
                backgroundColor: "#f3f4f6",
                borderRadius: "0.5rem",
              }}
            >
              <div
                style={{
                  fontSize: "1.5rem",
                  fontWeight: "bold",
                  color: "#f59e0b",
                }}
              >
                {stats.pending}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                Pending
              </div>
            </div>
          </div>
        )}

        {/* Camera View */}
        <div
          style={{
            position: "relative",
            backgroundColor: "#000",
            borderRadius: "0.75rem",
            overflow: "hidden",
            marginBottom: "1.5rem",
            aspectRatio: "4/3",
          }}
        >
          <video
            ref={videoRef}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
          {!scanning && (
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                color: "white",
                textAlign: "center",
              }}
            >
              <div>📷</div>
              <div style={{ fontSize: "0.875rem", marginTop: "0.5rem" }}>
                Starting camera...
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        {checkInResult && (
          <div style={{ marginBottom: "1.5rem" }}>
            {checkInResult.success === true ? (
              <div
                style={{
                  padding: "1rem",
                  backgroundColor: "#ecfdf5",
                  border: "2px solid #10b981",
                  borderRadius: "0.75rem",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
                  ✅
                </div>
                <div
                  style={{
                    fontWeight: "600",
                    color: "#047857",
                    marginBottom: "0.5rem",
                  }}
                >
                  Check-in Successful!
                </div>
                <div style={{ color: "#059669", fontSize: "0.875rem" }}>
                  {checkInResult.participant.full_name ||
                    checkInResult.participant.name}{" "}
                  ({checkInResult.participant.email})
                </div>
                <div
                  style={{
                    color: "#047857",
                    fontSize: "0.75rem",
                    marginTop: "0.5rem",
                  }}
                >
                  Registered: {checkInResult.registrationDate}
                </div>
                {checkInResult.familyMembers &&
                  checkInResult.familyMembers.length > 0 && (
                    <div
                      style={{
                        marginTop: "1rem",
                        padding: "0.75rem",
                        backgroundColor: "#f0fdf4",
                        borderRadius: "0.5rem",
                        border: "1px solid #bbf7d0",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.875rem",
                          fontWeight: "600",
                          color: "#166534",
                          marginBottom: "0.5rem",
                        }}
                      >
                        👨‍👩‍👧‍👦 Family Members ({checkInResult.familyMembers.length}
                        ):
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#15803d" }}>
                        {checkInResult.familyMembers.map((member, index) => (
                          <div key={index} style={{ marginBottom: "0.25rem" }}>
                            • {member.full_name}
                            {member.age && ` (${member.age})`}
                            {member.relationship && ` - ${member.relationship}`}
                            {member.notes && (
                              <div
                                style={{
                                  fontSize: "0.7rem",
                                  color: "#16a34a",
                                  marginLeft: "0.5rem",
                                }}
                              >
                                Note: {member.notes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            ) : checkInResult.pendingApproval ? (
              <div
                style={{
                  padding: "1rem",
                  backgroundColor: "#fef3c7",
                  border: "2px solid #3b82f6",
                  borderRadius: "0.75rem",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
                  🔍
                </div>
                <div
                  style={{
                    fontWeight: "600",
                    color: "#1d4ed8",
                    marginBottom: "1rem",
                  }}
                >
                  Participant Verification
                </div>

                {/* Participant Info */}
                <div
                  style={{
                    backgroundColor: "#f8fafc",
                    borderRadius: "0.5rem",
                    padding: "1rem",
                    marginBottom: "1rem",
                    textAlign: "left",
                  }}
                >
                  <div
                    style={{
                      fontWeight: "600",
                      color: "#374151",
                      marginBottom: "0.5rem",
                    }}
                  >
                    👤 Participant Details:
                  </div>
                  <div
                    style={{
                      color: "#6b7280",
                      fontSize: "0.875rem",
                      marginBottom: "0.25rem",
                    }}
                  >
                    <strong>Name:</strong>{" "}
                    {checkInResult.participant.full_name ||
                      checkInResult.participant.name}
                  </div>
                  <div
                    style={{
                      color: "#6b7280",
                      fontSize: "0.875rem",
                      marginBottom: "0.25rem",
                    }}
                  >
                    <strong>Email:</strong> {checkInResult.participant.email}
                  </div>
                  <div style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                    <strong>Registered:</strong>{" "}
                    {checkInResult.registrationDate}
                  </div>
                </div>

                {/* Family Members */}
                {checkInResult.familyMembers &&
                  checkInResult.familyMembers.length > 0 && (
                    <div
                      style={{
                        backgroundColor: "#f0f9ff",
                        borderRadius: "0.5rem",
                        padding: "1rem",
                        marginBottom: "1rem",
                        textAlign: "left",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.875rem",
                          fontWeight: "600",
                          color: "#1e40af",
                          marginBottom: "0.5rem",
                        }}
                      >
                        👨‍👩‍👧‍👦 Family Members ({checkInResult.familyMembers.length}
                        ):
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#1e40af" }}>
                        {checkInResult.familyMembers.map((member, index) => (
                          <div
                            key={index}
                            style={{
                              marginBottom: "0.5rem",
                              padding: "0.25rem",
                              backgroundColor: "#dbeafe",
                              borderRadius: "0.25rem",
                            }}
                          >
                            <div>
                              <strong>{member.full_name}</strong>
                            </div>
                            {member.age && <div>Age: {member.age}</div>}
                            {member.relationship && (
                              <div>Relationship: {member.relationship}</div>
                            )}
                            {member.notes && (
                              <div
                                style={{
                                  fontSize: "0.7rem",
                                  color: "#3730a3",
                                  fontStyle: "italic",
                                }}
                              >
                                Note: {member.notes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Approval Buttons */}
                <div
                  style={{
                    display: "flex",
                    gap: "0.75rem",
                    justifyContent: "center",
                  }}
                >
                  <button
                    onClick={handleApproveEntrance}
                    style={{
                      padding: "0.75rem 1.5rem",
                      backgroundColor: "#10b981",
                      color: "white",
                      border: "none",
                      borderRadius: "0.5rem",
                      fontWeight: "600",
                      cursor: "pointer",
                      fontSize: "0.875rem",
                    }}
                  >
                    ✅ Approve Entrance
                  </button>
                  <button
                    onClick={handleRejectEntrance}
                    style={{
                      padding: "0.75rem 1.5rem",
                      backgroundColor: "#ef4444",
                      color: "white",
                      border: "none",
                      borderRadius: "0.5rem",
                      fontWeight: "600",
                      cursor: "pointer",
                      fontSize: "0.875rem",
                    }}
                  >
                    ❌ Reject Entrance
                  </button>
                </div>
              </div>
            ) : checkInResult.alreadyCheckedIn ? (
              <div
                style={{
                  padding: "1rem",
                  backgroundColor: "#fef3c7",
                  border: "2px solid #f59e0b",
                  borderRadius: "0.75rem",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
                  ⚠️
                </div>
                <div
                  style={{
                    fontWeight: "600",
                    color: "#92400e",
                    marginBottom: "0.5rem",
                  }}
                >
                  Already Checked In
                </div>
                <div style={{ color: "#a16207", fontSize: "0.875rem" }}>
                  {checkInResult.participant.full_name ||
                    checkInResult.participant.name}{" "}
                  ({checkInResult.participant.email})
                </div>
                <div style={{ color: "#a16207", fontSize: "0.75rem" }}>
                  Registered: {checkInResult.registrationDate}
                </div>
                <div style={{ color: "#a16207", fontSize: "0.75rem" }}>
                  Checked in: {checkInResult.timestamp}
                </div>
                {checkInResult.familyMembers &&
                  checkInResult.familyMembers.length > 0 && (
                    <div
                      style={{
                        marginTop: "1rem",
                        padding: "0.75rem",
                        backgroundColor: "#fef7cd",
                        borderRadius: "0.5rem",
                        border: "1px solid #fde047",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.875rem",
                          fontWeight: "600",
                          color: "#a16207",
                          marginBottom: "0.5rem",
                        }}
                      >
                        👨‍👩‍👧‍👦 Family Members ({checkInResult.familyMembers.length}
                        ):
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#92400e" }}>
                        {checkInResult.familyMembers.map((member, index) => (
                          <div key={index} style={{ marginBottom: "0.25rem" }}>
                            • {member.full_name}
                            {member.age && ` (${member.age})`}
                            {member.relationship && ` - ${member.relationship}`}
                            {member.notes && (
                              <div
                                style={{
                                  fontSize: "0.7rem",
                                  color: "#a16207",
                                  marginLeft: "0.5rem",
                                }}
                              >
                                Note: {member.notes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            ) : (
              <div
                style={{
                  padding: "1rem",
                  backgroundColor: "#fef2f2",
                  border: "2px solid #ef4444",
                  borderRadius: "0.75rem",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
                  ❌
                </div>
                <div
                  style={{
                    fontWeight: "600",
                    color: "#991b1b",
                    marginBottom: "0.5rem",
                  }}
                >
                  Invalid QR Code
                </div>
                <div style={{ color: "#dc2626", fontSize: "0.875rem" }}>
                  {checkInResult.error || "Not authorized for this event"}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            style={{
              padding: "1rem",
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "0.5rem",
              marginBottom: "1.5rem",
              color: "#991b1b",
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}

        {/* Controls */}
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            justifyContent: "center",
          }}
        >
          <button
            onClick={fetchStats}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "0.5rem",
              fontWeight: "500",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            🔄 Refresh Stats
          </button>
          <button
            onClick={handleClose}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: "#6b7280",
              color: "white",
              border: "none",
              borderRadius: "0.5rem",
              fontWeight: "500",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            Close Scanner
          </button>
        </div>
      </div>
    </div>
  );
}
