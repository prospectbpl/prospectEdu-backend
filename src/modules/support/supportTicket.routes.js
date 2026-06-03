import express from "express";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import { researchUpload } from "../../middlewares/researchUpload.js";

import {
  createTicket,
  myTickets,
  teacherInbox,
  getTicket,
  addTicketMessage,
  togglePin,
  toggleResolved,
} from "./supportTicket.controller.js";

const router = express.Router();

// Student
router.post("/", requireAuth, requireRole("student"), researchUpload.single("file"), createTicket);
router.get("/me", requireAuth, requireRole("student"), myTickets);

// Teacher
router.get("/teacher/inbox", requireAuth, requireRole("teacher"), teacherInbox);
router.patch("/:id/pin", requireAuth, requireRole("teacher"), togglePin);
router.patch("/:id/resolved", requireAuth, requireRole("teacher"), toggleResolved);

// Thread
router.get("/:id", requireAuth, getTicket);
router.post("/:id/messages", requireAuth, researchUpload.single("file"), addTicketMessage);

export default router;
