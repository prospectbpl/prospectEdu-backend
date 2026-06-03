import express from "express";
import { requireAuth } from "../../middlewares/auth.js";
import {
  getMyWishlist,
  addWishlistItem,
  removeWishlistItem,
  clearWishlist,
} from "./wishlist.controller.js";

const router = express.Router();

router.get("/", requireAuth, getMyWishlist);
router.post("/items", requireAuth, addWishlistItem);
router.delete("/items/:productId", requireAuth, removeWishlistItem);
router.delete("/", requireAuth, clearWishlist);

export default router;
