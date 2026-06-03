import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { uploadAny } from "../../middlewares/uploadAny.js";
import {
  teacherListStudents,
  teacherGetStudentReports,
  teacherUploadStudentReports,
  teacherDeleteStudentReport,
  parentGetChildReports,
  downloadFile,
} from "./reports.controller.js";

const router = Router();

// Teacher
router.get("/teacher/students", requireAuth, requireRole("teacher"), teacherListStudents);
router.get("/teacher/students/:studentId", requireAuth, requireRole("teacher"), teacherGetStudentReports);
router.post(
  "/teacher/students/:studentId/files",
  requireAuth,
  requireRole("teacher"),
  uploadAny.array("files", 10),
  teacherUploadStudentReports
);
router.delete(
  "/teacher/students/:studentId/files/:fileId",
  requireAuth,
  requireRole("teacher"),
  teacherDeleteStudentReport
);

// Parent
router.get("/parent/students/:studentId", requireAuth, requireRole("parent"), parentGetChildReports);
router.get("/files/:fileId/download", requireAuth, downloadFile);
export default router;
