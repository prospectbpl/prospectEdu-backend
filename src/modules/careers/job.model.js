import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    vacancy: { type: Number, required: true, min: 1 },
    location: { type: String, required: true, trim: true },
    jobType: { type: String, required: true, trim: true }, // Full-time, Part-time etc
    description: { type: String, required: true, trim: true }, // your same multiline format
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Job", jobSchema);
