import express from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import {
  createOrder,
  myOrders,
  supplierOrders,
  updateItemStatus,
  supplierStats,
  getMyOrderByOrderId,

  // ✅ ADMIN
  adminAllOrders,
  adminGetOrderByOrderId,
  adminUpdateItemStatus,
  adminOrderStats,
} from "./order.controller.js";

const router = express.Router();

// user place order
router.post("/", requireAuth, createOrder);

// user my orders
router.get("/mine", requireAuth, myOrders);

// supplier orders + status update + stats
router.get("/supplier", requireAuth, requireRole("supplier"), supplierOrders);
router.patch("/items/:itemId/status", requireAuth, requireRole("supplier"), updateItemStatus);
router.get("/supplier/stats", requireAuth, requireRole("supplier"), supplierStats);

// ✅ ADMIN: all orders + detail + update (admin products only)
router.get("/admin", requireAuth, requireRole("admin"), adminAllOrders);
router.get("/admin/:orderId", requireAuth, requireRole("admin"), adminGetOrderByOrderId);
router.patch("/admin/items/:itemId/status", requireAuth, requireRole("admin"), adminUpdateItemStatus);
router.get("/admin/stats", requireAuth, requireRole("admin"), adminOrderStats);


// user: single order detail by orderId
router.get("/:orderId", requireAuth, getMyOrderByOrderId);

export default router;
