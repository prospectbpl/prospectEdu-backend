import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import {
  getMyTeacherProfile,
  updateMyTeacherProfile,
} from "./teacherProfile.controller.js";

const router = Router();

router.get(
  "/me",
  requireAuth,
  requireRole("teacher"),
  getMyTeacherProfile
);

router.put(
  "/me",
  requireAuth,
  requireRole("teacher"),
  updateMyTeacherProfile
);

export default router;
