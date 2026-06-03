// server/modules/courses/courses.routes.js
import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import {
  // admin
  adminListCourses,
  adminGetCourse,
  adminUpdateCourse,
  adminDeleteCourse,
  adminSetCourseStatus,
  adminAssignTeachers,
  adminUpdateCourseSettings,
  // base/public
  createCourse,
  listPublishedCourses,
  getCourseById,
  getCourseBySlug,
  // teacher
  teacherMyCourses,
  teacherGetCourseForManagement,
  // student
  enrollInCourse,
  listMyCourses,
  teacherListEnrolledStudents,
} from "./courses.controller.js";

const router = Router();

/**
 * =========================
 * ADMIN (course master)
 * =========================
 * NOTE: keep these BEFORE "/:id"
 */
router.get("/admin", requireAuth, requireRole("admin"), adminListCourses);
router.get("/admin/:id", requireAuth, requireRole("admin"), adminGetCourse);
router.patch("/admin/:id", requireAuth, requireRole("admin"), adminUpdateCourse);
router.patch("/admin/:id/settings", requireAuth, requireRole("admin"), adminUpdateCourseSettings);
router.patch("/admin/:id/status", requireAuth, requireRole("admin"), adminSetCourseStatus);
router.patch("/admin/:id/assign-teachers", requireAuth, requireRole("admin"), adminAssignTeachers);
router.delete("/admin/:id", requireAuth, requireRole("admin"), adminDeleteCourse);

/**
 * Admin creates course (only admin, as per your requirement)
 */
router.post("/", requireAuth, requireRole("admin"), createCourse);

/**
 * =========================
 * TEACHER (assigned courses)
 * =========================
 */
router.get("/teacher/my-courses", requireAuth, requireRole("teacher"), teacherMyCourses);
router.get("/teacher/:courseId", requireAuth, requireRole("teacher"), teacherGetCourseForManagement);

/**
 * =========================
 * STUDENT (keep for later; order matters!)
 * =========================
 */
router.get("/me/enrollments", requireAuth, requireRole("student"), listMyCourses);
router.post("/:id/enroll", requireAuth, requireRole("student"), enrollInCourse);

/**
 * =========================
 * PUBLIC browsing (published only)
 * =========================
 */
router.get("/", listPublishedCourses);
router.get("/slug/:slug", getCourseBySlug);
router.get("/:id", getCourseById);
// server/src/modules/courses/courses.routes.js


// ✅ put this BEFORE: router.get("/teacher/:courseId", ...)
router.get(
  "/teacher/:courseId/students",
  requireAuth,
  requireRole("teacher", "admin"),
  teacherListEnrolledStudents
);

export default router;
