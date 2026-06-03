// src/modules/donations/donation.model.js
import mongoose from "mongoose";

const donationSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: 1 },
    currency: { type: String, default: "INR" },

    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    mobile: { type: String, required: true, trim: true },

    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },

    pan: { type: String, default: "", trim: true },

    // 🔥 NEW: payment related
    status: {
      type: String,
      enum: ["CREATED", "CONFIRMED", "FAILED"],
      default: "CREATED",
    },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("Donation", donationSchema);
