import mongoose from "mongoose";
import Announcement from "./announcement.model.js";
import AnnouncementRead from "./announcementRead.model.js";

/**
 * ✅ ADMIN: Create announcement
 * POST /api/v1/announcements
 */
export async function createAnnouncement(req, res, next) {
  try {
    const { title, description, recipients,category } = req.body;

    if (!title?.trim()) return res.status(400).json({ success: false, message: "Title required" });
    if (!description?.trim())
      return res.status(400).json({ success: false, message: "Description required" });
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ success: false, message: "Select at least one recipient" });
    }

    const doc = await Announcement.create({
      title: title.trim(),
      description: description.trim(),
      recipients,
      createdBy: req.user.id,
     category: category || "General",
    });

    return res.status(201).json({ success: true, data: doc });
  } catch (e) {
    next(e);
  }
}

/**
 * ✅ ADMIN: List all announcements
 * GET /api/v1/announcements?page=1&limit=10
 */
export async function listAnnouncements(req, res, next) {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(50, Math.max(1, Number(req.query.limit || 10)));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Announcement.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      Announcement.countDocuments(),
    ]);

    res.json({
      success: true,
      data: items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (e) {
    next(e);
  }
}

/**
 * ✅ ADMIN: Get one
 * GET /api/v1/announcements/:id
 */
export async function getAnnouncement(req, res, next) {
  try {
    const doc = await Announcement.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: "Announcement not found" });
    res.json({ success: true, data: doc });
  } catch (e) {
    next(e);
  }
}

/**
 * ✅ ADMIN: Update (optional)
 * PATCH /api/v1/announcements/:id
 */
export async function updateAnnouncement(req, res, next) {
  try {
    const { title, description, recipients, category  } = req.body;

    const update = {};
    if (title !== undefined) update.title = String(title).trim();
    if (description !== undefined) update.description = String(description).trim();
    if (category !== undefined) update.category = String(category || "General").trim();
    if (recipients !== undefined) update.recipients = recipients;

    if (
      update.recipients !== undefined &&
      (!Array.isArray(update.recipients) || update.recipients.length === 0)
    ) {
      return res.status(400).json({ success: false, message: "Select at least one recipient" });
    }

    const doc = await Announcement.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!doc) return res.status(404).json({ success: false, message: "Announcement not found" });

    res.json({ success: true, data: doc });
  } catch (e) {
    next(e);
  }
}

/**
 * ✅ ADMIN: Delete
 * DELETE /api/v1/announcements/:id
 */
export async function deleteAnnouncement(req, res, next) {
  try {
    const doc = await Announcement.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: "Announcement not found" });

    // cleanup read markers (optional but good)
    await AnnouncementRead.deleteMany({ announcementId: doc._id });

    res.json({ success: true, message: "Announcement deleted" });
  } catch (e) {
    next(e);
  }
}

/**
 * ✅ USER: Basic list by role (no read/unread)
 * GET /api/v1/announcements/me/for-me
 */
export async function announcementsForMe(req, res, next) {
  try {
    const role = String(req.user.role || "").toLowerCase(); // student|teacher|parent
    const items = await Announcement.find({ recipients: role }).sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, data: items });
  } catch (e) {
    next(e);
  }
}

/**
 * ✅ USER: List by role WITH isRead
 * GET /api/v1/announcements/me/list
 * returns: [{..., isRead: true/false}]
 */
export async function announcementsForMeWithRead(req, res, next) {
  try {
    const role = String(req.user.role || "").toLowerCase();
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const items = await Announcement.aggregate([
      { $match: { recipients: role } },
      { $sort: { createdAt: -1 } },
      { $limit: 50 },
      {
        $lookup: {
          from: "announcementreads",
          let: { aId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$announcementId", "$$aId"] },
                    { $eq: ["$userId", userId] },
                  ],
                },
              },
            },
            { $limit: 1 },
          ],
          as: "readDoc",
        },
      },
      {
        $addFields: {
          isRead: { $gt: [{ $size: "$readDoc" }, 0] },
        },
      },
      { $project: { readDoc: 0 } },
    ]);

    res.json({ success: true, data: items });
  } catch (e) {
    next(e);
  }
}

/**
 * ✅ USER: Unread count (for bell badge)
 * GET /api/v1/announcements/me/unread-count
 * returns: { unread: number }
 */
export async function unreadAnnouncementCount(req, res, next) {
  try {
    const role = String(req.user.role || "").toLowerCase();
    const userId = new mongoose.Types.ObjectId(req.user.id);

    // Count unread announcements for this user's role
    const result = await Announcement.aggregate([
      { $match: { recipients: role } },
      {
        $lookup: {
          from: "announcementreads",
          let: { aId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$announcementId", "$$aId"] },
                    { $eq: ["$userId", userId] },
                  ],
                },
              },
            },
            { $limit: 1 },
          ],
          as: "readDoc",
        },
      },
      { $match: { readDoc: { $size: 0 } } }, // only unread
      { $count: "unread" },
    ]);

    const unread = result?.[0]?.unread || 0;
    res.json({ success: true, data: { unread } });
  } catch (e) {
    next(e);
  }
}

/**
 * ✅ USER: Mark as read
 * POST /api/v1/announcements/:id/read
 */
export async function markAnnouncementRead(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Ensure announcement exists (optional but good)
    const exists = await Announcement.exists({ _id: id });
    if (!exists) return res.status(404).json({ success: false, message: "Announcement not found" });

    await AnnouncementRead.updateOne(
      { announcementId: id, userId },
      { $setOnInsert: { announcementId: id, userId, readAt: new Date() } },
      { upsert: true }
    );

    res.json({ success: true, message: "Marked as read" });
  } catch (e) {
    next(e);
  }
}
