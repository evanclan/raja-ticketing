import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function CreateEventForm({ onEventCreated, onCancel }) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    event_date: "",
    event_time: "",
    location: "",
    price: "",
    capacity: "",
    image_url: "",
    start_registration: "",
    end_registration: "",
    ticket_photo_url: "",
    additional_info: "",
    category: "",
    organizer_name: "",
    organizer_contact: "",
    venue_details: "",
    dress_code: "",
    age_restriction: "",
    gallery_images: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleGalleryImageAdd = () => {
    const newImageUrl = prompt("Enter image URL for gallery:");
    if (newImageUrl && newImageUrl.trim()) {
      setFormData((prev) => ({
        ...prev,
        gallery_images: [...prev.gallery_images, newImageUrl.trim()],
      }));
    }
  };

  const handleGalleryImageRemove = (index) => {
    setFormData((prev) => ({
      ...prev,
      gallery_images: prev.gallery_images.filter((_, i) => i !== index),
    }));
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      setError("イベントタイトルは必須です");
      return false;
    }
    if (!formData.description.trim()) {
      setError("イベントの説明は必須です");
      return false;
    }
    if (!formData.event_date) {
      setError("イベント日は必須です");
      return false;
    }
    if (!formData.event_time) {
      setError("イベント時間は必須です");
      return false;
    }
    if (!formData.location.trim()) {
      setError("イベント会場は必須です");
      return false;
    }
    if (!formData.price || parseFloat(formData.price) < 0) {
      setError("有効な価格が必要です");
      return false;
    }
    if (!formData.capacity || parseInt(formData.capacity) < 1) {
      setError("有効な定員が必要です");
      return false;
    }
    if (formData.start_registration && formData.end_registration) {
      const startDate = new Date(formData.start_registration);
      const endDate = new Date(formData.end_registration);
      if (startDate >= endDate) {
        setError("登録終了日は登録開始日より後である必要があります");
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      const eventData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        event_date: formData.event_date,
        event_time: formData.event_time,
        location: formData.location.trim(),
        price: parseFloat(formData.price),
        capacity: parseInt(formData.capacity),
        image_url: formData.image_url.trim() || null,
        start_registration: formData.start_registration || null,
        end_registration: formData.end_registration || null,
        ticket_photo_url: formData.ticket_photo_url.trim() || null,
        additional_info: formData.additional_info.trim() || null,
        category: formData.category.trim() || null,
        organizer_name: formData.organizer_name.trim() || null,
        organizer_contact: formData.organizer_contact.trim() || null,
        venue_details: formData.venue_details.trim() || null,
        dress_code: formData.dress_code.trim() || null,
        age_restriction: formData.age_restriction.trim() || null,
        gallery_images:
          formData.gallery_images.length > 0 ? formData.gallery_images : null,
        status: "active",
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("events")
        .insert([eventData])
        .select()
        .single();

      if (error) {
        setError("イベント作成エラー: " + error.message);
      } else {
        setSuccess("イベントが正常に作成されました！");
        onEventCreated(data);
        // Reset form
        setFormData({
          title: "",
          description: "",
          event_date: "",
          event_time: "",
          location: "",
          price: "",
          capacity: "",
          image_url: "",
          start_registration: "",
          end_registration: "",
          ticket_photo_url: "",
          additional_info: "",
          category: "",
          organizer_name: "",
          organizer_contact: "",
          venue_details: "",
          dress_code: "",
          age_restriction: "",
          gallery_images: [],
        });
      }
    } catch (err) {
      setError("予期しないエラーが発生しました: " + (err?.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "0.5rem",
        padding: "2rem",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        maxWidth: "800px",
        margin: "0 auto",
      }}
    >
      <h3
        style={{
          fontSize: "1.5rem",
          fontWeight: "bold",
          color: "#1f2937",
          marginBottom: "1.5rem",
          textAlign: "center",
        }}
      >
        新しいイベントを作成
      </h3>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
      >
        {/* Basic Information Section */}
        <div
          style={{ borderBottom: "1px solid #e5e7eb", paddingBottom: "1rem" }}
        >
          <h4
            style={{
              fontSize: "1.1rem",
              fontWeight: "600",
              color: "#374151",
              marginBottom: "1rem",
            }}
          >
            Basic Information
          </h4>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem",
            }}
          >
            {/* Event Title */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label
                htmlFor="title"
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "0.5rem",
                }}
              >
                Event Title *
              </label>
              <input
                id="title"
                name="title"
                type="text"
                value={formData.title}
                onChange={handleChange}
                required
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                  fontSize: "1rem",
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
                placeholder="Enter event title"
              />
            </div>

            {/* Category */}
            <div>
              <label
                htmlFor="category"
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "0.5rem",
                }}
              >
                Category
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                  fontSize: "1rem",
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
              >
                <option value="">Select category</option>
                <option value="concert">Concert</option>
                <option value="conference">Conference</option>
                <option value="workshop">Workshop</option>
                <option value="sports">Sports</option>
                <option value="theater">Theater</option>
                <option value="exhibition">Exhibition</option>
                <option value="party">Party</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Event Date */}
            <div>
              <label
                htmlFor="event_date"
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "0.5rem",
                }}
              >
                Event Date *
              </label>
              <input
                id="event_date"
                name="event_date"
                type="date"
                value={formData.event_date}
                onChange={handleChange}
                required
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                  fontSize: "1rem",
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
              />
            </div>

            {/* Event Time */}
            <div>
              <label
                htmlFor="event_time"
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "0.5rem",
                }}
              >
                Event Time *
              </label>
              <input
                id="event_time"
                name="event_time"
                type="time"
                value={formData.event_time}
                onChange={handleChange}
                required
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                  fontSize: "1rem",
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
              />
            </div>

            {/* Location */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label
                htmlFor="location"
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "0.5rem",
                }}
              >
                Location *
              </label>
              <input
                id="location"
                name="location"
                type="text"
                value={formData.location}
                onChange={handleChange}
                required
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                  fontSize: "1rem",
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
                placeholder="Enter event location"
              />
            </div>

            {/* Venue Details */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label
                htmlFor="venue_details"
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "0.5rem",
                }}
              >
                Venue Details
              </label>
              <textarea
                id="venue_details"
                name="venue_details"
                value={formData.venue_details}
                onChange={handleChange}
                rows="2"
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                  fontSize: "1rem",
                  outline: "none",
                  transition: "border-color 0.2s",
                  resize: "vertical",
                }}
                placeholder="Additional venue information, parking details, etc."
              />
            </div>
          </div>
        </div>

        {/* Registration Section */}
        <div
          style={{ borderBottom: "1px solid #e5e7eb", paddingBottom: "1rem" }}
        >
          <h4
            style={{
              fontSize: "1.1rem",
              fontWeight: "600",
              color: "#374151",
              marginBottom: "1rem",
            }}
          >
            Registration & Pricing
          </h4>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem",
            }}
          >
            {/* Start Registration */}
            <div>
              <label
                htmlFor="start_registration"
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "0.5rem",
                }}
              >
                Start Registration Date
              </label>
              <input
                id="start_registration"
                name="start_registration"
                type="datetime-local"
                value={formData.start_registration}
                onChange={handleChange}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                  fontSize: "1rem",
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
              />
            </div>

            {/* End Registration */}
            <div>
              <label
                htmlFor="end_registration"
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "0.5rem",
                }}
              >
                End Registration Date
              </label>
              <input
                id="end_registration"
                name="end_registration"
                type="datetime-local"
                value={formData.end_registration}
                onChange={handleChange}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                  fontSize: "1rem",
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
              />
            </div>

            {/* Price */}
            <div>
              <label
                htmlFor="price"
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "0.5rem",
                }}
              >
                Ticket Price ($) *
              </label>
              <input
                id="price"
                name="price"
                type="number"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={handleChange}
                required
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                  fontSize: "1rem",
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
                placeholder="0.00"
              />
            </div>

            {/* Capacity */}
            <div>
              <label
                htmlFor="capacity"
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "0.5rem",
                }}
              >
                Capacity *
              </label>
              <input
                id="capacity"
                name="capacity"
                type="number"
                min="1"
                value={formData.capacity}
                onChange={handleChange}
                required
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                  fontSize: "1rem",
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
                placeholder="Number of tickets"
              />
            </div>
          </div>
        </div>

        {/* Organizer Information */}
        <div
          style={{ borderBottom: "1px solid #e5e7eb", paddingBottom: "1rem" }}
        >
          <h4
            style={{
              fontSize: "1.1rem",
              fontWeight: "600",
              color: "#374151",
              marginBottom: "1rem",
            }}
          >
            Organizer Information
          </h4>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem",
            }}
          >
            {/* Organizer Name */}
            <div>
              <label
                htmlFor="organizer_name"
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "0.5rem",
                }}
              >
                Organizer Name
              </label>
              <input
                id="organizer_name"
                name="organizer_name"
                type="text"
                value={formData.organizer_name}
                onChange={handleChange}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                  fontSize: "1rem",
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
                placeholder="Organizer or company name"
              />
            </div>

            {/* Organizer Contact */}
            <div>
              <label
                htmlFor="organizer_contact"
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "0.5rem",
                }}
              >
                Contact Information
              </label>
              <input
                id="organizer_contact"
                name="organizer_contact"
                type="text"
                value={formData.organizer_contact}
                onChange={handleChange}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                  fontSize: "1rem",
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
                placeholder="Email or phone number"
              />
            </div>
          </div>
        </div>

        {/* Event Details */}
        <div
          style={{ borderBottom: "1px solid #e5e7eb", paddingBottom: "1rem" }}
        >
          <h4
            style={{
              fontSize: "1.1rem",
              fontWeight: "600",
              color: "#374151",
              marginBottom: "1rem",
            }}
          >
            Event Details
          </h4>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem",
            }}
          >
            {/* Dress Code */}
            <div>
              <label
                htmlFor="dress_code"
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "0.5rem",
                }}
              >
                Dress Code
              </label>
              <input
                id="dress_code"
                name="dress_code"
                type="text"
                value={formData.dress_code}
                onChange={handleChange}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                  fontSize: "1rem",
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
                placeholder="e.g., Formal, Casual, Black Tie"
              />
            </div>

            {/* Age Restriction */}
            <div>
              <label
                htmlFor="age_restriction"
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "0.5rem",
                }}
              >
                Age Restriction
              </label>
              <input
                id="age_restriction"
                name="age_restriction"
                type="text"
                value={formData.age_restriction}
                onChange={handleChange}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                  fontSize: "1rem",
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
                placeholder="e.g., 18+, All ages"
              />
            </div>

            {/* Description */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label
                htmlFor="description"
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "0.5rem",
                }}
              >
                Event Description *
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows="4"
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                  fontSize: "1rem",
                  outline: "none",
                  transition: "border-color 0.2s",
                  resize: "vertical",
                }}
                placeholder="Describe your event in detail..."
              />
            </div>

            {/* Additional Information */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label
                htmlFor="additional_info"
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "0.5rem",
                }}
              >
                Additional Information
              </label>
              <textarea
                id="additional_info"
                name="additional_info"
                value={formData.additional_info}
                onChange={handleChange}
                rows="3"
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                  fontSize: "1rem",
                  outline: "none",
                  transition: "border-color 0.2s",
                  resize: "vertical",
                }}
                placeholder="Special instructions, what to bring, etc."
              />
            </div>
          </div>
        </div>

        {/* Media Section */}
        <div
          style={{ borderBottom: "1px solid #e5e7eb", paddingBottom: "1rem" }}
        >
          <h4
            style={{
              fontSize: "1.1rem",
              fontWeight: "600",
              color: "#374151",
              marginBottom: "1rem",
            }}
          >
            Media & Images
          </h4>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem",
            }}
          >
            {/* Main Image URL */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label
                htmlFor="image_url"
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "0.5rem",
                }}
              >
                Main Event Image URL
              </label>
              <input
                id="image_url"
                name="image_url"
                type="url"
                value={formData.image_url}
                onChange={handleChange}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                  fontSize: "1rem",
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
                placeholder="https://example.com/event-image.jpg"
              />
            </div>

            {/* Ticket Photo URL */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label
                htmlFor="ticket_photo_url"
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "0.5rem",
                }}
              >
                Ticket Design Image URL
              </label>
              <input
                id="ticket_photo_url"
                name="ticket_photo_url"
                type="url"
                value={formData.ticket_photo_url}
                onChange={handleChange}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                  fontSize: "1rem",
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
                placeholder="https://example.com/ticket-design.jpg"
              />
            </div>

            {/* Gallery */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "0.5rem",
                }}
              >
                Event Gallery Images
              </label>
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  marginBottom: "0.5rem",
                }}
              >
                <button
                  type="button"
                  onClick={handleGalleryImageAdd}
                  style={{
                    padding: "0.5rem 1rem",
                    backgroundColor: "#3b82f6",
                    color: "white",
                    border: "none",
                    borderRadius: "0.375rem",
                    fontSize: "0.875rem",
                    cursor: "pointer",
                  }}
                >
                  Add Image URL
                </button>
              </div>

              {formData.gallery_images.length > 0 && (
                <div
                  style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}
                >
                  {formData.gallery_images.map((image, index) => (
                    <div
                      key={index}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        padding: "0.5rem",
                        backgroundColor: "#f3f4f6",
                        borderRadius: "0.375rem",
                        fontSize: "0.875rem",
                      }}
                    >
                      <span
                        style={{
                          maxWidth: "200px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {image}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleGalleryImageRemove(index)}
                        style={{
                          padding: "0.25rem 0.5rem",
                          backgroundColor: "#ef4444",
                          color: "white",
                          border: "none",
                          borderRadius: "0.25rem",
                          fontSize: "0.75rem",
                          cursor: "pointer",
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div
            style={{
              padding: "0.75rem",
              backgroundColor: "#fef2f2",
              color: "#991b1b",
              borderRadius: "0.375rem",
              fontSize: "0.875rem",
              border: "1px solid #fecaca",
            }}
          >
            {error}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div
            style={{
              padding: "0.75rem",
              backgroundColor: "#f0fdf4",
              color: "#166534",
              borderRadius: "0.375rem",
              fontSize: "0.875rem",
              border: "1px solid #bbf7d0",
            }}
          >
            {success}
          </div>
        )}

        {/* Action Buttons */}
        <div
          style={{
            display: "flex",
            gap: "1rem",
            justifyContent: "flex-end",
            marginTop: "1rem",
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: "transparent",
              color: "#6b7280",
              border: "1px solid #d1d5db",
              borderRadius: "0.375rem",
              fontSize: "1rem",
              fontWeight: "500",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: loading ? "#9ca3af" : "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "0.375rem",
              fontSize: "1rem",
              fontWeight: "500",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "background-color 0.2s",
            }}
          >
            {loading ? "Creating Event..." : "Create Event"}
          </button>
        </div>
      </form>
    </div>
  );
}
