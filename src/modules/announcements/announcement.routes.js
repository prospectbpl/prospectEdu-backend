import express from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import {
  createAnnouncement,
  listAnnouncements,
  getAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  announcementsForMe,
  announcementsForMeWithRead,
  unreadAnnouncementCount,
  markAnnouncementRead,
} from "./announcement.controller.js";

const router = express.Router();

/**
 * ✅ USER (student/teacher/parent)
 * NOTE: These MUST come before "/:id"
 */
router.get("/me/for-me", requireAuth, announcementsForMe);

// ✅ for bell dropdown (list with isRead)
router.get("/me/list", requireAuth, announcementsForMeWithRead);

// ✅ for bell badge count
router.get("/me/unread-count", requireAuth, unreadAnnouncementCount);

// ✅ mark as read (click on announcement)
router.post("/:id/read", requireAuth, markAnnouncementRead);

/**
 * ✅ ADMIN CRUD
 */
router.get("/", requireAuth, requireRole("admin"), listAnnouncements);
router.post("/", requireAuth, requireRole("admin"), createAnnouncement);
router.get("/:id", requireAuth, requireRole("admin"), getAnnouncement);
router.patch("/:id", requireAuth, requireRole("admin"), updateAnnouncement);
router.delete("/:id", requireAuth, requireRole("admin"), deleteAnnouncement);

export default router;
