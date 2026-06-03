// server/src/modules/uploads/uploads.routes.js
import { Router } from "express";
import { uploadCourseImage } from "./uploads.controller.js";
import {upload} from "../../middlewares/upload.js"; // your multer middleware (memory storage)
import { requireAuth } from "../../middlewares/auth.js"; // adjust to your auth middleware
import { requireRole } from "../../middlewares/auth.js";  // adjust to your RBAC middleware
import { uploadAny } from "../../middlewares/uploadAny.js";
import { uploadLessonFile, uploadAssignmentFile, uploadStudyMaterialFile } from "./uploads.controller.js";

const router = Router();

// POST /api/v1/uploads/course-image
router.post(
  "/course-image",
  requireAuth,
  requireRole("admin"),
  upload.single("image"),
  uploadCourseImage
);
router.post(
  "/lesson-file",
  requireAuth,
  requireRole("teacher"),
  uploadAny.single("file"),
  uploadLessonFile
);
router.post(
  "/assignment-file",
  requireAuth,
  requireRole("teacher"),
  uploadAny.single("file"),
  uploadAssignmentFile
); 
router.post(
  "/study-material-file",
  requireAuth,
  requireRole("teacher"),
  uploadAny.single("file"),
  uploadStudyMaterialFile
);
export default router;
