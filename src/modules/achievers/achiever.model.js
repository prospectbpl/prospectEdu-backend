import mongoose from "mongoose";

const achieverSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    course: { type: String, required: true, trim: true }, // Engineering/Medical/Law/Management etc.
    year: { type: String, required: true, trim: true },   // "2024" etc.

    achievement: { type: String, required: true, trim: true },
    extra: { type: String, default: "", trim: true },
    quote: { type: String, default: "", trim: true },

    imgUrl: { type: String, required: true },       // ✅ Cloudinary secure_url
    imgPublicId: { type: String, default: "" },     // ✅ Cloudinary public_id (optional delete later)
  },
  { timestamps: true }
);

export default mongoose.model("Achiever", achieverSchema);
