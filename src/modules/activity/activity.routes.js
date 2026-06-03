import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { logActivity, myRecentActivities } from "./activity.controller.js";

const router = Router();

router.post("/log", requireAuth, logActivity);
router.get("/me", requireAuth, myRecentActivities);

export default router;
