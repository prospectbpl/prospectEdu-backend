import mongoose from "mongoose";

const announcementReadSchema = new mongoose.Schema(
  {
    announcementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Announcement",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    readAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// ✅ one user can mark one announcement read only once
announcementReadSchema.index({ announcementId: 1, userId: 1 }, { unique: true });

export default mongoose.model("AnnouncementRead", announcementReadSchema);
