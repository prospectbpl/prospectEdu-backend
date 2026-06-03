// src/modules/donations/donation.routes.js
import express from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import {
  createRazorpayDonationOrder,
  verifyRazorpayDonationPayment,
  adminListDonations,
  getDonationById,
} from "./donation.controller.js";

const router = express.Router();

// Public
router.post("/razorpay/order", createRazorpayDonationOrder);
router.post("/razorpay/verify", verifyRazorpayDonationPayment);

// ✅ Admin MUST come before "/:id"
router.get("/admin", requireAuth, requireRole("admin"), adminListDonations);

// ✅ Keep this last
router.get("/:id", getDonationById);

export default router;
