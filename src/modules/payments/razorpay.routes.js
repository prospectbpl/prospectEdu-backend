// src/modules/payments/razorpay.routes.js
import { Router } from "express";
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
  debugAuth,

  // ✅ add these
  createRazorpayOrderTestSeries,
  verifyRazorpayPaymentTestSeries,
} from "./razorpay.controller.js";

const router = Router();

let protect;

try {
  const mod = await import("../../middlewares/auth.middleware.js");
  protect = mod.protect || mod.requireAuth || mod.default;
} catch (e) {}

try {
  if (!protect) {
    const mod = await import("../../middlewares/auth.js");
    protect = mod.protect || mod.requireAuth || mod.default;
  }
} catch (e) {}

try {
  if (!protect) {
    const mod = await import("../../middlewares/requireAuth.js");
    protect = mod.requireAuth || mod.default;
  }
} catch (e) {}

if (!protect) {
  const jwt = await import("jsonwebtoken");

  protect = (req, res, next) => {
    try {
      const auth = req.headers.authorization || "";
      const parts = auth.split(" ");
      if (parts.length !== 2 || parts[0] !== "Bearer") {
        return res.status(401).json({ success: false, message: "Unauthorized (no bearer)" });
      }

      const token = parts[1];
      const secret =
        process.env.JWT_ACCESS_SECRET ||
        process.env.ACCESS_TOKEN_SECRET ||
        process.env.JWT_SECRET;

      if (!secret) {
        return res.status(500).json({
          success: false,
          message: "JWT secret missing in env (JWT_ACCESS_SECRET/ACCESS_TOKEN_SECRET/JWT_SECRET)",
        });
      }

      const decoded = jwt.default.verify(token, secret);

      req.decoded = decoded;
      req.auth = decoded;
      req.userId = decoded.sub || decoded.id || decoded._id;
      req.user = req.user || { _id: req.userId, role: decoded.role };

      return next();
    } catch (err) {
      return res.status(401).json({ success: false, message: "Unauthorized (invalid token)" });
    }
  };
}

router.get("/razorpay/debug-auth", protect, debugAuth);

// ✅ Ecom
router.post("/razorpay/create-order", protect, createRazorpayOrder);
router.post("/razorpay/verify", protect, verifyRazorpayPayment);

// ✅ Test Series (NEW)  -> matches your failing URL
router.post("/razorpay/test-series/create-order", protect, createRazorpayOrderTestSeries);
router.post("/razorpay/test-series/verify", protect, verifyRazorpayPaymentTestSeries);

export default router;

