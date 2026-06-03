// server/modules/activity/lessonWatch.model.js
import mongoose from "mongoose";
const { Schema } = mongoose;

const lessonWatchSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    lessonId: { type: Schema.Types.ObjectId, ref: "Lesson", index: true },
  },
  { timestamps: true }
);

// prevent duplicate watch counts
lessonWatchSchema.index({ studentId: 1, lessonId: 1 }, { unique: true });

export const LessonWatch = mongoose.model("LessonWatch", lessonWatchSchema);
