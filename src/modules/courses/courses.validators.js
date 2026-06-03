import { z } from "zod";

export const createCourseSchema = z.object({
  title: z.string().min(3),
  category: z.string().optional(),

  short: z.string().optional(),
  description: z.string().optional(),
  info: z.string().optional(),

  assignedTeachers: z.array(z.string()).optional(),

  price: z.coerce.number().optional(),
  discount: z.coerce.number().optional(),
  tax: z.coerce.number().optional(),

  date: z.string().optional(),
  img: z.string().optional(),

  tags: z.array(z.string()).optional(),
});

export const updateCourseSchema = createCourseSchema.partial();

export const setCourseStatusSchema = z.object({
  status: z.enum(["draft", "published", "archived"]),
});

export const assignTeachersSchema = z.object({
  teacherIds: z.array(z.string()),
});
