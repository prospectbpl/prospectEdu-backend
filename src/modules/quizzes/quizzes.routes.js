import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import {
  createQuiz,
  teacherListQuizzes,
  getQuiz,
  updateQuiz,
  publishQuiz,
  deleteQuiz,
   studentListPublishedQuizzes,
  getQuizForPlay,
  submitQuizAttempt,
  listMyQuizAttempts,
} from "./quizzes.controller.js";

const router = Router();

router.post(
  "/courses/:courseId",
  requireAuth,
  requireRole("admin", "teacher"),
  createQuiz
);

router.get(
  "/teacher/courses/:courseId",
  requireAuth,
  requireRole("admin", "teacher"),
  teacherListQuizzes
);

router.get(
  "/:quizId",
  requireAuth,
  requireRole("admin", "teacher"),
  getQuiz
);

router.patch(
  "/:quizId",
  requireAuth,
  requireRole( "teacher"),
  updateQuiz
);

router.post(
  "/:quizId/publish",
  requireAuth,
  requireRole("teacher"),
  publishQuiz
);
router.delete(
  "/:quizId",
  requireAuth,
  requireRole( "teacher"),
  deleteQuiz
);
router.get(
  "/courses/:courseId/published",
  requireAuth,
  requireRole("admin", "teacher", "student"),
  studentListPublishedQuizzes
);

router.get(
  "/:quizId/play",
  requireAuth,
  requireRole("student", "admin", "teacher"),
  getQuizForPlay
);

router.post(
  "/:quizId/attempts",
  requireAuth,
  requireRole("student"),
  submitQuizAttempt
);

router.get(
  "/:quizId/attempts/me",
  requireAuth,
  requireRole("student"),
  listMyQuizAttempts
);


export default router;
