import { Router } from "express";
import * as AuthController from "./auth.controller.js";
import { requireAuth, requireRole } from "../../middlewares/auth.js";

const router = Router();

router.post("/register", AuthController.register);
router.post("/login", AuthController.login);

// ✅ Forgot Password
router.post("/forgot-password", AuthController.forgotPassword);

// ✅ Reset Password
router.post("/reset-password/:token", AuthController.resetPassword);

router.post("/refresh", AuthController.refresh);
router.post("/logout", AuthController.logout);

// Change Password
router.patch("/change-password", requireAuth, AuthController.changeMyPassword);

// Me
router.get("/me", requireAuth, AuthController.me);

// test RBAC quickly
router.get("/admin-only", requireAuth, requireRole("admin"), (req, res) => {
  res.json({ success: true, message: "Welcome admin!" });
});

export default router;
