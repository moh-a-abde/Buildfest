import { NextResponse } from "next/server";
import { getServiceClient, resolveUserId } from "@/lib/db";

interface PlanListItem {
  planId: string;
  estimatedTotalCost: number;
  createdAt: string;
}

export async function GET() {
  try {
    const userId = await resolveUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("plans")
      .select("id, estimated_cost, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("List plans error:", error);
      return NextResponse.json(
        { error: "Failed to fetch plans." },
        { status: 500 },
      );
    }

    const plans: PlanListItem[] = (data ?? []).map((row) => ({
      planId: row.id as string,
      estimatedTotalCost: (row.estimated_cost as number) ?? 0,
      createdAt: row.created_at as string,
    }));

    return NextResponse.json({ plans });
  } catch (error) {
    console.error("List plans error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
