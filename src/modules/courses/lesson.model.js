import mongoose from "mongoose";

const { Schema } = mongoose;

export const LESSON_TYPES = ["video", "pdf", "doc", "text", "link", "quiz", "assignment"];

const lessonSchema = new Schema(
  {
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    moduleId: { type: Schema.Types.ObjectId, ref: "CourseModule", required: true, index: true },

    title: { type: String, required: true, trim: true, maxlength: 180 },
    type: { type: String, enum: LESSON_TYPES, default: "video", index: true },

    contentUrl: { type: String, trim: true, default: "" },
    filePublicId: { type: String, trim: true, default: "" },
    fileName: { type: String, trim: true, default: "" },
    mimeType: { type: String, trim: true, default: "" }, // video/pdf/link
    contentText: { type: String, trim: true, default: "" }, // text lesson
    durationMinutes: { type: Number, default: 0 },

    order: { type: Number, default: 0, index: true },
    isPreview: { type: Boolean, default: false }, // allow non-enrolled preview later
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true }
);

lessonSchema.index({ moduleId: 1, order: 1 });

export const Lesson = mongoose.model("Lesson", lessonSchema);
