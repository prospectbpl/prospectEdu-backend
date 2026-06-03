import mongoose from "mongoose";

const { Schema } = mongoose;

export const ENROLL_STATUS = ["active", "completed", "cancelled"];

const enrollmentSchema = new Schema(
  {
    studentUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true, index: true },

    status: { type: String, enum: ENROLL_STATUS, default: "active", index: true },
    enrolledAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// 1 student cannot enroll same course twice
enrollmentSchema.index({ studentUserId: 1, courseId: 1 }, { unique: true });

export const Enrollment = mongoose.model("Enrollment", enrollmentSchema);
