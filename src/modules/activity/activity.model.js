import mongoose from "mongoose";
const { Schema } = mongoose;

const activitySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, required: true },      // e.g. "orders", "doubts"
    title: { type: String, required: true },     // e.g. "Orders"
    route: { type: String, default: "" },        // e.g. "/student/orders"
  },
  { timestamps: true }
);
activitySchema.index({ userId: 1, createdAt: -1 });
activitySchema.index({ userId: 1, type: 1, route: 1, createdAt: -1 });

export const Activity = mongoose.model("Activity", activitySchema);
