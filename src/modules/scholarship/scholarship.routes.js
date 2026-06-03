import express from "express";
import {
  registerScholarship,
  getScholarshipResultStatus,
  adminListRegistrations,
  adminUpdateConfig,
  adminUploadResultPdf,
  adminGetConfig,
  adminUpdateRegistration,
} from "./scholarship.controller.js";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { pdfUpload } from "../../middlewares/pdfUpload.js"; // ✅ add

const router = express.Router();

/** PUBLIC */
router.post("/register", registerScholarship);
router.get("/result", getScholarshipResultStatus);

/** ADMIN */
router.get("/admin/registrations", requireAuth, requireRole("admin"), adminListRegistrations);
router.get("/admin/config", requireAuth, requireRole("admin"), adminGetConfig);
router.patch("/admin/config", requireAuth, requireRole("admin"), adminUpdateConfig);

router.post(
  "/admin/upload-result",
  requireAuth,
  requireRole("admin"),
  pdfUpload.single("file"), // ✅ memory upload
  adminUploadResultPdf
);

router.patch("/admin/registrations/:id", requireAuth, requireRole("admin"), adminUpdateRegistration);

export default router;
