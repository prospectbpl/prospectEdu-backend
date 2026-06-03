import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { createLesson,updateModule,
  deleteModule, studentModulesOverview, createModule,updateLesson, listLessons, listModules,deleteLesson, teacherGetModulesWithLessons ,getLessonFile, } from "./content.controller.js";

const router = Router();

// teacher/admin create module
router.post("/courses/:courseId/modules", requireAuth, requireRole("admin", "teacher"), createModule);

// student list modules (enrolled)
router.get("/courses/:courseId/modules", requireAuth, requireRole("student"), listModules);

// teacher/admin create lesson
router.post("/modules/:moduleId/lessons", requireAuth, requireRole("admin", "teacher"), createLesson);

// student list lessons (enrolled)
router.get("/modules/:moduleId/lessons", requireAuth, requireRole("student"), listLessons);

router.get(
  "/teacher/courses/:courseId/modules",
  requireAuth,
  requireRole("admin", "teacher"),
  teacherGetModulesWithLessons
);
router.delete(
  "/lessons/:lessonId",
  requireAuth,
  requireRole("admin", "teacher"),
  deleteLesson
);
router.patch(
  "/lessons/:lessonId",
  requireAuth,
  requireRole("admin", "teacher"),
  updateLesson
);
router.get("/lessons/:lessonId/file", getLessonFile);
router.get(
  "/student/courses/:courseId/modules-overview",
  requireAuth,
  requireRole("student"),
  studentModulesOverview
);
router.patch(
  "/modules/:moduleId",
  requireAuth,
  requireRole("admin", "teacher"),
  updateModule
);

// ✅ NEW: delete module (teacher/admin)
router.delete(
  "/modules/:moduleId",
  requireAuth,
  requireRole("admin", "teacher"),
  deleteModule
);

export default router;
