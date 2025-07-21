import { supabase } from "./supabase.js";

// Database helper functions for Cursor AI to use

export const supabaseHelpers = {
  // User management
  async createUser(email, fullName, role = "user") {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: "temp-password", // Will be changed by user
      options: {
        data: {
          full_name: fullName,
          role: role,
        },
      },
    });
    return { data, error };
  },

  async getUserProfile(userId) {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();
    return { data, error };
  },

  // Event management
  async createEvent(eventData) {
    const { data, error } = await supabase
      .from("events")
      .insert([eventData])
      .select();
    return { data, error };
  },

  async getEvents(status = "active") {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("status", status)
      .order("date", { ascending: true });
    return { data, error };
  },

  async updateEvent(eventId, updates) {
    const { data, error } = await supabase
      .from("events")
      .update(updates)
      .eq("id", eventId)
      .select();
    return { data, error };
  },

  // Registration management
  async registerForEvent(userId, eventId) {
    const { data, error } = await supabase
      .from("registrations")
      .insert([
        {
          user_id: userId,
          event_id: eventId,
          status: "pending",
          payment_status: "pending",
        },
      ])
      .select();
    return { data, error };
  },

  async getUserRegistrations(userId) {
    const { data, error } = await supabase
      .from("registrations")
      .select(
        `
        *,
        events (*)
      `
      )
      .eq("user_id", userId);
    return { data, error };
  },

  // Guest applications
  async submitGuestApplication(applicationData) {
    const { data, error } = await supabase
      .from("guest_applications")
      .insert([applicationData])
      .select();
    return { data, error };
  },

  async getGuestApplications(status = "pending") {
    const { data, error } = await supabase
      .from("guest_applications")
      .select("*")
      .eq("status", status)
      .order("created_at", { ascending: false });
    return { data, error };
  },

  // Admin functions
  async updateRegistrationStatus(registrationId, status) {
    const { data, error } = await supabase
      .from("registrations")
      .update({ status })
      .eq("id", registrationId)
      .select();
    return { data, error };
  },

  async updateGuestApplicationStatus(applicationId, status, adminNotes = "") {
    const { data, error } = await supabase
      .from("guest_applications")
      .update({
        status,
        admin_notes: adminNotes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", applicationId)
      .select();
    return { data, error };
  },

  // Utility functions
  async checkConnection() {
    try {
      // Test basic connection
      const { data: eventsData, error: eventsError } = await supabase
        .from("events")
        .select("*")
        .limit(1);

      if (eventsError) {
        return { success: false, error: eventsError.message };
      }

      // Test users table
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("*")
        .limit(1);

      if (usersError) {
        return { success: false, error: usersError.message };
      }

      // Test registrations table
      const { data: registrationsData, error: registrationsError } =
        await supabase.from("registrations").select("*").limit(1);

      if (registrationsError) {
        return { success: false, error: registrationsError.message };
      }

      // Test guest_applications table
      const { data: guestData, error: guestError } = await supabase
        .from("guest_applications")
        .select("*")
        .limit(1);

      if (guestError) {
        return { success: false, error: guestError.message };
      }

      return {
        success: true,
        data: {
          events: eventsData?.length || 0,
          users: usersData?.length || 0,
          registrations: registrationsData?.length || 0,
          guest_applications: guestData?.length || 0,
        },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
};

// Create events table
export async function createEventsTable() {
  try {
    const { error } = await supabase.rpc("create_events_table_if_not_exists");
    if (error) {
      console.error("Error creating events table:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Failed to create events table:", err);
    return false;
  }
}

// SQL templates for common operations
export const sqlTemplates = {
  createUsersTable: `
    CREATE TABLE public.users (
      id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      full_name TEXT,
      role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `,

  createEventsTable: `
    CREATE TABLE public.events (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      date TIMESTAMP WITH TIME ZONE NOT NULL,
      location TEXT NOT NULL,
      price DECIMAL(10,2) DEFAULT 0.00,
      max_participants INTEGER DEFAULT 0,
      current_participants INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'completed')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `,

  createRegistrationsTable: `
    CREATE TABLE public.registrations (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
      event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
      payment_method TEXT DEFAULT 'manual',
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(user_id, event_id)
    );
  `,

  createGuestApplicationsTable: `
    CREATE TABLE public.guest_applications (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      message TEXT,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      admin_notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `,
};

export default supabaseHelpers;
