import express from "express";

import {
  listJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
  applyToJob,
  listApplications,
  updateApplicationStatus,
} from "./career.controller.js";

import { requireAuth, requireRole } from "../../middlewares/auth.js"; // ✅ SAME as achievers
import { pdfUpload } from "../../middlewares/pdfUpload.js"; // ✅ resume upload (buffer)

const router = express.Router();

// -------------------- PUBLIC --------------------
router.get("/jobs", listJobs);
router.get("/jobs/:id", getJobById);
router.post("/jobs/:id/apply", pdfUpload.single("resume"), applyToJob);

// -------------------- ADMIN (same style as achievers) --------------------
// ✅ IMPORTANT: achievers uses requireRole("admin") (lowercase)
router.post("/admin/jobs", requireAuth, requireRole("admin"), createJob);
router.patch("/admin/jobs/:id", requireAuth, requireRole("admin"), updateJob);
router.delete("/admin/jobs/:id", requireAuth, requireRole("admin"), deleteJob);

router.get("/admin/applications", requireAuth, requireRole("admin"), listApplications);
router.patch(
  "/admin/applications/:id/status",
  requireAuth,
  requireRole("admin"),
  updateApplicationStatus
);

export default router;
