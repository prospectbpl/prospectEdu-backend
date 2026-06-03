import mongoose from "mongoose";

const researchReportSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true },

    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },

    // category filter
    category: { type: String, required: true, trim: true }, // store category name for easy filter

    date: { type: String, required: true, trim: true }, // "08 Nov 2025"

    // cover image
    coverUrl: { type: String, default: "" },
    coverPublicId: { type: String, default: "" },

    content: {
      english: { type: String, default: "" },
      hindi: { type: String, default: "" },
    },

    pdf: {
      englishUrl: { type: String, default: "" },
      englishPublicId: { type: String, default: "" },
      hindiUrl: { type: String, default: "" },
      hindiPublicId: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

export default mongoose.model("ResearchReport", researchReportSchema);
