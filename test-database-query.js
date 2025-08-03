// Test script to debug database issues
// Run this in the browser console or as a Node.js script

const supabaseUrl = "https://vwadfrbnalrkpiygjxhh.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3YWRmcmJuYWxya3BpeWdqeGhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4NjU4OTcsImV4cCI6MjA2ODQ0MTg5N30.jUFLaVL_WGCtJCR4T2qxkzP5-8HpHKQnZqHLtgNUMCM";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugDatabase() {
  console.log("🔍 Debugging database...");
  
  try {
    // Test 1: Check users table
    console.log("\n1. Checking users table...");
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("*");
    
    if (usersError) {
      console.error("❌ Error fetching users:", usersError);
    } else {
      console.log("✅ Users table data:", users);
      console.log("📊 Total users:", users?.length || 0);
      
      // Check users with role 'user'
      const userRoleUsers = users?.filter(u => u.role === 'user') || [];
      console.log("👥 Users with role 'user':", userRoleUsers.length);
    }

    // Test 2: Check auth.users via RPC
    console.log("\n2. Checking auth.users via RPC...");
    const { data: authUsers, error: authError } = await supabase.rpc("get_all_users");
    
    if (authError) {
      console.error("❌ Error fetching auth users:", authError);
    } else {
      console.log("✅ Auth users data:", authUsers);
      console.log("📊 Total auth users:", authUsers?.length || 0);
    }

    // Test 3: Check if trigger is working
    console.log("\n3. Checking trigger function...");
    const { data: triggerTest, error: triggerError } = await supabase.rpc("get_admins");
    
    if (triggerError) {
      console.error("❌ Error testing trigger:", triggerError);
    } else {
      console.log("✅ Trigger test result:", triggerTest);
    }

  } catch (error) {
    console.error("❌ Debug failed:", error);
  }
}

// Run the debug function
debugDatabase(); 