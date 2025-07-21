import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import QRCode from "qrcode";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Environment variables validation
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing required environment variables:");
  console.error("SUPABASE_URL:", SUPABASE_URL ? "✅" : "❌");
  console.error(
    "SUPABASE_SERVICE_ROLE_KEY:",
    SUPABASE_SERVICE_ROLE_KEY ? "✅" : "❌"
  );
  process.exit(1);
}

// Supabase client with service role key from environment
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// NEW PROPER ADMIN CREATION ENDPOINT
app.post("/api/create-proper-admin", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      console.log("[create-proper-admin] Missing email or password");
      return res.status(400).json({ error: "Email and password are required" });
    }

    console.log("[create-proper-admin] Creating admin the RIGHT way...");

    // Step 1: Create user in auth.users with admin metadata
    const { data: user, error: createError } =
      await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: { role: "admin" },
      });

    if (createError) {
      console.log(
        "[create-proper-admin] Error creating user:",
        createError.message
      );
      return res
        .status(400)
        .json({ error: "Error creating admin: " + createError.message });
    }

    console.log("[create-proper-admin] Auth user created:", user.user.id);

    // Step 2: Directly insert into public.users with admin role (bypass trigger)
    console.log(
      "[create-proper-admin] Inserting directly into public.users with admin role..."
    );

    const { data: publicUser, error: insertError } = await supabase
      .from("users")
      .upsert(
        {
          id: user.user.id,
          email: email,
          full_name: null,
          role: "admin", // Set admin role directly
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      )
      .select();

    if (insertError) {
      console.log(
        "[create-proper-admin] Error inserting into public.users:",
        insertError.message
      );
      // Don't fail completely, the auth user still exists
    } else {
      console.log(
        "[create-proper-admin] Successfully inserted into public.users:",
        publicUser[0]
      );
    }

    // Step 3: Force update public.users role to admin (in case trigger overrode it)
    console.log("[create-proper-admin] Force updating public.users role...");
    await new Promise((resolve) => setTimeout(resolve, 500)); // Wait for triggers

    const { error: forceUpdateError } = await supabase
      .from("users")
      .update({ role: "admin" })
      .eq("id", user.user.id);

    if (forceUpdateError) {
      console.log(
        "[create-proper-admin] Error force updating role:",
        forceUpdateError.message
      );
    } else {
      console.log("[create-proper-admin] Force update successful");
    }

    // Step 4: Verify final state
    const { data: finalPublicUser } = await supabase
      .from("users")
      .select("role, email")
      .eq("id", user.user.id)
      .single();

    console.log("[create-proper-admin] FINAL RESULT:");
    console.log("  Auth metadata role:", user.user.user_metadata?.role);
    console.log("  Public users role:", finalPublicUser?.role);

    res.json({
      success: true,
      message: "Admin created with new system!",
      userId: user.user.id,
      authRole: user.user.user_metadata?.role,
      publicRole: finalPublicUser?.role,
    });
  } catch (error) {
    console.error("[create-proper-admin] Server error:", error);
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
});

// Delete user endpoint
app.post("/api/delete-user", async (req, res) => {
  try {
    const { userEmail } = req.body;

    if (!userEmail) {
      return res.status(400).json({ error: "User email is required" });
    }

    // Find user by email
    const { data: users, error: findError } =
      await supabase.auth.admin.listUsers();

    if (findError) {
      return res
        .status(400)
        .json({ error: "Error finding user: " + findError.message });
    }

    const userToDelete = users.users.find((user) => user.email === userEmail);

    if (!userToDelete) {
      return res.status(404).json({ error: "User not found" });
    }

    // Delete the user
    const { error: deleteError } = await supabase.auth.admin.deleteUser(
      userToDelete.id
    );

    if (deleteError) {
      return res
        .status(400)
        .json({ error: "Error deleting user: " + deleteError.message });
    }

    res.json({
      success: true,
      message: "User deleted successfully",
      deletedUserId: userToDelete.id,
    });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
});

// SERVER-SIDE participants endpoint to bypass RLS issues
app.get("/api/event/:eventId/participants", async (req, res) => {
  try {
    const { eventId } = req.params;
    console.log("[participants] Getting participants for event:", eventId);

    // Step 1: Get approved registrations
    const { data: registrations, error: regError } = await supabase
      .from("registrations")
      .select("user_id, status, created_at")
      .eq("event_id", eventId)
      .eq("status", "approved")
      .order("created_at", { ascending: true });

    if (regError) {
      console.log("[participants] Registration error:", regError.message);
      return res
        .status(400)
        .json({ error: "Error fetching registrations: " + regError.message });
    }

    console.log(
      "[participants] Found",
      registrations?.length || 0,
      "approved registrations"
    );

    if (!registrations || registrations.length === 0) {
      return res.json({ participants: [] });
    }

    // Step 2: Get user details (using server-side auth to bypass RLS)
    const participants = [];
    for (const reg of registrations) {
      console.log("[participants] Processing user:", reg.user_id);

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("email, full_name")
        .eq("id", reg.user_id);

      if (userError) {
        console.log(
          "[participants] User error for",
          reg.user_id,
          ":",
          userError.message
        );
        continue;
      }

      if (userData && userData.length > 0) {
        const user = userData[0];
        participants.push({
          id: reg.user_id,
          email: user.email,
          name: user.full_name || "No name",
          registeredAt: reg.created_at,
          status: reg.status,
        });
        console.log("[participants] ✅ Added:", user.email, user.full_name);
      } else {
        console.log("[participants] ⚠️ User not found:", reg.user_id);
        participants.push({
          id: reg.user_id,
          email: `Missing User (${reg.user_id})`,
          name: "User data missing",
          registeredAt: reg.created_at,
          status: reg.status,
        });
      }
    }

    console.log("[participants] Final count:", participants.length);
    res.json({ participants });
  } catch (error) {
    console.error("[participants] Server error:", error);
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
});

// QR CODE & CHECK-IN ENDPOINTS

// Generate QR code for approved participants
app.get("/api/event/:eventId/participant/:userId/qr", async (req, res) => {
  try {
    const { eventId, userId } = req.params;

    // Verify user is approved for this event
    const { data: registration, error: regError } = await supabase
      .from("registrations")
      .select("id, status, check_in_code")
      .eq("event_id", eventId)
      .eq("user_id", userId)
      .eq("status", "approved")
      .single();

    if (regError || !registration) {
      return res.status(404).json({ error: "Approved registration not found" });
    }

    let checkInCode = registration.check_in_code;

    // Generate unique check-in code if not exists
    if (!checkInCode) {
      checkInCode = `${eventId}-${userId}-${uuidv4()}`;

      const { error: updateError } = await supabase
        .from("registrations")
        .update({ check_in_code: checkInCode })
        .eq("id", registration.id);

      if (updateError) {
        return res
          .status(500)
          .json({ error: "Failed to generate check-in code" });
      }
    }

    // Generate QR code
    const qrData = JSON.stringify({
      eventId,
      userId,
      checkInCode,
      timestamp: new Date().toISOString(),
    });

    const qrCodeDataURL = await QRCode.toDataURL(qrData, {
      width: 300,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

    res.json({
      qrCode: qrCodeDataURL,
      checkInCode,
      eventId,
      userId,
    });
  } catch (error) {
    console.error("[qr-generation] Error:", error);
    res.status(500).json({ error: "Failed to generate QR code" });
  }
});

// Verify QR code and check-in participant
app.post("/api/check-in/verify", async (req, res) => {
  try {
    const { qrData } = req.body;

    if (!qrData) {
      return res.status(400).json({ error: "QR data is required" });
    }

    // Parse QR code data
    let parsedData;
    try {
      parsedData = JSON.parse(qrData);
    } catch {
      return res.status(400).json({ error: "Invalid QR code format" });
    }

    const { eventId, userId, checkInCode } = parsedData;

    if (!eventId || !userId || !checkInCode) {
      return res.status(400).json({ error: "Incomplete QR code data" });
    }

    // Verify registration and check-in code
    const { data: registration, error: regError } = await supabase
      .from("registrations")
      .select(
        `
        id, status, check_in_code, checked_in_at, checked_in_by,
        users:user_id(email, full_name),
        events:event_id(title, event_date, event_time, location)
      `
      )
      .eq("event_id", eventId)
      .eq("user_id", userId)
      .eq("check_in_code", checkInCode)
      .eq("status", "approved")
      .single();

    if (regError || !registration) {
      return res.status(404).json({
        error: "Invalid QR code or participant not approved",
        success: false,
      });
    }

    // Check if already checked in
    if (registration.checked_in_at) {
      return res.json({
        success: false,
        alreadyCheckedIn: true,
        message: "Participant already checked in",
        participant: {
          name: registration.users?.full_name || "No name",
          email: registration.users?.email,
          checkedInAt: registration.checked_in_at,
          checkedInBy: registration.checked_in_by,
        },
        event: registration.events,
      });
    }

    // Perform check-in
    const checkInTime = new Date().toISOString();
    const { error: checkInError } = await supabase
      .from("registrations")
      .update({
        checked_in_at: checkInTime,
        checked_in_by: "scanner", // You can pass scanner ID if needed
      })
      .eq("id", registration.id);

    if (checkInError) {
      return res.status(500).json({ error: "Failed to check in participant" });
    }

    res.json({
      success: true,
      message: "Check-in successful!",
      participant: {
        name: registration.users?.full_name || "No name",
        email: registration.users?.email,
        checkedInAt: checkInTime,
      },
      event: registration.events,
    });
  } catch (error) {
    console.error("[check-in] Error:", error);
    res.status(500).json({ error: "Check-in verification failed" });
  }
});

// Get check-in statistics for an event
app.get("/api/event/:eventId/check-in-stats", async (req, res) => {
  try {
    const { eventId } = req.params;

    const { data: stats, error } = await supabase
      .from("registrations")
      .select("status, checked_in_at")
      .eq("event_id", eventId);

    if (error) {
      return res.status(500).json({ error: "Failed to fetch check-in stats" });
    }

    const approved = stats.filter((s) => s.status === "approved").length;
    const checkedIn = stats.filter((s) => s.checked_in_at).length;
    const pending = stats.filter((s) => s.status === "pending").length;

    res.json({
      approved,
      checkedIn,
      pending,
      checkInRate: approved > 0 ? Math.round((checkedIn / approved) * 100) : 0,
    });
  } catch (error) {
    console.error("[check-in-stats] Error:", error);
    res.status(500).json({ error: "Failed to get check-in statistics" });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log("Delete user API available at POST /api/delete-user");
});
