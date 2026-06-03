import mongoose from "mongoose";

const ParentDoubtSchema = new mongoose.Schema(
  {
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    subject: { type: String, required: true },
    message: { type: String, required: true },

    category: { type: String, default: "General" },
    priority: { type: String, enum: ["LOW", "MEDIUM", "HIGH"], default: "MEDIUM" },

    answer: { type: String, default: "" },

    answeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    answeredAt: { type: Date, default: null },

    status: {
      type: String,
      enum: ["OPEN", "ANSWERED"],
      default: "OPEN",
    },
  },
  { timestamps: true }
);

// ✅ TTL: Auto-delete after 10 days (10 * 24 * 60 * 60 = 864000 seconds)
// Uses createdAt (added by timestamps: true)
ParentDoubtSchema.index({ createdAt: 1 }, { expireAfterSeconds: 864000 });

export default mongoose.model("ParentDoubt", ParentDoubtSchema);
