import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get the request body
    const { userId, userEmail } = await req.json();

    // Basic validation
    if (!userId && !userEmail) {
      return new Response(
        JSON.stringify({ error: "User ID or email is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let userToDelete = null;

    // If email provided, find user by email
    if (userEmail) {
      const { data: users, error: findError } =
        await supabaseClient.auth.admin.listUsers();
      if (findError) {
        return new Response(
          JSON.stringify({ error: "Error finding user: " + findError.message }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      userToDelete = users.users.find((user) => user.email === userEmail);
      if (!userToDelete) {
        return new Response(JSON.stringify({ error: "User not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      userToDelete = { id: userId };
    }

    // Delete the user
    const { error: deleteError } = await supabaseClient.auth.admin.deleteUser(
      userToDelete.id
    );

    if (deleteError) {
      return new Response(
        JSON.stringify({
          error: "Error deleting user: " + deleteError.message,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "User deleted successfully",
        deletedUserId: userToDelete.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Internal server error: " + error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
