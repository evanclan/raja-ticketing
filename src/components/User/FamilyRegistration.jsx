import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

export default function FamilyRegistration({ user }) {
  const [familyMembers, setFamilyMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    age: "",
    relationship: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchFamilyMembers();
  }, [user]);

  const fetchFamilyMembers = async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error } = await supabase
        .from("family_members")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setFamilyMembers(data || []);
    } catch (err) {
      setError("Failed to fetch family members: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.full_name.trim()) {
      setError("Full name is required");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const { error } = await supabase.from("family_members").insert([
        {
          user_id: user.id,
          full_name: formData.full_name.trim(),
          age: formData.age ? parseInt(formData.age) : null,
          relationship: formData.relationship.trim() || null,
          notes: formData.notes.trim() || null,
        },
      ]);

      if (error) throw error;

      setSuccess("Family member added successfully!");
      setFormData({ full_name: "", age: "", relationship: "", notes: "" });
      setShowAddForm(false);
      fetchFamilyMembers();
    } catch (err) {
      setError("Failed to add family member: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to remove this family member?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("family_members")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setSuccess("Family member removed successfully!");
      fetchFamilyMembers();
    } catch (err) {
      setError("Failed to remove family member: " + err.message);
    }
  };

  const resetForm = () => {
    setFormData({ full_name: "", age: "", relationship: "", notes: "" });
    setShowAddForm(false);
    setError("");
    setSuccess("");
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "1rem" }}>
        Loading family members...
      </div>
    );
  }

  return (
    <div style={{ marginBottom: "2rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <h3
          style={{
            fontSize: "1.25rem",
            fontWeight: "bold",
            color: "#3b82f6",
            margin: 0,
          }}
        >
          👨‍👩‍👧‍👦 My Family Members
        </h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "0.875rem",
            fontWeight: "500",
          }}
        >
          {showAddForm ? "Cancel" : "Add Family Member"}
        </button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div
          style={{
            padding: "0.75rem",
            backgroundColor: "#d1fae5",
            color: "#065f46",
            borderRadius: "4px",
            marginBottom: "1rem",
            fontSize: "0.875rem",
          }}
        >
          {success}
        </div>
      )}
      {error && (
        <div
          style={{
            padding: "0.75rem",
            backgroundColor: "#fee2e2",
            color: "#991b1b",
            borderRadius: "4px",
            marginBottom: "1rem",
            fontSize: "0.875rem",
          }}
        >
          {error}
        </div>
      )}

      {/* Add Family Member Form */}
      {showAddForm && (
        <div
          style={{
            backgroundColor: "#f9fafb",
            padding: "1.5rem",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            marginBottom: "1.5rem",
          }}
        >
          <h4
            style={{
              fontSize: "1rem",
              fontWeight: "600",
              marginBottom: "1rem",
              color: "#374151",
            }}
          >
            Add New Family Member
          </h4>
          <form onSubmit={handleSubmit}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1rem",
                marginBottom: "1rem",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.875rem",
                    fontWeight: "500",
                    color: "#374151",
                    marginBottom: "0.25rem",
                  }}
                >
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                  required
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    border: "1px solid #d1d5db",
                    borderRadius: "4px",
                    fontSize: "0.875rem",
                  }}
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.875rem",
                    fontWeight: "500",
                    color: "#374151",
                    marginBottom: "0.25rem",
                  }}
                >
                  Age
                </label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) =>
                    setFormData({ ...formData, age: e.target.value })
                  }
                  min="0"
                  max="120"
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    border: "1px solid #d1d5db",
                    borderRadius: "4px",
                    fontSize: "0.875rem",
                  }}
                  placeholder="Enter age"
                />
              </div>
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "0.25rem",
                }}
              >
                Relationship
              </label>
              <select
                value={formData.relationship}
                onChange={(e) =>
                  setFormData({ ...formData, relationship: e.target.value })
                }
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "4px",
                  fontSize: "0.875rem",
                }}
              >
                <option value="">Select relationship</option>
                <option value="spouse">Spouse</option>
                <option value="child">Child</option>
                <option value="parent">Parent</option>
                <option value="sibling">Sibling</option>
                <option value="grandparent">Grandparent</option>
                <option value="grandchild">Grandchild</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div style={{ marginBottom: "1.5rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "0.25rem",
                }}
              >
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows="2"
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "4px",
                  fontSize: "0.875rem",
                  resize: "vertical",
                }}
                placeholder="Any special notes or dietary requirements..."
              />
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: "0.5rem 1.25rem",
                  backgroundColor: submitting ? "#9ca3af" : "#10b981",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: submitting ? "not-allowed" : "pointer",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                }}
              >
                {submitting ? "Adding..." : "Add Family Member"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                style={{
                  padding: "0.5rem 1.25rem",
                  backgroundColor: "#6b7280",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Family Members List */}
      {familyMembers.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "2rem",
            color: "#6b7280",
            backgroundColor: "#f9fafb",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
          }}
        >
          <p style={{ margin: 0, fontSize: "0.875rem" }}>
            No family members registered yet. Add your family members so they
            can be included when you attend events!
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {familyMembers.map((member) => (
            <div
              key={member.id}
              style={{
                backgroundColor: "white",
                padding: "1rem",
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "1rem",
                    fontWeight: "600",
                    color: "#111827",
                  }}
                >
                  {member.full_name}
                  {member.age && (
                    <span
                      style={{
                        fontSize: "0.875rem",
                        color: "#6b7280",
                        fontWeight: "normal",
                      }}
                    >
                      {" "}
                      ({member.age} years old)
                    </span>
                  )}
                </div>
                {member.relationship && (
                  <div
                    style={{
                      fontSize: "0.875rem",
                      color: "#3b82f6",
                      textTransform: "capitalize",
                    }}
                  >
                    {member.relationship}
                  </div>
                )}
                {member.notes && (
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "#6b7280",
                      marginTop: "0.25rem",
                    }}
                  >
                    {member.notes}
                  </div>
                )}
              </div>
              <button
                onClick={() => handleDelete(member.id)}
                style={{
                  padding: "0.25rem 0.5rem",
                  backgroundColor: "#dc2626",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  fontWeight: "500",
                }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {familyMembers.length > 0 && (
        <div
          style={{
            marginTop: "1rem",
            padding: "0.75rem",
            backgroundColor: "#eff6ff",
            borderRadius: "6px",
            fontSize: "0.875rem",
            color: "#1e40af",
          }}
        >
          <strong>Note:</strong> When you attend events, show your QR code to
          the admin. Your {familyMembers.length} family member
          {familyMembers.length !== 1 ? "s" : ""} will be automatically included
          in your check-in.
        </div>
      )}
    </div>
  );
}
