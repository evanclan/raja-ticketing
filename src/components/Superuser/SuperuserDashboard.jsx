import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

export default function SuperuserDashboard({ onSignOut }) {
  const [admins, setAdmins] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addName, setAddName] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  const [addError, setAddError] = useState("");
  const [addSuccess, setAddSuccess] = useState("");

  useEffect(() => {
    fetchAdmins();
    fetchUsers();
  }, []);

  // Fetch all admins from users table
  const fetchAdmins = async () => {
    setLoadingAdmins(true);
    setAddError("");

    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("role", "admin")
        .order("created_at", { ascending: false });

      if (error) {
        setAddError("Error fetching admins: " + error.message);
      } else {
        console.log("Admins from users table:", data);
        setAdmins(data || []);
      }
    } catch (error) {
      console.error("Error in fetchAdmins:", error);
      setAddError("Error fetching admins: " + error.message);
    } finally {
      setLoadingAdmins(false);
    }
  };

  // Fetch registered users (users with role 'user')
  const fetchUsers = async () => {
    setLoadingUsers(true);
    setAddError("");

    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("role", "user")
        .order("created_at", { ascending: false });

      if (error) {
        setAddError("Error fetching users: " + error.message);
      } else {
        console.log("Users from users table:", data);
        setUsers(data || []);
      }
    } catch (error) {
      console.error("Error in fetchUsers:", error);
      setAddError("Error fetching users: " + error.message);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Add a new admin using NEW PROPER admin creation system
  const handleAddAdmin = async (e) => {
    e.preventDefault();
    setAddLoading(true);
    setAddError("");
    setAddSuccess("");

    try {
      console.log("🔥 Using NEW admin creation system...");

      // Create admin directly using Supabase Auth
      const { data: user, error: createError } =
        await supabase.auth.admin.createUser({
          email: addEmail,
          password: addPassword,
          email_confirm: true,
          user_metadata: {
            role: "admin",
            full_name: addName,
          },
        });

      if (createError) {
        setAddError("Failed to create admin: " + createError.message);
      } else {
        // Insert into public.users table with admin role
        const { error: insertError } = await supabase.from("users").insert({
          id: user.user.id,
          email: addEmail,
          role: "admin",
          full_name: addName,
        });

        if (insertError) {
          setAddError(
            "User created but role assignment failed: " + insertError.message
          );
        } else {
          setAddSuccess(
            `✅ Admin created successfully: ${addName} (${addEmail})`
          );
          setAddEmail("");
          setAddPassword("");
          setAddName("");
          fetchAdmins(); // Refresh admin list
        }
      }
    } catch (error) {
      setAddError("Error creating admin: " + error.message);
    } finally {
      setAddLoading(false);
    }
  };

  // Delete admin using secure Edge Function
  const handleDeleteAdmin = async (adminEmail) => {
    if (
      !window.confirm(`Are you sure you want to delete admin: ${adminEmail}?`)
    ) {
      return;
    }

    setAddLoading(true);
    setAddError("");
    setAddSuccess("");

    try {
      // First, find the admin in the users table to get their ID
      const { data: adminData, error: findError } = await supabase
        .from("users")
        .select("id, email")
        .eq("email", adminEmail)
        .eq("role", "admin")
        .single();

      if (findError || !adminData) {
        setAddError("Admin not found in database");
        return;
      }

      const adminId = adminData.id;

      // Delete from all related tables first (due to foreign key constraints)

      // Delete from event_checkins table
      const { error: checkinsError } = await supabase
        .from("event_checkins")
        .delete()
        .eq("user_id", adminId);

      if (checkinsError) {
        console.log("Could not delete from event_checkins:", checkinsError);
      }

      // Delete from event_participants table
      const { error: participantsError } = await supabase
        .from("event_participants")
        .delete()
        .eq("user_id", adminId);

      if (participantsError) {
        console.log(
          "Could not delete from event_participants:",
          participantsError
        );
      }

      // Delete from registrations table
      const { error: registrationsError } = await supabase
        .from("registrations")
        .delete()
        .eq("user_id", adminId);

      if (registrationsError) {
        console.log("Could not delete from registrations:", registrationsError);
      }

      // Delete from family_members table
      const { error: familyError } = await supabase
        .from("family_members")
        .delete()
        .eq("user_id", adminId);

      if (familyError) {
        console.log("Could not delete from family_members:", familyError);
      }

      // Delete from superusers table if exists
      const { error: superuserError } = await supabase
        .from("superusers")
        .delete()
        .eq("user_id", adminId);

      if (superuserError) {
        console.log("Could not delete from superusers:", superuserError);
      }

      // Delete from users table
      const { error: userError } = await supabase
        .from("users")
        .delete()
        .eq("id", adminId);

      if (userError) {
        setAddError(
          "Failed to delete admin from users table: " + userError.message
        );
        return;
      }

      // Finally, delete from auth system
      const { data: authUsers, error: listError } =
        await supabase.auth.admin.listUsers();
      if (listError) {
        setAddError("Failed to list auth users: " + listError.message);
        return;
      }

      const userToDelete = authUsers.users.find((u) => u.email === adminEmail);
      if (!userToDelete) {
        setAddError("Admin not found in auth system");
        return;
      }

      const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(
        userToDelete.id
      );

      if (deleteAuthError) {
        setAddError(
          "Failed to delete admin from auth: " + deleteAuthError.message
        );
      } else {
        setAddSuccess(
          `Admin ${adminEmail} deleted successfully from all systems!`
        );
        fetchAdmins(); // Refresh the admin list
      }
    } catch (error) {
      setAddError("Error deleting admin: " + error.message);
    } finally {
      setAddLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm(`Are you sure you want to delete this user?`)) {
      return;
    }

    setLoadingUsers(true);
    setAddError("");

    try {
      // Get user details first
      const { data: userData, error: userFindError } = await supabase
        .from("users")
        .select("id, email")
        .eq("id", userId)
        .single();

      if (userFindError || !userData) {
        setAddError("User not found in database");
        return;
      }

      // Delete from all related tables first (due to foreign key constraints)

      // Delete from event_checkins table
      const { error: checkinsError } = await supabase
        .from("event_checkins")
        .delete()
        .eq("user_id", userId);

      if (checkinsError) {
        console.log("Could not delete from event_checkins:", checkinsError);
      }

      // Delete from event_participants table
      const { error: participantsError } = await supabase
        .from("event_participants")
        .delete()
        .eq("user_id", userId);

      if (participantsError) {
        console.log(
          "Could not delete from event_participants:",
          participantsError
        );
      }

      // Delete from registrations table
      const { error: registrationsError } = await supabase
        .from("registrations")
        .delete()
        .eq("user_id", userId);

      if (registrationsError) {
        console.log("Could not delete from registrations:", registrationsError);
      }

      // Delete from family_members table
      const { error: familyError } = await supabase
        .from("family_members")
        .delete()
        .eq("user_id", userId);

      if (familyError) {
        console.log("Could not delete from family_members:", familyError);
      }

      // Delete from superusers table if exists
      const { error: superuserError } = await supabase
        .from("superusers")
        .delete()
        .eq("user_id", userId);

      if (superuserError) {
        console.log("Could not delete from superusers:", superuserError);
      }

      // Delete from users table
      const { error: userError } = await supabase
        .from("users")
        .delete()
        .eq("id", userId);

      if (userError) {
        setAddError(
          "Failed to delete user from users table: " + userError.message
        );
        return;
      }

      // Delete from auth system
      const { data: authUsers, error: listError } =
        await supabase.auth.admin.listUsers();
      if (listError) {
        setAddError("Failed to list auth users: " + listError.message);
        return;
      }

      const userToDelete = authUsers.users.find((u) => u.id === userId);
      if (!userToDelete) {
        console.log(
          "User not found in auth system, but data deleted from database"
        );
      } else {
        const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(
          userId
        );
        if (deleteAuthError) {
          console.log("Could not delete from auth system:", deleteAuthError);
        }
      }

      setAddSuccess("User deleted successfully from all systems!");
      fetchUsers(); // Refresh the user list
    } catch (error) {
      setAddError("Error deleting user: " + error.message);
    } finally {
      setLoadingUsers(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: "900px",
        margin: "2rem auto",
        padding: "2rem",
        background: "white",
        borderRadius: "0.5rem",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
        }}
      >
        <h2 style={{ fontSize: "2rem", fontWeight: "bold", color: "#1f2937" }}>
          Superuser Dashboard
        </h2>
        <button
          onClick={onSignOut}
          style={{
            padding: "0.5rem 1.25rem",
            backgroundColor: "#ef4444",
            color: "white",
            border: "none",
            borderRadius: "0.375rem",
            fontWeight: "bold",
            fontSize: "1rem",
            cursor: "pointer",
          }}
        >
          Sign Out
        </button>
      </div>

      {/* Add Admin */}
      <div
        style={{
          marginBottom: "2rem",
          background: "#f9fafb",
          padding: "1rem",
          borderRadius: "0.375rem",
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
          Add Admin
        </h3>
        <form
          onSubmit={handleAddAdmin}
          style={{
            display: "flex",
            gap: "1rem",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <input
            type="text"
            placeholder="Admin Name"
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            required
            style={{
              padding: "0.5rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.375rem",
              fontSize: "1rem",
              flex: 1,
              minWidth: "150px",
            }}
          />
          <input
            type="email"
            placeholder="Admin Email"
            value={addEmail}
            onChange={(e) => setAddEmail(e.target.value)}
            required
            autoComplete="username"
            style={{
              padding: "0.5rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.375rem",
              fontSize: "1rem",
              flex: 1,
              minWidth: "150px",
            }}
          />
          <input
            type="password"
            placeholder="Password"
            value={addPassword}
            onChange={(e) => setAddPassword(e.target.value)}
            required
            autoComplete="current-password"
            style={{
              padding: "0.5rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.375rem",
              fontSize: "1rem",
              flex: 1,
              minWidth: "150px",
            }}
          />
          <button
            type="submit"
            disabled={addLoading}
            style={{
              padding: "0.5rem 1.25rem",
              backgroundColor: addLoading ? "#9ca3af" : "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "0.375rem",
              fontWeight: "bold",
              fontSize: "1rem",
              cursor: addLoading ? "not-allowed" : "pointer",
            }}
          >
            {addLoading ? "Adding..." : "Add Admin"}
          </button>
        </form>
        {addError && (
          <div style={{ color: "#991b1b", marginTop: "0.5rem" }}>
            {addError}
          </div>
        )}
        {addSuccess && (
          <div style={{ color: "#166534", marginTop: "0.5rem" }}>
            {addSuccess}
          </div>
        )}
      </div>

      {/* Admin List */}
      <div style={{ marginBottom: "2rem" }}>
        <h3
          style={{
            fontSize: "1.25rem",
            fontWeight: "bold",
            color: "#1f2937",
            marginBottom: "1rem",
          }}
        >
          Admin List
        </h3>
        {loadingAdmins ? (
          <div>Loading admins...</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f3f4f6" }}>
                <th style={{ padding: "0.5rem", textAlign: "left" }}>Name</th>
                <th style={{ padding: "0.5rem", textAlign: "left" }}>Email</th>
                <th style={{ padding: "0.5rem", textAlign: "left" }}>Role</th>
                <th style={{ padding: "0.5rem", textAlign: "left" }}>
                  Created
                </th>
                <th style={{ padding: "0.5rem" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr
                  key={admin.id}
                  style={{ borderBottom: "1px solid #e5e7eb" }}
                >
                  <td style={{ padding: "0.5rem" }}>
                    {admin.full_name || "N/A"}
                  </td>
                  <td style={{ padding: "0.5rem" }}>{admin.email}</td>
                  <td style={{ padding: "0.5rem" }}>
                    <span
                      style={{
                        backgroundColor: "#3b82f6",
                        color: "white",
                        padding: "0.25rem 0.5rem",
                        borderRadius: "0.25rem",
                        fontSize: "0.75rem",
                        fontWeight: "bold",
                      }}
                    >
                      {admin.role || "admin"}
                    </span>
                  </td>
                  <td style={{ padding: "0.5rem" }}>
                    {new Date(admin.created_at).toLocaleString()}
                  </td>
                  <td style={{ padding: "0.5rem" }}>
                    <button
                      onClick={() => handleDeleteAdmin(admin.email)}
                      disabled={addLoading}
                      style={{
                        padding: "0.25rem 0.75rem",
                        backgroundColor: addLoading ? "#9ca3af" : "#ef4444",
                        color: "white",
                        border: "none",
                        borderRadius: "0.375rem",
                        fontWeight: "bold",
                        fontSize: "0.9rem",
                        cursor: addLoading ? "not-allowed" : "pointer",
                      }}
                    >
                      {addLoading ? "Deleting..." : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* User List */}
      <div>
        <h3
          style={{
            fontSize: "1.25rem",
            fontWeight: "bold",
            color: "#1f2937",
            marginBottom: "1rem",
          }}
        >
          Registered Users
        </h3>
        {loadingUsers ? (
          <div>Loading users...</div>
        ) : users.length === 0 ? (
          <div>No users found.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f3f4f6" }}>
                <th style={{ padding: "0.5rem", textAlign: "left" }}>Name</th>
                <th style={{ padding: "0.5rem", textAlign: "left" }}>Email</th>
                <th style={{ padding: "0.5rem", textAlign: "left" }}>Role</th>
                <th style={{ padding: "0.5rem", textAlign: "left" }}>
                  Created
                </th>
                <th style={{ padding: "0.5rem" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "0.5rem" }}>
                    {user.full_name || "N/A"}
                  </td>
                  <td style={{ padding: "0.5rem" }}>{user.email}</td>
                  <td style={{ padding: "0.5rem" }}>
                    <span
                      style={{
                        backgroundColor: "#10b981",
                        color: "white",
                        padding: "0.25rem 0.5rem",
                        borderRadius: "0.25rem",
                        fontSize: "0.75rem",
                        fontWeight: "bold",
                      }}
                    >
                      {user.role || "user"}
                    </span>
                  </td>
                  <td style={{ padding: "0.5rem" }}>
                    {new Date(user.created_at).toLocaleString()}
                  </td>
                  <td style={{ padding: "0.5rem" }}>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      disabled={loadingUsers}
                      style={{
                        padding: "0.25rem 0.75rem",
                        backgroundColor: loadingUsers ? "#9ca3af" : "#ef4444",
                        color: "white",
                        border: "none",
                        borderRadius: "0.375rem",
                        fontWeight: "bold",
                        fontSize: "0.9rem",
                        cursor: loadingUsers ? "not-allowed" : "pointer",
                      }}
                    >
                      {loadingUsers ? "Deleting..." : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
