import mongoose from "mongoose";

const { Schema } = mongoose;

const moduleSchema = new Schema(
  {
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, trim: true, default: "" },
    order: { type: Number, default: 0, index: true },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true }
);

moduleSchema.index({ courseId: 1, order: 1 });

export const CourseModule = mongoose.model("CourseModule", moduleSchema);
