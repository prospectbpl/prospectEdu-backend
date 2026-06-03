import mongoose from "mongoose";

const newsSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },

    // category name (e.g. "IT News")
    category: { type: String, required: true, trim: true },

    date: { type: String, required: true, trim: true }, // "09 Jan 2026"
    slug: { type: String, required: true, unique: true, trim: true },

    imgUrl: { type: String, default: "" },
    imgPublicId: { type: String, default: "" },

    english: { type: String, default: "" },
    hindi: { type: String, default: "" },

    createdBy: { type: String, default: "teacher" },
  },
  { timestamps: true }
);

export default mongoose.model("News", newsSchema);
