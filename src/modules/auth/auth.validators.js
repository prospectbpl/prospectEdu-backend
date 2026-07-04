import { z } from "zod";

export const registerSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().min(7).max(20).optional(),
  password: z.string().min(6).max(72),
  city: z.string(),
  state: z.string(),
  role: z.enum(["admin", "student", "parent", "teacher", "supplier"]),
});

export const loginSchema = z.object({
  phone: z.string().min(7).max(20),
  password: z.string().min(6).max(72),
});
export const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(6).max(72),
    newPassword: z.string().min(6).max(72),
    confirmPassword: z.string().min(6).max(72),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "New password and confirm password do not match",
    path: ["confirmPassword"],
  })
  .refine((d) => d.oldPassword !== d.newPassword, {
    message: "New password must be different from old password",
    path: ["newPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(6).max(72),
  confirmPassword: z.string().min(6).max(72),
})
.refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});



