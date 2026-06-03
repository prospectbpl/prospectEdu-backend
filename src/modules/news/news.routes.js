import express from "express";
import multer from "multer";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import {
  publicGetCategories,
  publicGetNews,
  publicGetNewsBySlug,
  teacherCreateCategory,
  teacherDeleteCategory,
  teacherCreateNews,
  teacherUpdateNews,
  teacherDeleteNews,
  teacherListNews,
} from "./news.controller.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// PUBLIC
router.get("/categories", publicGetCategories);
router.get("/", publicGetNews);
router.get("/:slug", publicGetNewsBySlug);

// TEACHER
router.get("/teacher/list", requireAuth, requireRole("teacher"), teacherListNews);
router.post("/teacher/category", requireAuth, requireRole("teacher"), teacherCreateCategory);
router.delete("/teacher/category/:id", requireAuth, requireRole("teacher"), teacherDeleteCategory);

router.post("/teacher", requireAuth, requireRole("teacher"), upload.single("img"), teacherCreateNews);
router.patch("/teacher/:id", requireAuth, requireRole("teacher"), upload.single("img"), teacherUpdateNews);
router.delete("/teacher/:id", requireAuth, requireRole("teacher"), teacherDeleteNews);

export default router;
