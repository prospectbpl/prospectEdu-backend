import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 140 },
    description: { type: String, required: true, trim: true, maxlength: 5000 },

    category: {
  type: String,
  trim: true,
  default: "General",
  maxlength: 40,
},


    // ✅ new: who to send
    recipients: {
      type: [String],
      enum: ["student", "teacher", "parent"],
      default: [],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: "At least one recipient is required",
      },
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Announcement", announcementSchema);
