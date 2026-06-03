import { StudentProfile } from "./students.model.js";

export async function ensureStudentProfile(userId) {
  const existing = await StudentProfile.findOne({ userId });
  if (existing) return existing;

  return StudentProfile.create({
    userId,
  });
}
