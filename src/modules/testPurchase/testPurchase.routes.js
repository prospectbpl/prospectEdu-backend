import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import {
  confirmPurchase,
  myPurchasedSeries,
  hasPurchased,
  mySeriesDetails, // ✅ NEW
  adminListPurchases,
} from "./testPurchase.controller.js";

const router = Router();

router.post("/confirm", requireAuth, confirmPurchase);
router.get("/mine", requireAuth, myPurchasedSeries);
router.get("/has/:id", requireAuth, hasPurchased);

// ✅ This is REQUIRED because frontend calls this:
router.get("/me/series/:seriesId", requireAuth, mySeriesDetails);
router.get("/admin/all", requireAuth, adminListPurchases);

export default router;
