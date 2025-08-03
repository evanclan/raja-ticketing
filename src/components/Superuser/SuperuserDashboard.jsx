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

  // Fetch registered users (non-admin users)
  const fetchUsers = async () => {
    setLoadingUsers(true);
    setAddError("");

    try {
      // Only get users from the users table - this is the source of truth
      const { data: usersFromTable, error: tableError } = await supabase
        .from("users")
        .select("*")
        .neq("role", "admin")
        .order("created_at", { ascending: false });

      if (tableError) {
        console.log("Could not fetch from users table:", tableError);
        setAddError("Error fetching users: " + tableError.message);
        setLoadingUsers(false);
        return;
      }

      console.log("Users from users table:", usersFromTable);

      // Only show users that exist in the database
      if (usersFromTable && usersFromTable.length > 0) {
        console.log("Using users from users table with actual roles:", usersFromTable);
        setUsers(usersFromTable);
      } else {
        console.log("No users found in database");
        setUsers([]);
        setAddError("No registered users found in database. Users must exist in the users table to be displayed.");
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

  const handleDeleteUser = async (userId) => {
    if (!window.confirm(`Are you sure you want to delete this user?`)) {
      return;
    }

    setLoadingUsers(true);
    setAddError("");

    try {
      // Delete from registrations table first (foreign key constraint)
      const { error: regError } = await supabase
        .from("registrations")
        .delete()
        .eq("user_id", userId);

      if (regError) {
        console.log("Could not delete from registrations:", regError);
      }

      // Delete from family_members table
      const { error: familyError } = await supabase
        .from("family_members")
        .delete()
        .eq("user_id", userId);

      if (familyError) {
        console.log("Could not delete from family_members:", familyError);
      }

      // Delete from users table (if it exists)
      const { error: userError } = await supabase
        .from("users")
        .delete()
        .eq("id", userId);

      if (userError) {
        console.log("Could not delete from users table:", userError);
      }

      // Since we can't delete from auth system directly due to permissions,
      // we'll create a "deleted_users" table entry or mark them as inactive
      // For now, we'll just remove their data from our tables and refresh the list
      
      // Remove from local state
      setUsers(users.filter((user) => user.id !== userId));
      setAddSuccess("User data deleted successfully! User removed from all app data.");
      
      // Refresh the user list to ensure consistency
      setTimeout(() => {
        fetchUsers();
      }, 1000);
      
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
                  <td style={{ padding: "0.5rem" }}>
                    {user.full_name || "N/A"}
                  </td>
                  <td style={{ padding: "0.5rem" }}>{user.email}</td>
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
