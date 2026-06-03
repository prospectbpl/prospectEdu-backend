import { Router } from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { purchaseCourse, myPurchases } from "./purchase.controller.js";
import { createCheckout, confirmPurchase ,   createRazorpayOrderForCourse,
  verifyRazorpayPaymentForCourse ,adminListPurchases} from "./purchase.controller.js";
const router = Router();

// Instant purchase (student only)

router.post(
  "/courses/:courseId/checkout",
  requireAuth,
  requireRole("student"),
  createCheckout
);

router.post(
  "/:purchaseId/confirm",
  requireAuth,
  requireRole("student"),
  confirmPurchase
);
router.post(
  "/courses/:courseId/purchase",
  requireAuth,
  requireRole("student"),
  purchaseCourse
);

// List my purchases
router.get(
  "/me",
  requireAuth,
  requireRole("student"),
  myPurchases
);

router.post(
  "/:purchaseId/razorpay/create-order",
  requireAuth,
  requireRole("student"),
  createRazorpayOrderForCourse
);

router.post(
  "/:purchaseId/razorpay/verify",
  requireAuth,
  requireRole("student"),
  verifyRazorpayPaymentForCourse
);
router.get(
  "/admin",
  requireAuth,
  requireRole("admin"),
  adminListPurchases
);
export default router;
