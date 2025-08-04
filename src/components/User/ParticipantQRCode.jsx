import { useState, useEffect } from "react";
import QRCode from "qrcode";

export default function ParticipantQRCode({ event, user, isOpen, onClose }) {
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && event && user) {
      fetchQRCode();
    }
  }, [isOpen, event, user]);

  const fetchQRCode = async () => {
    setLoading(true);
    setError("");
    try {
      // Generate QR code directly in frontend
      const qrData = JSON.stringify({
        eventId: event.id,
        userId: user.id,
        timestamp: Date.now(),
        eventTitle: event.title,
        userName: user.full_name || user.email,
      });

      const qrCodeDataURL = await QRCode.toDataURL(qrData, {
        width: 256,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });

      setQrCode({ qrCode: qrCodeDataURL });
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
      onClick={onClose}
    >
      <div
        style={{
          background: "white",
          borderRadius: "1rem",
          padding: "2rem",
          maxWidth: 400,
          width: "90%",
          maxHeight: "90vh",
          overflow: "auto",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
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
            🎫 イベントチケット
          </h3>
          <p style={{ color: "#6b7280", fontSize: "0.9rem" }}>
            イベント会場の入口でこのQRコードを見せてください
          </p>
        </div>

        {/* Event Info */}
        <div
          style={{
            backgroundColor: "#f3f4f6",
            borderRadius: "0.5rem",
            padding: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          <h4
            style={{
              fontWeight: "600",
              color: "#374151",
              marginBottom: "0.5rem",
            }}
          >
            {event.title}
          </h4>
          <p
            style={{
              color: "#6b7280",
              fontSize: "0.875rem",
              marginBottom: "0.25rem",
            }}
          >
            📅 {event.event_date} at {event.event_time}
          </p>
          <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>
            📍 {event.location}
          </p>
        </div>

        {/* QR Code */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <div>Generating your QR code...</div>
          </div>
        ) : error ? (
          <div
            style={{
              color: "#dc2626",
              textAlign: "center",
              padding: "2rem",
              backgroundColor: "#fef2f2",
              borderRadius: "0.5rem",
              marginBottom: "1rem",
            }}
          >
            ❌ {error}
          </div>
        ) : qrCode ? (
          <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
            <div
              style={{
                display: "inline-block",
                padding: "1rem",
                backgroundColor: "white",
                borderRadius: "0.75rem",
                border: "3px solid #10b981",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              }}
            >
              <img
                src={qrCode.qrCode}
                alt="Event QR Code"
                style={{
                  width: "250px",
                  height: "250px",
                  display: "block",
                }}
              />
            </div>
            <p
              style={{
                color: "#059669",
                fontWeight: "500",
                marginTop: "1rem",
                fontSize: "0.875rem",
              }}
            >
              ✅ 有効な入場コード
            </p>
          </div>
        ) : null}

        {/* Instructions */}
        <div
          style={{
            backgroundColor: "#ecfdf5",
            border: "1px solid #10b981",
            borderRadius: "0.5rem",
            padding: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          <h5
            style={{
              fontWeight: "600",
              color: "#047857",
              marginBottom: "0.5rem",
            }}
          >
            📱 使用方法:
          </h5>
          <ul
            style={{
              color: "#065f46",
              fontSize: "0.875rem",
              paddingLeft: "1rem",
              margin: 0,
            }}
          >
            <li>このQRコードを携帯電話に保存してください</li>
            <li>イベント開始15分前に到着してください</li>
            <li>入口でQRコードを見せてください</li>
            <li>携帯電話の充電を忘れずに！</li>
          </ul>
        </div>

        {/* Actions */}
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            justifyContent: "center",
          }}
        >
          <button
            onClick={() => {
              if (qrCode) {
                // Create download link for QR code
                const link = document.createElement("a");
                link.download = `${event.title}-ticket.png`;
                link.href = qrCode.qrCode;
                link.click();
              }
            }}
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
            disabled={!qrCode}
          >
            📥 ダウンロード
          </button>
          <button
            onClick={onClose}
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
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
