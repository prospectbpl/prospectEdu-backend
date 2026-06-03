import mongoose from "mongoose";

const TicketMessageSchema = new mongoose.Schema(
  {
    fromRole: { type: String, enum: ["student", "teacher"], required: true },
    fromUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, default: "" },
    attachment: {
      url: String,
      publicId: String,
      name: String,
      mimetype: String,
      resourceType: { type: String, enum: ["image", "raw"], default: "raw" },
    },
  },
  { timestamps: true }
);

const SupportTicketSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // ✅ Unassigned at creation => visible to all teachers
    assignedTeacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    doubtType: { type: String, default: "General" },
    subject: { type: String, default: "" },

    question: { type: String, required: true },

    pinned: { type: Boolean, default: false },
    resolved: { type: Boolean, default: false },

    messages: { type: [TicketMessageSchema], default: [] },

    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Helpful indexes
SupportTicketSchema.index({ student: 1, lastMessageAt: -1 });
SupportTicketSchema.index({ assignedTeacher: 1, lastMessageAt: -1 });

export default mongoose.model("SupportTicket", SupportTicketSchema);
