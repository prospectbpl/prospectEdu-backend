import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { upload } from "../../middlewares/upload.js";

import {
  createTestSeries,
  listPublicTestSeries,
  listTeacherMine,
  getTeacherSeriesById, // ✅ NEW
  getTestSeriesById,
  updateTestSeries,
  deleteTestSeries,

  // tests
  listSeriesTests,
  addSeriesTest,
  updateSeriesTest,
  deleteSeriesTest,

  // questions
  getTestQuestions,
  saveTestQuestionsBulk,
} from "./testSeries.controller.js";

const router = Router();

// ✅ Teacher (must come BEFORE "/:id")
router.get("/teacher/mine", requireAuth, listTeacherMine);

// ✅ NEW teacher series detail (works even if hidden)
router.get("/teacher/:id", requireAuth, getTeacherSeriesById);

router.post("/", requireAuth, upload.single("image"), createTestSeries);
router.patch("/:id", requireAuth, upload.single("image"), updateTestSeries);
router.delete("/:id", requireAuth, deleteTestSeries);

// ✅ Tests inside series (Teacher)
router.get("/:id/tests", requireAuth, listSeriesTests);
router.post("/:id/tests", requireAuth, addSeriesTest);
router.patch("/:id/tests/:testId", requireAuth, updateSeriesTest);
router.delete("/:id/tests/:testId", requireAuth, deleteSeriesTest);

// ✅ Questions inside a test (Teacher)
router.get("/:id/tests/:testId/questions", requireAuth, getTestQuestions);
router.put("/:id/tests/:testId/questions/bulk", requireAuth, saveTestQuestionsBulk);

// ✅ Public
router.get("/", listPublicTestSeries);
router.get("/:id", getTestSeriesById);

export default router;
