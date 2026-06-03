import express from "express";
import * as controller from "./supplier.controller.js";
import { requireAuth, requireRole } from "../../middlewares/auth.js";

const router = express.Router();

// logged-in user
router.get("/me", requireAuth, controller.getMe);
router.get("/me/status", requireAuth, controller.myStatus); // ✅ NEW
router.post("/apply", requireAuth, controller.apply);
router.patch("/me", requireAuth, controller.updateMe);

// admin
router.get("/applications", requireAuth, requireRole("admin"), controller.list);

router.patch("/:id/approve", requireAuth, requireRole("admin"), controller.approve);
router.patch("/:id/reject", requireAuth, requireRole("admin"), controller.reject);

// ✅ NEW: block/unblock
router.patch("/:id/block", requireAuth, requireRole("admin"), controller.block);
router.patch("/:id/unblock", requireAuth, requireRole("admin"), controller.unblock);

export default router;
