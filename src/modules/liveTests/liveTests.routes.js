import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import {
  getOrCreateLiveAttempt,
  saveLiveAttempt,
  submitLiveAttempt,
  getTestReport, // ✅ NEW
} from "./liveTests.controller.js";

const router = Router();

router.get("/:seriesId/tests/:testId", requireAuth, getOrCreateLiveAttempt);
router.put("/attempts/:attemptId/save", requireAuth, saveLiveAttempt);
router.post("/attempts/:attemptId/submit", requireAuth, submitLiveAttempt);

// ✅ NEW report endpoint
router.get("/:seriesId/tests/:testId/report", requireAuth, getTestReport);

export default router;
