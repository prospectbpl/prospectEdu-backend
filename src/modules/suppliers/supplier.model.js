import mongoose from "mongoose";

const supplierSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    shopName: { type: String, required: true },
    ownerName: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },

    categories: [{ type: String, required: true }],

    pickupAddress: {
      addressLine1: { type: String, required: true },
      addressLine2: String,
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
      country: { type: String, default: "India" },
    },

    kyc: {
      gstin: String,
      pan: String,
    },

    bank: {
      accountHolderName: String,
      accountNumber: String,
      ifsc: String,
      bankName: String,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    reviewNote: String,
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Supplier", supplierSchema);
