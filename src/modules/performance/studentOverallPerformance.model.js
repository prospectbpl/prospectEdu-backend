import mongoose from "mongoose";
const { Schema } = mongoose;

const studentOverallPerformanceSchema = new Schema(
  {
    teacherId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    assignmentAvg: { type: Number, default: 0, min: 0, max: 100 },
    quizAvg: { type: Number, default: 0, min: 0, max: 100 },
    attendance: { type: Number, default: 0, min: 0, max: 100 },
    progress: { type: Number, default: 0, min: 0, max: 100 },
  },
  { timestamps: true }
);

// One report-card row per (teacher, student)
studentOverallPerformanceSchema.index({ teacherId: 1, studentId: 1 }, { unique: true });

export const StudentOverallPerformance = mongoose.model(
  "StudentOverallPerformance",
  studentOverallPerformanceSchema
);
