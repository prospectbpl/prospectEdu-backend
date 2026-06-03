import express from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { upload } from "../../middlewares/upload.js";
import {
  publicListBlogs,
  publicGetBlogBySlug,
  teacherListBlogs,
  teacherCreateBlog,
  teacherUpdateBlog,
  teacherDeleteBlog,
} from "./blog.controller.js";

const router = express.Router();

// ✅ TEACHER ROUTES FIRST (avoid conflict with "/:slug")
router.get("/teacher/mine", requireAuth, requireRole("teacher"), teacherListBlogs);

router.post(
  "/teacher",
  requireAuth,
  requireRole("teacher"),
  upload.single("cover"),
  teacherCreateBlog
);

router.patch(
  "/teacher/:id",
  requireAuth,
  requireRole("teacher"),
  upload.single("cover"),
  teacherUpdateBlog
);

router.delete(
  "/teacher/:id",
  requireAuth,
  requireRole("teacher"),
  teacherDeleteBlog
);

// ✅ PUBLIC ROUTES LAST
router.get("/", publicListBlogs);
router.get("/:slug", publicGetBlogBySlug);

export default router;
