type AdminEnvKey =
  | "VITE_ADMIN_API_BASE_URL"
  | "VITE_SUPABASE_URL"
  | "VITE_SUPABASE_ANON_KEY";

function readEnv(key: AdminEnvKey): string {
  const value = import.meta.env[key];
  return typeof value === "string" ? value.trim() : "";
}

export function getRequiredEnv(key: AdminEnvKey): string {
  const value = readEnv(key);

  if (!value) {
    throw new Error(`${key} is required.`);
  }

  return value;
}

export function getAdminApiBaseUrl(): string {
  return getRequiredEnv("VITE_ADMIN_API_BASE_URL").replace(/\/$/, "");
}

export function getSupabaseUrl(): string {
  return getRequiredEnv("VITE_SUPABASE_URL");
}

export function getSupabaseAnonKey(): string {
  return getRequiredEnv("VITE_SUPABASE_ANON_KEY");
}
