import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import type { HealthResponse, ServiceStatus } from "./types";

/*
  GET /api/health

  Returns the status of all service dependencies.
  Used for monitoring and pre-demo validation.
*/

async function checkSupabase(): Promise<ServiceStatus> {
  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase.from("profiles").select("id").limit(1);
    return error ? "down" : "ok";
  } catch {
    return "down";
  }
}

async function checkAnthropic(): Promise<ServiceStatus> {
  return process.env.ANTHROPIC_API_KEY &&
    process.env.ANTHROPIC_API_KEY !== "your-anthropic-api-key-here"
    ? "ok"
    : "down";
}

async function checkVercelAiSdk(): Promise<ServiceStatus> {
  try {
    await import("ai");
    return "ok";
  } catch {
    return "down";
  }
}

export async function GET() {
  const [supabase, anthropic, vercelAiSdk] = await Promise.all([
    checkSupabase(),
    checkAnthropic(),
    checkVercelAiSdk(),
  ]);

  const dependencies = { supabase, anthropic, vercelAiSdk };

  const statuses = Object.values(dependencies);
  const allOk = statuses.every((s) => s === "ok");
  const allDown = statuses.every((s) => s === "down");

  const response: HealthResponse = {
    status: allOk ? "ok" : allDown ? "down" : "degraded",
    dependencies,
  };

  return NextResponse.json(response, {
    status: response.status === "down" ? 503 : 200,
  });
}
