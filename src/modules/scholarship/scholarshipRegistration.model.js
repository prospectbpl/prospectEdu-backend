import mongoose from "mongoose";

const scholarshipRegistrationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    parent: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    course: { type: String, required: true, trim: true },

    status: {
      type: String,
      enum: ["NEW", "CONTACTED", "APPROVED", "REJECTED"],
      default: "NEW",
    },

    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("ScholarshipRegistration", scholarshipRegistrationSchema);
