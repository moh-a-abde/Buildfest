export type ServiceStatus = "ok" | "down";

export interface HealthResponse {
  status: "ok" | "degraded" | "down";
  dependencies: {
    supabase: ServiceStatus;
    anthropic: ServiceStatus;
    vercelAiSdk: ServiceStatus;
  };
}
