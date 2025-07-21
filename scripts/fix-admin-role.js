// Usage: node fix-admin-role.js <admin-email>
import { createClient } from "@supabase/supabase-js";

import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ Missing required environment variables in .env file");
  console.error("Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function fixAdminRole(email) {
  if (!email) {
    console.error("Usage: node fix-admin-role.js <admin-email>");
    process.exit(1);
  }
  // Find user by email
  const { data: users, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error("Error listing users:", error.message);
    process.exit(1);
  }
  const user = users.users.find((u) => u.email === email);
  if (!user) {
    console.error("User not found:", email);
    process.exit(1);
  }
  // Update user_metadata
  const { error: updateError } = await supabase.auth.admin.updateUserById(
    user.id,
    {
      user_metadata: { ...user.user_metadata, role: "admin" },
    }
  );
  if (updateError) {
    console.error("Error updating user_metadata:", updateError.message);
    process.exit(1);
  }
  console.log(`User ${email} updated to admin role successfully!`);
}

const email = process.argv[2];
fixAdminRole(email);
