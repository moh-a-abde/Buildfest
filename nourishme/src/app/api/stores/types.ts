export interface SnapStore {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  storeType: string;
  latitude: number;
  longitude: number;
  healthyIncentives: boolean;
}

export interface StoresResponse {
  zip: string;
  stores: SnapStore[];
  source: "usda_api" | "fallback";
  cachedAt?: string;
}
