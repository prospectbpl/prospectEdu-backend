import mongoose from "mongoose";
const { Schema } = mongoose;

const answerSchema = new Schema(
  {
    questionId: { type: Schema.Types.ObjectId, required: true },
    selectedIndex: { type: Number, default: -1 }, // for mcq
  },
  { _id: false }
);

const quizAttemptSchema = new Schema(
  {
    quizId: { type: Schema.Types.ObjectId, ref: "Quiz", required: true, index: true },
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    score: { type: Number, default: 0 },
    totalMarks: { type: Number, default: 0 },

    startedAt: { type: Date, default: Date.now },
    submittedAt: { type: Date, default: Date.now },
    timeTakenSeconds: { type: Number, default: 0 },

    answers: { type: [answerSchema], default: [] },
  },
  { timestamps: true }
);

quizAttemptSchema.index({ quizId: 1, studentId: 1, createdAt: -1 });

export const QuizAttempt = mongoose.model("QuizAttempt", quizAttemptSchema);
