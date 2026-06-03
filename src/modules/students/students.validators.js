// students.validators.js
import { z } from "zod";

export const updateMeSchema = z.object({
  // profile fields

  grade: z.string().max(40).optional(),
  stream: z.string().max(60).optional(),

 gender: z.enum(["Female", "Male", "Others"]).or(z.literal("")).optional(),
  interested: z.string().max(60).optional(),
  highestEducation: z.string().max(60).optional(),

  currentlyPursuing: z.string().max(80).optional(),
  preparingFor: z.string().max(80).optional(),
  occupation: z.string().max(80).optional(),
  lastExamName: z.string().max(80).optional(),
  lastExamYear: z.string().max(10).optional(),
  preparingSince: z.string().max(40).optional(),

  // user fields (basic tab)
  fullName: z.string().max(120).optional(),
  phone: z.string().trim().min(7).max(20).optional(),

});
