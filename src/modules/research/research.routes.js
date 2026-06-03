import express from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { researchUpload } from "../../middlewares/researchUpload.js";

import {
  // PUBLIC
  publicListCategories,
  publicListReports,
  publicGetReportBySlug,

  // TEACHER: categories
  adminCreateCategory,
  adminDeleteCategory,
  adminListCategories,

  // TEACHER: reports
  adminCreateReport,
  adminUpdateReport,
  adminDeleteReport,
  adminListReports,
} from "./research.controller.js";

const router = express.Router();

// ---------- PUBLIC ----------
router.get("/categories", publicListCategories);
router.get("/reports", publicListReports);
router.get("/reports/:slug", publicGetReportBySlug);

// ---------- TEACHER: categories ----------
router.get("/teacher/categories", requireAuth, requireRole("teacher"), adminListCategories);
router.post("/teacher/categories", requireAuth, requireRole("teacher"), adminCreateCategory);
router.delete("/teacher/categories/:id", requireAuth, requireRole("teacher"), adminDeleteCategory);

// ---------- TEACHER: reports ----------
router.get("/teacher/reports", requireAuth, requireRole("teacher"), adminListReports);

router.post(
  "/teacher/reports",
  requireAuth,
  requireRole("teacher"),
  researchUpload.fields([
    { name: "cover", maxCount: 1 },
    { name: "pdfEnglish", maxCount: 1 },
    { name: "pdfHindi", maxCount: 1 },
  ]),
  adminCreateReport
);

router.patch(
  "/teacher/reports/:id",
  requireAuth,
  requireRole("teacher"),
  researchUpload.fields([
    { name: "cover", maxCount: 1 },
    { name: "pdfEnglish", maxCount: 1 },
    { name: "pdfHindi", maxCount: 1 },
  ]),
  adminUpdateReport
);

router.delete("/teacher/reports/:id", requireAuth, requireRole("teacher"), adminDeleteReport);

export default router;
