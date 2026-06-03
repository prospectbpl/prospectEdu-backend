import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    // Supplier product OR Admin product
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      default: null,
      index: true,
    },

    // Admin or Supplier user who created product
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },

    // Admin predefined category name
    category: { type: String, required: true, trim: true },
    customCategory: { type: String, default: "" },

    price: { type: Number, required: true, min: 0 },
    offerPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 0 },

    outOfStock: { type: Boolean, default: false },

    // 🔥 NEW: Trending toggle
    isTrending: { type: Boolean, default: false, index: true },

    images: [{ type: String }],

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },

    // ✅ NEW: Restock notification list
    // Stores email from signup user who clicked "Notify Me"
    restockNotifyUsers: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        email: { type: String, required: true, lowercase: true, trim: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("Product", productSchema);
