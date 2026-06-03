import mongoose from "mongoose";
import { Course } from "../courses/course.model.js";
import { Enrollment } from "../courses/enrollment.model.js";
import { User } from "../users/user.model.js";
import { StudentOverallPerformance } from "./studentOverallPerformance.model.js";

const clamp = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
};

async function getTeacherStudentIds(teacherId) {
  // Find courses assigned to teacher
  const courses = await Course.find({ assignedTeachers: teacherId }).select("_id").lean();
  const courseIds = courses.map((c) => c._id);
  if (!courseIds.length) return [];

  // Find active enrollments in those courses
  const enrollments = await Enrollment.find({ courseId: { $in: courseIds }, status: "active" })
    .select("studentUserId")
    .lean();

  // unique student ids
  return [...new Set(enrollments.map((e) => String(e.studentUserId)))];
}

/**
 * GET /api/v1/performance/teacher/students
 * List all students under this teacher (via assigned courses) + overall performance values
 */
export async function teacherOverallStudents(req, res, next) {
  try {
    const teacherId = req.user.id;

    const studentIdsStr = await getTeacherStudentIds(teacherId);
    const studentIds = studentIdsStr.map((id) => new mongoose.Types.ObjectId(id));

    const students = await User.find({ _id: { $in: studentIds }, role: "student" })
      .select("_id fullName email phone lastLoginAt updatedAt")
      .lean();

    const perfDocs = await StudentOverallPerformance.find({
      teacherId,
      studentId: { $in: studentIds },
    })
      .select("studentId assignmentAvg quizAvg attendance progress updatedAt")
      .lean();

    const perfMap = new Map(perfDocs.map((p) => [String(p.studentId), p]));

    const rows = students.map((s) => {
      const p = perfMap.get(String(s._id));
      return {
        student: {
          _id: s._id,
          fullName: s.fullName || "—",
          email: s.email || "—",
          phone: s.phone || "—",
          lastActive: s.lastLoginAt || s.updatedAt || null,
        },
        performance: {
          assignmentAvg: p?.assignmentAvg ?? 0,
          quizAvg: p?.quizAvg ?? 0,
          attendance: p?.attendance ?? 0,
          progress: p?.progress ?? 0,
          updatedAt: p?.updatedAt ?? null,
        },
      };
    });

    res.json({ success: true, rows });
  } catch (e) {
    next(e);
  }
}

/**
 * PATCH /api/v1/performance/teacher/students/:studentId
 * Upsert overall performance for one student (teacher-scoped)
 */
export async function upsertOverallStudent(req, res, next) {
  try {
    const teacherId = req.user.id;
    const { studentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ success: false, message: "Invalid studentId" });
    }

    // security: teacher can only edit students they actually teach (via assigned courses)
    const allowedStudentIds = await getTeacherStudentIds(teacherId);
    if (!allowedStudentIds.includes(String(studentId))) {
      return res.status(403).json({ success: false, message: "Forbidden: student not under your courses" });
    }

    const body = req.body || {};
    const update = {};
    if (body.assignmentAvg !== undefined) update.assignmentAvg = clamp(body.assignmentAvg);
    if (body.quizAvg !== undefined) update.quizAvg = clamp(body.quizAvg);
    if (body.attendance !== undefined) update.attendance = clamp(body.attendance);
    if (body.progress !== undefined) update.progress = clamp(body.progress);

    const doc = await StudentOverallPerformance.findOneAndUpdate(
      { teacherId, studentId },
      { $set: update },
      { new: true, upsert: true }
    ).select("teacherId studentId assignmentAvg quizAvg attendance progress updatedAt");

    res.json({ success: true, performance: doc });
  } catch (e) {
    next(e);
  }
}
