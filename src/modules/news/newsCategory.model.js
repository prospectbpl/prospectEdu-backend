import mongoose from "mongoose";

const newsCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    createdBy: { type: String, default: "teacher" },
  },
  { timestamps: true }
);

export default mongoose.model("NewsCategory", newsCategorySchema);
