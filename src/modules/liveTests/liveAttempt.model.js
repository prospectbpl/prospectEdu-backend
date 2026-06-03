import mongoose from "mongoose";

const LiveAnswerSchema = new mongoose.Schema(
  {
    selectedIndex: { type: Number, default: null }, // 0-3
    review: { type: Boolean, default: false },
  },
  { _id: false }
);

const LiveAttemptSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    seriesId: { type: mongoose.Schema.Types.ObjectId, ref: "TestSeries", required: true },
    testId: { type: mongoose.Schema.Types.ObjectId, required: true },

    startedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },

    answers: { type: [LiveAnswerSchema], default: [] },

    submitted: { type: Boolean, default: false },
    submittedAt: { type: Date, default: null },

    score: { type: Number, default: 0 },
    totalMarks: { type: Number, default: 0 },
  },
  { timestamps: true }
);

LiveAttemptSchema.index({ user: 1, seriesId: 1, testId: 1 }, { unique: true });

export default mongoose.model("LiveAttempt", LiveAttemptSchema);
