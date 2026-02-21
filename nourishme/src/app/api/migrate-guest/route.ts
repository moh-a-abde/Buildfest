import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getServiceClient } from "@/lib/db";

/**
 * POST /api/migrate-guest
 * Transfers all data owned by a guest_id to the currently authenticated user.
 */
export async function POST(request: Request) {
  const { guest_id } = await request.json();
  if (!guest_id || typeof guest_id !== "string") {
    return NextResponse.json(
      { error: "guest_id is required" },
      { status: 400 },
    );
  }

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

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const sb = getServiceClient();
  const userId = user.id;
  const migrated: string[] = [];

  // Migrate profile
  const { data: guestProfile } = await sb
    .from("profiles")
    .select("*")
    .eq("user_id", guest_id)
    .single();

  if (guestProfile) {
    const { data: existingProfile } = await sb
      .from("profiles")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (!existingProfile) {
      await sb
        .from("profiles")
        .update({ user_id: userId, updated_at: new Date().toISOString() })
        .eq("id", guestProfile.id);
      migrated.push("profile");
    } else {
      await sb.from("profiles").delete().eq("id", guestProfile.id);
    }
  }

  // Migrate budget
  const { data: guestBudget } = await sb
    .from("budgets")
    .select("*")
    .eq("user_id", guest_id)
    .single();

  if (guestBudget) {
    const { data: existingBudget } = await sb
      .from("budgets")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (!existingBudget) {
      await sb
        .from("budgets")
        .update({ user_id: userId, updated_at: new Date().toISOString() })
        .eq("id", guestBudget.id);
      migrated.push("budget");
    } else {
      await sb.from("budgets").delete().eq("id", guestBudget.id);
    }
  }

  // Migrate pantry items
  const { data: guestPantry } = await sb
    .from("pantry_items")
    .select("id")
    .eq("user_id", guest_id);

  if (guestPantry && guestPantry.length > 0) {
    const { data: existingPantry } = await sb
      .from("pantry_items")
      .select("id")
      .eq("user_id", userId);

    if (!existingPantry || existingPantry.length === 0) {
      await sb
        .from("pantry_items")
        .update({ user_id: userId })
        .eq("user_id", guest_id);
      migrated.push("pantry");
    } else {
      await sb.from("pantry_items").delete().eq("user_id", guest_id);
    }
  }

  return NextResponse.json({ migrated });
}
