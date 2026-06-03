import mongoose from "mongoose";

const teacherProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    teacherId: { type: String, trim: true },
    department: { type: String, trim: true },
    designation: { type: String, trim: true },
    experience: { type: Number, min: 0 },
    qualification: { type: String, trim: true },

    subjects: [{ type: String, trim: true }],
     salary: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

export const TeacherProfile = mongoose.model(
  "TeacherProfile",
  teacherProfileSchema
);
