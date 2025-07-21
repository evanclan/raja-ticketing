import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Please check your .env.local file."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
