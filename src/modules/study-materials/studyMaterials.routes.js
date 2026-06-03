import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import {
  createStudyMaterial,
  teacherListMyStudyMaterials,
  deleteStudyMaterial,
  studentListStudyMaterials,
  getStudyMaterialFile,
} from "./studyMaterials.controller.js";

const router = Router();

// teacher/admin
router.get("/teacher/mine", requireAuth, requireRole("teacher", "admin"), teacherListMyStudyMaterials);
router.post("/", requireAuth, requireRole("teacher", "admin"), createStudyMaterial);
router.delete("/:id", requireAuth, requireRole("teacher", "admin"), deleteStudyMaterial);

// student
router.get("/student", requireAuth, requireRole("student"), studentListStudyMaterials);
// studyMaterials.routes.js
router.get("/:id/file", requireAuth, requireRole("student" , "teacher"), getStudyMaterialFile);

export default router;
