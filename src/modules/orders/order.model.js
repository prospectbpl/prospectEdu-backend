import mongoose from "mongoose";

const OrderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    // ✅ supplierId optional now (ADMIN products will have null)
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: false,
      default: null,
    },

    /**
     * ✅ productOwner is NOT an id.
     * It is only the owner TYPE: "ADMIN" | "SUPPLIER"
     */
    productOwner: {
      type: String,
      enum: ["ADMIN", "SUPPLIER"],
      required: true,
    },

    title: { type: String, required: true },
    img: { type: String, default: "" },

    price: { type: Number, required: true },
    quantity: { type: Number, required: true },

    status: {
      type: String,
      enum: [
        "ORDER_RECEIVED",
        "CONFIRMED",
        "ON_THE_WAY",
        "CANCELED",
        "REJECTED",
        "DELIVERED",
      ],
      default: "ORDER_RECEIVED",
    },
  },
  { _id: true }
);

const AddressSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, default: "" },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    country: { type: String, required: true, default: "India" },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true },

    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    items: { type: [OrderItemSchema], default: [] },

    address: { type: AddressSchema, required: true },

    totalMRP: { type: Number, default: 0 },
    totalPrice: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    shipping: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },

    // ✅ optional but useful
    paymentProvider: { type: String, enum: ["RAZORPAY", "COD"], default: "RAZORPAY" },
    paymentStatus: { type: String, enum: ["PENDING", "PAID", "FAILED"], default: "PENDING" },
    razorpayOrderId: { type: String, default: "" },
    razorpayPaymentId: { type: String, default: "" },
    razorpaySignature: { type: String, default: "" },

    status: {
      type: String,
      enum: ["CREATED", "CONFIRMED", "CANCELED", "DELIVERED"],
      default: "CREATED",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Order", OrderSchema);
