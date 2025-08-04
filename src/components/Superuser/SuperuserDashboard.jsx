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
        setAddError("管理者の取得エラー: " + error.message);
      } else {
        console.log("Admins from users table:", data);
        setAdmins(data || []);
      }
    } catch (error) {
      console.error("Error in fetchAdmins:", error);
      setAddError("管理者の取得エラー: " + error.message);
    } finally {
      setLoadingAdmins(false);
    }
  };

  // Fetch registered users (users with role 'user')
  const fetchUsers = async () => {
    setLoadingUsers(true);
    setAddError("");

    try {
      console.log("🔄 Fetching users from database...");
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("role", "user")
        .order("created_at", { ascending: false });

      if (error) {
        console.log("❌ Error fetching users:", error);
        setAddError("ユーザーの取得エラー: " + error.message);
      } else {
        console.log("✅ Users fetched successfully:", data?.length || 0, "users");
        setUsers(data || []);
      }
    } catch (error) {
      console.log("❌ Exception in fetchUsers:", error);
      console.error("Error in fetchUsers:", error);
      setAddError("ユーザーの取得エラー: " + error.message);
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
        setAddError("管理者の作成に失敗しました: " + createError.message);
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
            "ユーザーは作成されましたが、役割の割り当てに失敗しました: " + insertError.message
          );
        } else {
          setAddSuccess(
            `✅ 管理者が正常に作成されました: ${addName} (${addEmail})`
          );
          setAddEmail("");
          setAddPassword("");
          setAddName("");
          fetchAdmins(); // Refresh admin list
        }
      }
    } catch (error) {
      setAddError("管理者作成エラー: " + error.message);
    } finally {
      setAddLoading(false);
    }
  };

  // Delete admin using secure Edge Function
  const handleDeleteAdmin = async (adminEmail) => {
    console.log("🔄 Starting delete admin process for email:", adminEmail);
    
    if (
      !window.confirm(`管理者 ${adminEmail} を削除してもよろしいですか？`)
    ) {
      console.log("❌ User cancelled admin deletion");
      return;
    }

    setAddLoading(true);
    setAddError("");
    setAddSuccess("");

    try {
      console.log("🔍 Looking up admin details...");
      // First, find the admin in the users table to get their ID
      const { data: adminData, error: findError } = await supabase
        .from("users")
        .select("id, email")
        .eq("email", adminEmail)
        .eq("role", "admin")
        .single();

      if (findError || !adminData) {
        console.log("❌ Admin not found:", findError);
        setAddError("データベースで管理者が見つかりません");
        return;
      }

      console.log("✅ Admin found:", adminData);
      const adminId = adminData.id;

      // Delete from all related tables first (due to foreign key constraints)

      console.log("🗑️ Deleting from registrations table...");
      // Delete from registrations table
      const { error: registrationsError } = await supabase
        .from("registrations")
        .delete()
        .eq("user_id", adminId);

      if (registrationsError) {
        console.log("❌ Could not delete from registrations:", registrationsError);
      } else {
        console.log("✅ Deleted from registrations successfully");
      }

      console.log("🗑️ Deleting from family_members table...");
      // Delete from family_members table
      const { error: familyError } = await supabase
        .from("family_members")
        .delete()
        .eq("user_id", adminId);

      if (familyError) {
        console.log("❌ Could not delete from family_members:", familyError);
      } else {
        console.log("✅ Deleted from family_members successfully");
      }

      console.log("🗑️ Deleting from users table...");
      // Delete from users table
      const { error: userError } = await supabase
        .from("users")
        .delete()
        .eq("id", adminId);

      if (userError) {
        console.log("❌ Failed to delete from users table:", userError);
        setAddError(
          "Failed to delete admin from users table: " + userError.message
        );
        return;
      } else {
        console.log("✅ Deleted from users table successfully");
      }

      // Note: Auth deletion requires special permissions and is handled separately
      // The user will be removed from the application data but may still exist in auth
      console.log("✅ Admin deletion completed successfully!");
      setAddSuccess(
        `Admin ${adminEmail} deleted successfully from application data!`
      );
      fetchAdmins(); // Refresh the admin list
    } catch (error) {
      console.log("❌ Error in delete admin process:", error);
      setAddError("Error deleting admin: " + error.message);
    } finally {
      console.log("🏁 Delete admin process finished");
      setAddLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    console.log("🔄 Starting delete user process for ID:", userId);
    
    if (!window.confirm(`Are you sure you want to delete this user?`)) {
      console.log("❌ User cancelled deletion");
      return;
    }

    setLoadingUsers(true);
    setAddError("");

    try {
      console.log("🔍 Looking up user details...");
      // Get user details first
      const { data: userData, error: userFindError } = await supabase
        .from("users")
        .select("id, email")
        .eq("id", userId)
        .single();

      if (userFindError || !userData) {
        console.log("❌ User not found:", userFindError);
        setAddError("User not found in database");
        return;
      }

      console.log("✅ User found:", userData);

      // Try direct deletion from users table first
      console.log("🗑️ Attempting direct deletion from users table...");
      const { error: directDeleteError } = await supabase
        .from("users")
        .delete()
        .eq("id", userId);

      if (directDeleteError) {
        console.log("❌ Direct deletion failed:", directDeleteError);
        
        // If direct deletion fails, try deleting from related tables first
        console.log("🔄 Trying to delete from related tables first...");
        
        // Delete from registrations table
        console.log("🗑️ Deleting from registrations table...");
        const { error: registrationsError } = await supabase
          .from("registrations")
          .delete()
          .eq("user_id", userId);

        if (registrationsError) {
          console.log("❌ Could not delete from registrations:", registrationsError);
        } else {
          console.log("✅ Deleted from registrations successfully");
        }

        // Delete from family_members table
        console.log("🗑️ Deleting from family_members table...");
        const { error: familyError } = await supabase
          .from("family_members")
          .delete()
          .eq("user_id", userId);

        if (familyError) {
          console.log("❌ Could not delete from family_members:", familyError);
        } else {
          console.log("✅ Deleted from family_members successfully");
        }

        // Try deleting from users table again
        console.log("🗑️ Trying to delete from users table again...");
        const { error: userError } = await supabase
          .from("users")
          .delete()
          .eq("id", userId);

        if (userError) {
          console.log("❌ Failed to delete from users table:", userError);
          setAddError(
            "Failed to delete user from users table: " + userError.message
          );
          return;
        } else {
          console.log("✅ Deleted from users table successfully");
        }
      } else {
        console.log("✅ Direct deletion from users table successful!");
      }

      // Note: Auth deletion requires special permissions and is handled separately
      // The user will be removed from the application data but may still exist in auth
      console.log("✅ User deletion completed successfully!");
      setAddSuccess("User deleted successfully from application data!");
      
      // Force refresh by clearing state and refetching
      console.log("🔄 Forcing refresh of user list...");
      setUsers([]); // Clear current state
      setTimeout(() => {
        fetchUsers(); // Refresh the user list after a short delay
      }, 500);
    } catch (error) {
      console.log("❌ Error in delete user process:", error);
      setAddError("Error deleting user: " + error.message);
    } finally {
      console.log("🏁 Delete user process finished");
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3
            style={{
              fontSize: "1.25rem",
              fontWeight: "bold",
              color: "#1f2937",
            }}
          >
            Registered Users
          </h3>
          <button
            onClick={() => {
              console.log("🔄 Manual refresh triggered");
              fetchUsers();
            }}
            disabled={loadingUsers}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: loadingUsers ? "#9ca3af" : "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "0.375rem",
              fontWeight: "bold",
              fontSize: "0.9rem",
              cursor: loadingUsers ? "not-allowed" : "pointer",
            }}
          >
            {loadingUsers ? "Refreshing..." : "Refresh"}
          </button>
        </div>
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
