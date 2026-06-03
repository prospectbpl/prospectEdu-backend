import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { getAdminDashboardStats } from "./adminDashboard.controller.js";

const router = Router();

router.get(
  "/dashboard/stats",
  requireAuth,
  requireRole("admin"),
  getAdminDashboardStats
);

export default router;
