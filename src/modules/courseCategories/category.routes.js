import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listPublicCategories,
} from "./category.controller.js";

const router = Router();

// admin only
router.get("/", requireAuth, requireRole("admin"), listCategories);
router.post("/", requireAuth, requireRole("admin"), createCategory);
router.patch("/:id", requireAuth, requireRole("admin"), updateCategory);
router.delete("/:id", requireAuth, requireRole("admin"), deleteCategory);
// public route (for navbar / website)
router.get("/public", listPublicCategories);


export default router;
