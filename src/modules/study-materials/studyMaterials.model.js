import mongoose from "mongoose";

const { Schema } = mongoose;

export const STUDY_MATERIAL_TYPES = ["pdf", "handwritten"];
export const STUDY_FILE_TYPES = ["pdf", "doc", "docx"];

const studyMaterialSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 180 },

    // must match Course.category (you store as lowercase) :contentReference[oaicite:0]{index=0}
    category: { type: String, required: true, trim: true, lowercase: true, index: true },

    materialType: { type: String, enum: STUDY_MATERIAL_TYPES, required: true, index: true },

    fileType: { type: String, enum: STUDY_FILE_TYPES, required: true, index: true },
    fileUrl: { type: String, required: true, trim: true },
    filePublicId: { type: String, trim: true, default: "" },
    fileName: { type: String, trim: true, default: "" },
    mimeType: { type: String, trim: true, default: "" },

    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    isPublished: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

studyMaterialSchema.index({ category: 1, materialType: 1, createdAt: -1 });

export const StudyMaterial = mongoose.model("StudyMaterial", studyMaterialSchema);
