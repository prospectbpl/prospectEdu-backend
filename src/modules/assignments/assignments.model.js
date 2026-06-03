import mongoose from "mongoose";

const { Schema } = mongoose;

const assignmentSchema = new Schema(
  {
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true, index: true },

    title: { type: String, required: true, trim: true, maxlength: 180 },
    instructions: { type: String, trim: true, default: "" },

    dueDate: { type: Date, default: null },
    maxMarks: { type: Number, default: 0 },

    // file (optional)
    fileUrl: { type: String, default: "" },
    filePublicId: { type: String, default: "" },
    fileName: { type: String, default: "" },
    mimeType: { type: String, default: "" },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

assignmentSchema.index({ courseId: 1, createdAt: -1 });

export const Assignment = mongoose.model("Assignment", assignmentSchema);
