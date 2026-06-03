import mongoose from "mongoose";

const researchCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true }, // e.g. "Civil Engineering"
    slug: { type: String, required: true, trim: true, unique: true }, // e.g. "civil-engineering"
  },
  { timestamps: true }
);

export default mongoose.model("ResearchCategory", researchCategorySchema);
