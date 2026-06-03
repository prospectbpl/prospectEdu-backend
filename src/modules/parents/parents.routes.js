import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { getMyParentProfile, updateMyParentProfile,getMyChildren,
  addChildByPhone,
  removeChild,getMyStudentsOverview } from "./parents.controller.js";

const router = Router();

// Parent profile only (for now)
router.get("/me", requireAuth, requireRole("parent"), getMyParentProfile);
router.patch("/me", requireAuth, requireRole("parent"), updateMyParentProfile);
router.get("/me/children", requireAuth, requireRole("parent"), getMyChildren);
router.post("/me/children", requireAuth, requireRole("parent"), addChildByPhone);
router.delete("/me/children/:studentId", requireAuth, requireRole("parent"), removeChild);
router.get("/me/students", requireAuth, requireRole("parent"), getMyStudentsOverview);
export default router;
