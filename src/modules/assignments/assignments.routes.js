import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { uploadAny } from "../../middlewares/uploadAny.js";
import { Assignment } from "./assignments.model.js";
import { assertStudentHasCourseAccess } from "../../utils/courseAccess.js";
import { studentListAssignments } from "./assignments.controller.js";
import { Course } from "../courses/course.model.js"; // optional if needed

import https from "https";
import {
  createAssignment,
  teacherListAssignments,
  updateAssignment,
  deleteAssignment,
} from "./assignments.controller.js";

const router = Router();

// ✅ Create assignment (file optional)
router.post(
  "/courses/:courseId",
  requireAuth,
  requireRole("admin", "teacher"),
  uploadAny.single("file"),
  createAssignment
);

// ✅ List assignments for a course (teacher/admin)
router.get(
  "/teacher/courses/:courseId",
  requireAuth,
  requireRole("admin", "teacher"),
  teacherListAssignments
);

// ✅ Update assignment meta
router.patch(
  "/:assignmentId",
  requireAuth,
  requireRole("admin", "teacher"),
  updateAssignment
);
router.get(
  "/courses/:courseId",
  requireAuth,
  requireRole("admin", "teacher", "student"),
  studentListAssignments
);

// ✅ Delete assignment + cloudinary
router.delete(
  "/:assignmentId",
  requireAuth,
  requireRole("admin", "teacher"),
  deleteAssignment
);
// ADD this helper ABOVE the route (or near other helpers)
async function assertTeacherAssignedOrAdmin(user, courseId) {
  if (user.role === "admin") return true;

  if (user.role !== "teacher") {
    const err = new Error("Forbidden");
    err.statusCode = 403;
    throw err;
  }

  const course = await Course.findById(courseId).select("assignedTeachers");
  if (!course) {
    const err = new Error("Course not found");
    err.statusCode = 404;
    throw err;
  }

  const ok = (course.assignedTeachers || []).some(
    (t) => String(t) === String(user.id)
  );

  if (!ok) {
    const err = new Error("You are not assigned to this course");
    err.statusCode = 403;
    throw err;
  }

  return true;
}


// ✅ REPLACE the old file route with THIS one
router.get("/:assignmentId/file", requireAuth, async (req, res, next) => {
  try {
    const a = await Assignment.findById(req.params.assignmentId).select(
      "courseId fileUrl fileName mimeType"
    );

    if (!a) return res.status(404).json({ success: false, message: "Assignment not found" });
if (!a.fileUrl) return res.status(404).json({ success: false, message: "No attachment for this assignment" });


    // 🔐 ROLE-BASED ACCESS CONTROL
    if (req.user.role === "student") {
      await assertStudentHasCourseAccess(req.user.id, a.courseId);
    } else {
      // teacher / admin
      await assertTeacherAssignedOrAdmin(req.user, a.courseId);
    }

    res.setHeader("Content-Type", a.mimeType || "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(a.fileName || "attachment.pdf")}"`
    );

    https.get(a.fileUrl, (fileRes) => {
      if (fileRes.statusCode && fileRes.statusCode >= 400) {
        return res.status(fileRes.statusCode).end();
      }
      fileRes.pipe(res);
    }).on("error", (err) => next(err));
  } catch (e) {
    next(e);
  }
});




export default router;
