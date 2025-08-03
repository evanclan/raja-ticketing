import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/supabase";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://vwadfrbnalrkpiygjxhh.supabase.co";
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3YWRmcmJuYWxya3BpeWdqeGhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4NjU4OTcsImV4cCI6MjA2ODQ0MTg5N30.jUFLaVL_WGCtJCR4T2qxkzP5-8HpHKQnZqHLtgNUMCM";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Missing Supabase environment variables. Using fallback values."
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Test function to verify connection
export const testConnection = async () => {
  try {
    const { data, error } = await supabase.from("events").select("*").limit(1);

    if (error) {
      console.error("Supabase connection error:", error);
      return { success: false, error: error.message };
    }

    console.log("Supabase connection successful!");
    return { success: true, data };
  } catch (error) {
    console.error("Connection test failed:", error);
    return { success: false, error: error.message };
  }
};
