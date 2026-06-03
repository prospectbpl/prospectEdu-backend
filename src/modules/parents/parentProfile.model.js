import mongoose from "mongoose";
const { Schema } = mongoose;

const parentProfileSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    address: { type: String, trim: true, default: "" },

    // ✅ Linked children (students)
    children: [
      {
        studentUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        addedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export const ParentProfile = mongoose.model("ParentProfile", parentProfileSchema);
