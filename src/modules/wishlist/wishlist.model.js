import mongoose from "mongoose";

const wishlistItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    // snapshot fields for UI
    title: { type: String, default: "" },
    img: { type: String, default: "" },
    price: { type: Number, default: 0 },
    oldPrice: { type: Number, default: 0 },
    save: { type: Number, default: 0 },
    outOfStock: { type: Boolean, default: false },
  },
  { _id: false }
);

const wishlistSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    items: { type: [wishlistItemSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model("Wishlist", wishlistSchema);
