import mongoose from "mongoose";

const ScheduleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    date: { type: String, required: true, trim: true },
    time: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["Free Quiz", "Upcoming", "Live Now", "Test Ended"],
      default: "Upcoming",
    },
  },
  { _id: false }
);

// ✅ MCQ ONLY
const QuestionSchema = new mongoose.Schema(
  {
    q: { type: String, default: "" },
    options: { type: [String], default: ["", "", "", ""] }, // exactly 4
    correctIndex: { type: Number, default: 0 }, // 0..3
    marks: { type: Number, default: 1 },
    explanation: { type: String, default: "" },
  },
  { _id: false }
);

const SeriesTestSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    totalQuestions: { type: Number, default: 0 },
    totalMarks: { type: Number, default: 0 },
    durationMinutes: { type: Number, default: 0 },

    // ✅ store questions inside each test
    questions: { type: [QuestionSchema], default: [] },
  },
  { timestamps: true }
);

const TestSeriesSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    type: { type: String, enum: ["Online", "Offline"], default: "Online" },
    language: { type: String, default: "English" },

    totalTest: { type: Number, default: 0 },
    totalQuestion: { type: Number, default: 0 },

    // ✅ MCQ ONLY (locked)
    questionType: { type: String, enum: ["MCQ"], default: "MCQ" },

    price: { type: Number, default: 0 },
    mrp: { type: Number, default: 0 },

    description: { type: String, default: "" },

    imageUrl: { type: String, default: "" },
    imagePublicId: { type: String, default: "" },

    schedule: { type: [ScheduleSchema], default: [] },

    isPublished: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    tests: { type: [SeriesTestSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model("TestSeries", TestSeriesSchema);
