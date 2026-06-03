import express from "express";
import * as controller from "./category.controller.js";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { upload } from "../../middlewares/upload.js";

const router = express.Router();

// public (everyone)
router.get("/", controller.list);

// admin CRUD
router.post(
  "/",
  requireAuth,
  requireRole("admin"),
  upload.single("image"),
  controller.create
);

router.patch(
  "/:id",
  requireAuth,
  requireRole("admin"),
  upload.single("image"),
  controller.update
);

router.delete(
  "/:id",
  requireAuth,
  requireRole("admin"),
  controller.remove
);

export default router;
