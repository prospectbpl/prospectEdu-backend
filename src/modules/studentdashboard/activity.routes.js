import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import {
  markLessonWatched,
  getLessonWatchCount,
} from "./activity.controller.js";

const router = Router();

router.post(
  "/lesson-watch/:lessonId",
  requireAuth,
  requireRole("student"),
  markLessonWatched
);

router.get(
  "/lesson-watch/count",
  requireAuth,
  requireRole("student"),
  getLessonWatchCount
);

export default router;
