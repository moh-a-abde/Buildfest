import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

// Placeholders for build-time when env vars are missing (e.g. Railway build step).
// Env vars are read at call time so runtime gets real values.
const BUILD_PLACEHOLDER_URL = "https://placeholder.supabase.co";
const BUILD_PLACEHOLDER_KEY = "placeholder-key";

export function createBrowserSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || BUILD_PLACEHOLDER_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || BUILD_PLACEHOLDER_KEY;
  return createBrowserClient(url, key);
}

export function createServerSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || BUILD_PLACEHOLDER_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || BUILD_PLACEHOLDER_KEY;
  return createClient(url, key);
}
