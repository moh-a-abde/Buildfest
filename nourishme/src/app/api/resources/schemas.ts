import { z } from "zod/v4";

export const ResourcesQuerySchema = z.object({
  zip: z.string().min(3).max(10),
});

export const ResourceItemSchema = z.object({
  name: z.string(),
  address: z.string(),
  hours: z.string().optional(),
  notes: z.string().optional(),
});

export const ResourcesResponseSchema = z.object({
  zip: z.string(),
  resources: z.array(ResourceItemSchema),
});
