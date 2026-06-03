import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { getMyStudentProfile, updateMyStudentProfile, getStudentDetails, getStudentProfileByIdAdmin } from "./students.controller.js";

const router = Router();

// Student self routes
router.get("/me", requireAuth, requireRole("student"), getMyStudentProfile);
router.patch("/me", requireAuth, requireRole("student"), updateMyStudentProfile);
router.get(
  "/:studentId",
  requireAuth,
  requireRole("admin"),
  getStudentProfileByIdAdmin
);
router.get("/:studentId/details", requireAuth, getStudentDetails);
export default router;
