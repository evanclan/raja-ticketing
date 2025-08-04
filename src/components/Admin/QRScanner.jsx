import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../../lib/supabase";

export default function QRScanner({ eventId, isOpen, onClose }) {
  const [scanning, setScanning] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [error, setError] = useState("");
  const [checkInResult, setCheckInResult] = useState(null);
  const [stats, setStats] = useState(null);
  const [QrScanner, setQrScanner] = useState(null);
  const videoRef = useRef(null);
  const scannerRef = useRef(null);

  // Load QrScanner dynamically
  useEffect(() => {
    const loadQrScanner = async () => {
      try {
        const QrScannerModule = await import("qr-scanner");
        setQrScanner(() => QrScannerModule.default);
      } catch (err) {
        console.error("Failed to load QR Scanner:", err);
        setError("QRスキャナーモジュールの読み込みに失敗しました");
      }
    };
    
    if (isOpen) {
      loadQrScanner();
    }
  }, [isOpen]);

  const fetchStats = useCallback(async () => {
    try {
      // Get check-in stats directly from Supabase
      const { data, error } = await supabase
        .from("registrations")
        .select("status, checked_in_at")
        .eq("event_id", eventId);

      if (error) throw error;

      const total = data.length;
      const checkedIn = data.filter((r) => r.checked_in_at !== null).length;
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
          console.log("🔍 QR Code Data:", qrCodeData);
        } catch {
          console.log("❌ Failed to parse QR data:", qrData);
          setCheckInResult({
            success: false,
            message: "無効なQRコード形式",
            error: "QRコードデータが有効なJSONではありません",
          });
          return;
        }

        const { eventId: qrEventId, userId } = qrCodeData;
        console.log("🎯 Scanning for Event ID:", qrEventId, "User ID:", userId);

        if (!qrEventId || !userId) {
          setCheckInResult({
            success: false,
            message: "無効なQRコード",
            error: "イベントIDまたはユーザーIDが不足しています",
          });
          return;
        }

        // Check if this QR code is for the current event being scanned
        if (qrEventId !== eventId) {
          setCheckInResult({
            success: false,
            message: "無効なQRコード",
            error: "このQRコードは現在のイベント用ではありません",
          });
          return;
        }

        // Verify the participant is registered for this event
        const { data: registration, error: fetchError } = await supabase
          .from("registrations")
          .select("id, status, checked_in_at, created_at")
          .eq("event_id", qrEventId)
          .eq("user_id", userId)
          .eq("status", "approved")
          .single();

        if (fetchError || !registration) {
          console.log("❌ Registration lookup failed:", fetchError?.message || "No registration found");
          setCheckInResult({
            success: false,
            message: "参加者が見つかりません",
            error: "この参加者の承認済み登録が見つかりません",
          });
          return;
        }

        console.log("✅ Found registration:", registration);

        // Get user details from auth since users table might not exist
        let userInfo;
        try {
          // Try users table first
          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("email, full_name")
            .eq("id", userId)
            .single();
          
          if (userError || !userData) {
            // Fallback: get user info from auth
            const { data: authUser } = await supabase.auth.admin.getUserById(userId);
            userInfo = {
              email: authUser?.user?.email || 'Unknown',
              full_name: authUser?.user?.user_metadata?.full_name || authUser?.user?.email || 'Unknown'
            };
          } else {
            userInfo = userData;
          }
        } catch (err) {
          // Final fallback
          userInfo = { email: 'Unknown', full_name: 'Unknown' };
        }

        // Add user info to registration
        registration.users = userInfo;

        if (registration.checked_in_at) {
          // Fetch family members for already checked in user too
          const { data: familyMembers } = await supabase
            .from("family_members")
            .select("full_name, age, relationship, notes")
            .eq("user_id", userId)
            .order("created_at", { ascending: true });

          setCheckInResult({
            success: false,
            message: "すでにチェックイン済み",
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
          message: "参加者確認",
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

  const populateEventParticipants = async () => {
    try {
      const now = new Date().toISOString();
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      // Get user details
      const userInfo = checkInResult.participant;
      const familyMembers = checkInResult.familyMembers || [];
      
      // Prepare participants data
      const participantsToInsert = [];
      
      // Add the registered user
      participantsToInsert.push({
        event_id: eventId,
        user_id: checkInResult.userId,
        registration_id: checkInResult.registrationId,
        full_name: userInfo.full_name || userInfo.email || 'Unknown',
        email: userInfo.email,
        age: null, // Age not typically stored for registered users
        participant_type: 'registered_user',
        relationship_to_user: null,
        primary_participant_name: null,
        checked_in_at: now,
        checked_in_by: currentUser?.id || null,
        check_in_method: 'qr_scanner'
      });
      
      // Add family members
      familyMembers.forEach(family => {
        participantsToInsert.push({
          event_id: eventId,
          user_id: null, // Family members don't have user accounts
          registration_id: checkInResult.registrationId,
          full_name: family.full_name,
          email: null, // Family members typically don't have separate emails
          age: family.age,
          participant_type: 'family_member',
          relationship_to_user: family.relationship,
          primary_participant_name: userInfo.full_name || userInfo.email || 'Unknown',
          checked_in_at: now,
          checked_in_by: currentUser?.id || null,
          check_in_method: 'qr_scanner',
          notes: family.notes
        });
      });
      
      // Insert all participants (ignore conflicts in case of duplicate check-ins)
      const { error: participantError } = await supabase
        .from("event_participants")
        .upsert(participantsToInsert, { 
          onConflict: 'event_id,registration_id,full_name',
          ignoreDuplicates: false 
        });
      
      if (participantError) {
        console.warn("Event participants table not available:", participantError.message);
        // Don't fail the check-in process if this table doesn't exist
      } else {
        console.log(`✅ Added ${participantsToInsert.length} participants to event roster`);
      }
      
    } catch (err) {
      console.warn("Failed to populate event participants:", err.message);
      // Don't fail the check-in process
    }
  };

  const startScanner = useCallback(async () => {
    try {
      setError("");

      if (!QrScanner) {
        setError("QR Scanner module not loaded yet");
        return;
      }

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
  }, [handleScanResult, QrScanner]);

  useEffect(() => {
    if (isOpen && eventId) {
      fetchStats();
    }
  }, [isOpen, eventId, fetchStats]);

  useEffect(() => {
    if (isOpen && videoRef.current && QrScanner) {
      startScanner();
    }
    return () => {
      stopScanner();
    };
  }, [isOpen, startScanner, QrScanner]);

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.destroy();
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const handleApproveEntrance = async () => {
    try {
      // Get current admin user for check-in tracking
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      // Create check-in record in the new table
      const checkInData = {
        event_id: eventId,
        user_id: checkInResult.userId,
        registration_id: checkInResult.registrationId,
        checked_in_at: new Date().toISOString(),
        checked_in_by: currentUser?.id || null,
        check_in_method: 'qr_scanner',
        participant_name: checkInResult.participant?.full_name || checkInResult.participant?.email || 'Unknown',
        participant_email: checkInResult.participant?.email || 'Unknown',
        family_members_count: checkInResult.familyMembers?.length || 0,
        status: 'active'
      };

      const { error: checkInError } = await supabase
        .from("event_checkins")
        .insert([checkInData]);

      if (checkInError) {
        console.warn("New check-ins table not available, using legacy method:", checkInError.message);
        
        // Fallback to old method if new table doesn't exist
        const { error: updateError } = await supabase
          .from("registrations")
          .update({
            checked_in_at: new Date().toISOString(),
            checked_in_by: currentUser?.id || null,
          })
          .eq("id", checkInResult.registrationId);

        if (updateError) {
          setError("Check-in failed: " + updateError.message);
          return;
        }
      } else {
        // Also update the registrations table for backward compatibility
        await supabase
          .from("registrations")
          .update({
            checked_in_at: new Date().toISOString(),
            checked_in_by: currentUser?.id || null,
          })
          .eq("id", checkInResult.registrationId);
      }

      // Populate the comprehensive event_participants table
      await populateEventParticipants();

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