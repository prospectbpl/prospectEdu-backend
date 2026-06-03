import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import {
  createParentDoubt,
  getParentDoubts,
  getTeacherDoubts,
  answerParentDoubt,
} from "./parentDoubt.controller.js";

const router = Router();

const only = (role) => (req, res, next) => {
  if (req.user?.role !== role) return res.status(403).json({ message: "Forbidden" });
  next();
};

// Parent
router.post("/", requireAuth, only("parent"), createParentDoubt);
router.get("/me", requireAuth, only("parent"), getParentDoubts);

// Teacher
router.get("/teacher/inbox", requireAuth, only("teacher"), getTeacherDoubts);
router.patch("/:id/answer", requireAuth, only("teacher"), answerParentDoubt);

export default router;
