import mongoose from "mongoose";
import { Enrollment } from "../modules/courses/enrollment.model.js"; // ✅ adjust folder name if needed

export async function assertStudentHasCourseAccess(studentUserId, courseId) {
  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    const err = new Error("Invalid course id");
    err.statusCode = 400;
    throw err;
  }

  const enrollment = await Enrollment.findOne({
    studentUserId,
    courseId,
    status: { $in: ["active", "completed"] },
  }).lean();

  if (enrollment) return true;

  const err = new Error("You have not purchased this course");
  err.statusCode = 403;
  throw err;
}
