import { NextResponse } from "next/server";
import { resolveUserId, getServiceClient } from "@/lib/db";

export async function GET() {
  const userId = await resolveUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = getServiceClient();
  const { data, error } = await sb
    .from("pantry_items")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    console.error("[api/pantry GET]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] });
}

export async function POST(request: Request) {
  const userId = await resolveUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const items: Array<{
    name: string;
    quantity: number;
    unit: string;
    expires_on?: string | null;
  }> = body.items;

  if (!Array.isArray(items)) {
    return NextResponse.json(
      { error: "items must be an array" },
      { status: 400 },
    );
  }

  const sb = getServiceClient();

  // Replace all pantry items for this user (full sync)
  const { error: deleteError } = await sb
    .from("pantry_items")
    .delete()
    .eq("user_id", userId);

  if (deleteError) {
    console.error("[api/pantry POST delete]", deleteError);
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  if (items.length === 0) {
    return NextResponse.json({ items: [] });
  }

  const rows = items
    .filter((i) => i.name?.trim())
    .map((i) => ({
      user_id: userId,
      name: i.name.trim(),
      quantity: i.quantity,
      unit: i.unit,
      expires_on: i.expires_on || null,
    }));

  const { data, error } = await sb
    .from("pantry_items")
    .insert(rows)
    .select();

  if (error) {
    console.error("[api/pantry POST insert]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data });
}
