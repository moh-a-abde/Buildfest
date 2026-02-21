import { NextResponse } from "next/server";
import { resolveUserId, getServiceClient } from "@/lib/db";

export async function GET() {
  const userId = await resolveUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = getServiceClient();
  const { data, error } = await sb
    .from("budgets")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("[api/budget GET]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ budget: data ?? null });
}

export async function POST(request: Request) {
  const userId = await resolveUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const sb = getServiceClient();

  // Select-then-update-or-insert (works without UNIQUE on user_id)
  const { data: existing } = await sb
    .from("budgets")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  let data;
  if (existing) {
    const { data: updated, error } = await sb
      .from("budgets")
      .update({
        snap_remaining: body.snap_remaining,
        horizon_days: body.horizon_days,
      })
      .eq("user_id", userId)
      .select()
      .single();
    if (error) {
      console.error("[api/budget POST update]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    data = updated;
  } else {
    const { data: inserted, error } = await sb
      .from("budgets")
      .insert({
        user_id: userId,
        snap_remaining: body.snap_remaining,
        horizon_days: body.horizon_days,
      })
      .select()
      .single();
    if (error) {
      console.error("[api/budget POST insert]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    data = inserted;
  }

  return NextResponse.json({ budget: data });
}
