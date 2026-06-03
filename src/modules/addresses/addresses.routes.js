import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import {
  getMyAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
} from "./addresses.controller.js";

const router = Router();

router.get("/", requireAuth, getMyAddresses);
router.post("/", requireAuth, addAddress);
router.put("/:id", requireAuth, updateAddress);
router.delete("/:id", requireAuth, deleteAddress);

export default router;
