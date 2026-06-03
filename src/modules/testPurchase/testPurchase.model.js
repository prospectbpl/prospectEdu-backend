import mongoose from "mongoose";

const TestPurchaseSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    testSeries: { type: mongoose.Schema.Types.ObjectId, ref: "TestSeries", required: true },
    amountPaid: { type: Number, default: 0 },
    status: { type: String, enum: ["PAID", "FAILED"], default: "PAID" },
    provider: { type: String, default: "MANUAL" },
    transactionId: { type: String, default: "" },

    // ✅ Razorpay details (needed for admin + tracking)
    razorpayOrderId: { type: String, default: "" },
    razorpayPaymentId: { type: String, default: "" },
    razorpaySignature: { type: String, default: "" },
  },
  { timestamps: true }
);

TestPurchaseSchema.index({ user: 1, testSeries: 1 }, { unique: true });

export default mongoose.model("TestPurchase", TestPurchaseSchema);
