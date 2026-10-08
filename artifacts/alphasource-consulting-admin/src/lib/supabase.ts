import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/env";

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    const isPasswordReset = typeof window !== "undefined" && window.location.pathname.endsWith("/reset-password");
    supabaseClient = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      auth: { detectSessionInUrl: !isPasswordReset },
    });
  }

  return supabaseClient;
}
