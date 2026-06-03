import mongoose from "mongoose";
const { Schema } = mongoose;

const optionSchema = new Schema(
  {
    text: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const questionSchema = new Schema(
  {
    type: { type: String, enum: ["mcq", "true_false", "short"], default: "mcq" },
    prompt: { type: String, required: true, trim: true },

    // MCQ: 4 options
    options: { type: [optionSchema], default: [] },
    correctIndex: { type: Number, default: -1 }, // 0..3

    marks: { type: Number, default: 1 },
  },
  { _id: true }
);

const quizSchema = new Schema(
  {
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true, index: true },

    title: { type: String, required: true, trim: true, maxlength: 200 },
    instructions: { type: String, default: "" },
    durationMinutes: { type: Number, default: 0 },

    status: { type: String, enum: ["draft", "published"], default: "draft" },

    questions: { type: [questionSchema], default: [] },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

quizSchema.index({ courseId: 1, createdAt: -1 });

export const Quiz = mongoose.model("Quiz", quizSchema);
