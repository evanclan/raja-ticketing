import { useState, useEffect, useRef } from "react";
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
  }, [isOpen, eventId]);

  useEffect(() => {
    if (isOpen && videoRef.current) {
      startScanner();
    }
    return () => {
      stopScanner();
    };
  }, [isOpen]);

  const fetchStats = async () => {
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
  };

  const startScanner = async () => {
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
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.destroy();
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const handleScanResult = async (qrData) => {
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

      const response = await fetch(
        `${
          import.meta.env.VITE_API_BASE_URL || "http://localhost:3001"
        }/api/check-in/verify`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ qrData }),
        }
      );

      const result = await response.json();
      setCheckInResult(result);

      // Update stats after check-in
      if (result.success) {
        fetchStats();
      }

      // Resume scanning after 3 seconds
      setTimeout(() => {
        if (scannerRef.current) {
          scannerRef.current.start();
        }
        setLastResult(null);
      }, 3000);
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
                {stats.approved}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                Approved
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
                {stats.checkInRate}%
              </div>
              <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Rate</div>
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
            {checkInResult.success ? (
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
                  {checkInResult.participant.name} (
                  {checkInResult.participant.email})
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
                  {checkInResult.participant.name}
                </div>
                <div style={{ color: "#a16207", fontSize: "0.75rem" }}>
                  Checked in:{" "}
                  {new Date(
                    checkInResult.participant.checkedInAt
                  ).toLocaleString()}
                </div>
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
