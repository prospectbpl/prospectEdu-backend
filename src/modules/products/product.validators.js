import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(1, "Product name required"),
  description: z.string().optional().default(""),

  category: z.string().min(1, "Category required"),
  customCategory: z.string().optional().default(""),

  price: z.coerce.number().min(0),
  offerPrice: z.coerce.number().min(0),
  quantity: z.coerce.number().int().min(0),

  images: z.array(z.string().url()).optional().default([]),
});
