import express from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import {
  createContactRequest,
  adminListContactRequests,
  adminUpdateContactStatus,
} from "./contact.controller.js";

const router = express.Router();

// Public
router.post("/", createContactRequest);

// Admin
router.get("/admin", requireAuth, requireRole("admin"), adminListContactRequests);
router.patch("/admin/:id/status", requireAuth, requireRole("admin"), adminUpdateContactStatus);

export default router;
