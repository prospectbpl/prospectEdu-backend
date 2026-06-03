import mongoose from "mongoose";
const { Schema } = mongoose;

export const PURCHASE_STATUS = ["pending", "paid", "failed", "refunded"];

const purchaseSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true, index: true },

    amount: { type: Number, default: 0 },
    currency: { type: String, default: "INR" },

    status: { type: String, enum: PURCHASE_STATUS, default: "pending", index: true },

    // gateway tracking (optional now, required later)
    provider: { type: String, default: "manual" }, // "razorpay" | "stripe" | "manual"
    providerOrderId: { type: String, default: "" },
    providerPaymentId: { type: String, default: "" },

    paidAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// prevent duplicate "pending/paid" purchases for same course by same user
purchaseSchema.index({ userId: 1, courseId: 1 }, { unique: true });

export const Purchase = mongoose.model("Purchase", purchaseSchema);
