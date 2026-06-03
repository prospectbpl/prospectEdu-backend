import mongoose from "mongoose";
const { Schema } = mongoose;

const feeItemSchema = new Schema(
  {
    title: { type: String, trim: true, required: true, maxlength: 120 }, // e.g. Tuition Fee
    amount: { type: Number, required: true, min: 0 },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: ["pending", "paid"], default: "pending", index: true },
    paidAt: { type: Date, default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { _id: true, timestamps: true }
);

const parentPaymentSchema = new Schema(
  {
    parentUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    // teacher who last edited anything for this parent
    lastUpdatedByTeacherId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    lastUpdatedAt: { type: Date, default: null },

    items: [feeItemSchema],
  },
  { timestamps: true }
);

export const ParentPayment = mongoose.model("ParentPayment", parentPaymentSchema);
