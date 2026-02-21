import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "./supabase";

/**
 * Resolve the effective user ID from the request.
 * Returns the authenticated Supabase user ID or the guest ID from cookies.
 */
export async function resolveUserId(): Promise<string | null> {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) return user.id;

  const guestCookie = cookieStore.get("nourishme_guest_id");
  if (guestCookie?.value) return guestCookie.value;

  return null;
}

/**
 * Server-side Supabase client that bypasses RLS.
 * Used in API routes to read/write data for any user (auth or guest).
 */
export function getServiceClient() {
  return createServerSupabaseClient();
}
