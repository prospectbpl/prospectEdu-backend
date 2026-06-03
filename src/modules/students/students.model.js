// students.model.js
import mongoose from "mongoose";
const { Schema } = mongoose;

const studentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },

    // existing

    grade: { type: String, trim: true, default: "" },
    stream: { type: String, trim: true, default: "" },
    isEnrolled: { type: Boolean, default: false },

    // NEW: basic tab
    gender: { type: String, trim: true, default: "" },           // "Female" | "Male" | "Others"
    interested: { type: String, trim: true, default: "" },       // e.g. "Engineering"
    highestEducation: { type: String, trim: true, default: "" }, // e.g. "Graduate"

    // NEW: education tab
    currentlyPursuing: { type: String, trim: true, default: "" },
    preparingFor: { type: String, trim: true, default: "" },
    occupation: { type: String, trim: true, default: "" },
    lastExamName: { type: String, trim: true, default: "" },
    lastExamYear: { type: String, trim: true, default: "" },
    preparingSince: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

export const StudentProfile = mongoose.model("StudentProfile", studentSchema);
