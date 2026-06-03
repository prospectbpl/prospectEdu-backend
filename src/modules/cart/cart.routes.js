import express from "express";
import { requireAuth } from "../../middlewares/auth.js";
import {
  getMyCart,
  addCartItem,
  updateCartItemQty,
  removeCartItem,
  clearCart,
} from "./cart.controller.js";

const router = express.Router();

router.get("/", requireAuth, getMyCart);
router.post("/items", requireAuth, addCartItem);
router.patch("/items/:productId", requireAuth, updateCartItemQty);
router.delete("/items/:productId", requireAuth, removeCartItem);
router.delete("/", requireAuth, clearCart);

export default router;
