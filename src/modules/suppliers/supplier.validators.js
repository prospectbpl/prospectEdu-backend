import { z } from "zod";

export const applySupplierSchema = z.object({
  shopName: z.string().min(1),
  ownerName: z.string().min(1),
  phone: z.string().min(8),
  email: z.string().email(),
  categories: z.array(z.string()).min(1),

  pickupAddress: z.object({
    addressLine1: z.string().min(1),
    addressLine2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().min(1),
    pincode: z.string().min(4),
    country: z.string().optional(),
  }),

  kyc: z
    .object({
      gstin: z.string().optional(),
      pan: z.string().optional(),
    })
    .optional(),

  bank: z
    .object({
      accountHolderName: z.string().optional(),
      accountNumber: z.string().optional(),
      ifsc: z.string().optional(),
      bankName: z.string().optional(),
    })
    .optional(),
});


export const updateSupplierSchema = z.object({
  shopName: z.string().min(1).optional(),
  ownerName: z.string().min(1).optional(),
  phone: z.string().min(8).optional(),
  

  categories: z.array(z.string()).min(1).optional(),

  pickupAddress: z
    .object({
      addressLine1: z.string().min(1).optional(),
      addressLine2: z.string().optional(),
      city: z.string().min(1).optional(),
      state: z.string().min(1).optional(),
      pincode: z.string().min(4).optional(),
      country: z.string().optional(),
    })
    .optional(),

  // ✅ IMPORTANT: kyc NOT editable (we will ignore even if client sends)
  // kyc: z.any().optional(),

  bank: z
    .object({
      accountHolderName: z.string().optional(),
      accountNumber: z.string().optional(),
      ifsc: z.string().optional(),
      bankName: z.string().optional(),
    })
    .optional(),
});

