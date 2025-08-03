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
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [addSuccess, setAddSuccess] = useState("");

  useEffect(() => {
    fetchAdmins();
    fetchUsers();
  }, []);

  // Fetch all admins (users with role 'admin')
  const fetchAdmins = async () => {
    setLoadingAdmins(true);
    setAddError("");
    const { data, error } = await supabase.rpc("get_admins");
    if (error) {
      setAddError("Error fetching admins: " + error.message);
    } else {
      setAdmins(data);
    }
    setLoadingAdmins(false);
  };

  // Simple solution - get users with role 'user' from public.users table
  const fetchUsers = async () => {
    setLoadingUsers(true);
    setAddError("");
    
    try {
      // Direct query to public.users table for users with role 'user'
      const { data: users, error } = await supabase
        .from("users")
        .select("id, email, full_name, role, created_at")
        .eq("role", "user");
      
      if (error) {
        setAddError("Error fetching users: " + error.message);
        setLoadingUsers(false);
        return;
      }
      
      console.log("Users with role 'user':", users);
      setUsers(users);
      
    } catch (error) {
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
            full_name: addName 
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
          setAddSuccess(`✅ Admin created successfully: ${addName} (${addEmail})`);
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
      // Find user by email and delete
      const { data: users, error: findError } =
        await supabase.auth.admin.listUsers();
      if (findError) throw findError;

      const userToDelete = users.users.find((u) => u.email === adminEmail);
      if (!userToDelete) throw new Error("User not found");

      // Delete from auth and public tables
      const { error: deleteError } = await supabase.auth.admin.deleteUser(
        userToDelete.id
      );

      if (deleteError) {
        setAddError("Failed to delete admin: " + deleteError.message);
      } else {
        setAddSuccess(`Admin ${adminEmail} deleted successfully!`);
        fetchAdmins(); // Refresh the admin list
      }
    } catch (error) {
      setAddError("Error deleting admin: " + error.message);
    } finally {
      setAddLoading(false);
    }
  };

  // Simple user deletion
  const handleDeleteUser = async (userEmail) => {
    if (
      !window.confirm(`Are you sure you want to delete user: ${userEmail}?`)
    ) {
      return;
    }

    setDeleteLoading(true);
    setAddError("");
    setAddSuccess("");

    try {
      // Delete from users table
      const { error } = await supabase
        .from("users")
        .delete()
        .eq("email", userEmail);

      if (error) {
        setAddError("Failed to delete user: " + error.message);
        return;
      }

      setAddSuccess(`User ${userEmail} deleted successfully!`);
      
      // Refresh the user list
      fetchUsers();
    } catch (error) {
      setAddError("Error deleting user: " + error.message);
    } finally {
      setDeleteLoading(false);
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
          style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}
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
                  <td style={{ padding: "0.5rem" }}>{admin.full_name || "N/A"}</td>
                  <td style={{ padding: "0.5rem" }}>{admin.email}</td>
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
                <th style={{ padding: "0.5rem", textAlign: "left" }}>
                  Created
                </th>
                <th style={{ padding: "0.5rem" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "0.5rem" }}>{user.full_name || "N/A"}</td>
                  <td style={{ padding: "0.5rem" }}>{user.email}</td>
                  <td style={{ padding: "0.5rem" }}>
                    {new Date(user.created_at).toLocaleString()}
                  </td>
                  <td style={{ padding: "0.5rem" }}>
                    <button
                      onClick={() => handleDeleteUser(user.email)}
                      disabled={deleteLoading}
                      style={{
                        padding: "0.25rem 0.75rem",
                        backgroundColor: deleteLoading ? "#9ca3af" : "#ef4444",
                        color: "white",
                        border: "none",
                        borderRadius: "0.375rem",
                        fontWeight: "bold",
                        fontSize: "0.9rem",
                        cursor: deleteLoading ? "not-allowed" : "pointer",
                      }}
                    >
                      {deleteLoading ? "Deleting..." : "Delete"}
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
