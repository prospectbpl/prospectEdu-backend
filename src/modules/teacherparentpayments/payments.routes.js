import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import {
  teacherListParentsPayments,
  teacherAddFeeItem,
  teacherUpdateFeeItem,
  teacherRemoveFeeItem,
  parentGetMyPayments,
} from "./payments.controller.js";

const router = Router();

// Teacher
router.get("/teacher/parents", requireAuth, requireRole("teacher"), teacherListParentsPayments);
router.post(
  "/teacher/parents/:parentId/items",
  requireAuth,
  requireRole("teacher"),
  teacherAddFeeItem
);
router.patch(
  "/teacher/parents/:parentId/items/:itemId",
  requireAuth,
  requireRole("teacher"),
  teacherUpdateFeeItem
);
router.delete(
  "/teacher/parents/:parentId/items/:itemId",
  requireAuth,
  requireRole("teacher"),
  teacherRemoveFeeItem
);

// Parent
router.get("/parent/me", requireAuth, requireRole("parent"), parentGetMyPayments);

export default router;
