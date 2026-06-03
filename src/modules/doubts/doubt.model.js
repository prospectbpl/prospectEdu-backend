import mongoose from "mongoose";

const doubtSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    doubtType: { type: String, required: true, trim: true },
    doubt: { type: String, required: true, trim: true },

    imageUrl: { type: String, default: "" },
    imagePublicId: { type: String, default: "" },

    status: {
      type: String,
      enum: ["PENDING", "IN_PROGRESS", "RESOLVED", "CLOSED"],
      default: "PENDING",
    },

    adminAnswer: { type: String, default: "" },
    answeredAt: { type: Date, default: null },
    answeredBy: { type: String, default: "" },

    mailSent: { type: Boolean, default: false },
    mailSentAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
  },
  { timestamps: true }
);
// ✅ TTL: auto-delete 10 days after closedAt
// TTL works only when closedAt is a Date (not null)
doubtSchema.index({ closedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 10 });

export default mongoose.model("Doubt", doubtSchema);
