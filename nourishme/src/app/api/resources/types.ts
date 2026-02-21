export interface ResourceItem {
  name: string;
  address: string;
  hours?: string;
  notes?: string;
}

export interface ResourcesResponse {
  zip: string;
  resources: ResourceItem[];
}
