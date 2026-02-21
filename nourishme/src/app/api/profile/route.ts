import { NextResponse } from "next/server";
import { resolveUserId, getServiceClient } from "@/lib/db";

export async function GET() {
  const userId = await resolveUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = getServiceClient();
  const { data, error } = await sb
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("[api/profile GET]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: data ?? null });
}

export async function POST(request: Request) {
  const userId = await resolveUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const sb = getServiceClient();

  const { data, error } = await sb
    .from("profiles")
    .upsert(
      {
        user_id: userId,
        household_size: body.household_size,
        zip_code: body.zip_code,
        dietary_flags: body.dietary_flags,
        cooking_time_level: body.cooking_time_level,
      },
      { onConflict: "user_id" },
    )
    .select()
    .single();

  if (error) {
    console.error("[api/profile POST]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}
