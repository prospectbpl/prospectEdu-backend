import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { teacherOverallStudents, upsertOverallStudent } from "./overallPerformance.controller.js";

const router = Router();

router.get("/teacher/students", requireAuth, requireRole("teacher", "admin"), teacherOverallStudents);

router.patch(
  "/teacher/students/:studentId",
  requireAuth,
  requireRole("teacher", "admin"),
  upsertOverallStudent
);

export default router;
