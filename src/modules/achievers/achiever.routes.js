import express from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { upload } from "../../middlewares/upload.js"; // ✅ your image multer
import { listAchievers, createAchiever, deleteAchiever } from "./achiever.controller.js";

const router = express.Router();

// PUBLIC
router.get("/", listAchievers);

// ADMIN
router.post("/admin", requireAuth, requireRole("admin"), upload.single("img"), createAchiever);
router.delete("/admin/:id", requireAuth, requireRole("admin"), deleteAchiever);

export default router;
