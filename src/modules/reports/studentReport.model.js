import mongoose from "mongoose";
const { Schema } = mongoose;

const reportFileSchema = new Schema(
  {
    url: { type: String, required: true, trim: true },
    publicId: { type: String, default: "" }, // cloudinary public_id (optional)
    originalName: { type: String, default: "" },
    mimeType: { type: String, default: "" },
    bytes: { type: Number, default: 0 },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", default: null }, // teacher id
  },
  { _id: true }
);

const studentReportSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    files: { type: [reportFileSchema], default: [] }, // max 10 enforced in controller
    updatedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const StudentReport = mongoose.model("StudentReport", studentReportSchema);
