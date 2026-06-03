import mongoose from "mongoose";

const jobApplicationSchema = new mongoose.Schema(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },

    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },

    highestEducation: { type: String, default: "" },
    canRelocate: { type: String, default: "" }, // Yes/No
    fluentIn: { type: String, default: "" },

    resumeUrl: { type: String, default: "" },
resumePublicId: { type: String, default: "" },
resumeOriginalName: { type: String, default: "" },


    status: {
      type: String,
      enum: ["NEW", "SHORTLISTED", "REJECTED", "HIRED"],
      default: "NEW",
    },
  },
  { timestamps: true }
);

export default mongoose.model("JobApplication", jobApplicationSchema);
