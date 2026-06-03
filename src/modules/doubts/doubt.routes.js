import express from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import multer from "multer";

import {
  createDoubt,
  adminListDoubts,
  adminUpdateDoubtStatus,
  adminAnswerAndEmail,
  adminDeleteDoubt,
} from "./doubt.controller.js";

const router = express.Router();

// image optional upload
const upload = multer({ storage: multer.memoryStorage() });

// PUBLIC: submit doubt
router.post("/", upload.single("image"), createDoubt);

// ADMIN: manage doubts
router.get("/admin", requireAuth, requireRole("admin"), adminListDoubts);
router.patch("/admin/:id/status", requireAuth, requireRole("admin"), adminUpdateDoubtStatus);
router.post("/admin/:id/answer", requireAuth, requireRole("admin"), adminAnswerAndEmail);
router.delete("/admin/:id", requireAuth, requireRole("admin"), adminDeleteDoubt);

export default router;
