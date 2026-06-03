import mongoose from "mongoose";

const scholarshipConfigSchema = new mongoose.Schema(
  {
    resultsLive: { type: Boolean, default: false },

    // ✅ Cloudinary result PDF
    resultPdfUrl: { type: String, default: "" }, // secure_url
    resultPdfPublicId: { type: String, default: "" }, // public_id
    resultPdfOriginalName: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("ScholarshipConfig", scholarshipConfigSchema);
