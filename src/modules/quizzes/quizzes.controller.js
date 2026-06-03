import mongoose from "mongoose";
import { Quiz } from "./quiz.model.js";
import { Course } from "../courses/course.model.js";
import { QuizAttempt } from "./quizAttempt.model.js";
import { assertStudentHasCourseAccess } from "../../utils/courseAccess.js";

function isTeacher(req) {
  return req?.user?.role === "teacher";
}
function isAdmin(req) {
  return req?.user?.role === "admin";
}
function badRole(res) {
  return res.status(403).json({ success: false, message: "Forbidden" });
}

async function assertTeacherAssignedOrAdmin(req, courseId) {
  if (isAdmin(req)) return true;
  if (!isTeacher(req)) return false;

  const course = await Course.findById(courseId).select("assignedTeachers");
  if (!course) {
    const err = new Error("Course not found");
    err.statusCode = 404;
    throw err;
  }

  const ok = (course.assignedTeachers || []).some((t) => String(t) === String(req.user.id));
  if (!ok) {
    const err = new Error("You are not assigned to this course");
    err.statusCode = 403;
    throw err;
  }
  return true;
}

function normalizeQuestions(input) {
  const arr = Array.isArray(input) ? input : [];
  return arr.map((q) => {
    const prompt = String(q?.prompt || "").trim();
    const type = q?.type || "mcq";
    const marks = Number(q?.marks ?? 1);

    let options = [];
    let correctIndex = Number(q?.correctIndex ?? -1);

    if (type === "mcq") {
      const rawOpts = Array.isArray(q?.options) ? q.options : [];
      options = rawOpts.slice(0, 4).map((o) => ({ text: String(o?.text ?? o ?? "").trim() }));

      // ensure exactly 4 entries
      while (options.length < 4) options.push({ text: "" });

      if (!Number.isFinite(correctIndex)) correctIndex = -1;
      if (correctIndex < 0 || correctIndex > 3) correctIndex = -1;
    } else {
      options = [];
      correctIndex = -1;
    }

    return { type, prompt, options, correctIndex, marks };
  });
}

/**
 * POST /api/v1/quizzes/courses/:courseId
 * Create a draft quiz
 */
export async function createQuiz(req, res, next) {
  try {
    if (!isAdmin(req) && !isTeacher(req)) return badRole(res);

    const { courseId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ success: false, message: "Invalid courseId" });
    }

    await assertTeacherAssignedOrAdmin(req, courseId);

    const { title, instructions = "", durationMinutes = 0, questions = [] } = req.body || {};
    if (!String(title || "").trim()) {
      return res.status(422).json({ success: false, message: "Quiz title is required" });
    }

    const doc = await Quiz.create({
      courseId,
      title: String(title).trim(),
      instructions: String(instructions || ""),
      durationMinutes: Number(durationMinutes || 0),
      status: "draft",
      questions: normalizeQuestions(questions),
      createdBy: req.user.id,
    });

    return res.json({ success: true, quiz: doc });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/v1/quizzes/teacher/courses/:courseId
 * List quizzes for teacher/admin
 */
export async function teacherListQuizzes(req, res, next) {
  try {
    if (!isAdmin(req) && !isTeacher(req)) return badRole(res);

    const { courseId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ success: false, message: "Invalid courseId" });
    }

    await assertTeacherAssignedOrAdmin(req, courseId);

    const items = await Quiz.find({ courseId }).sort({ createdAt: -1 }).select("-__v");
    return res.json({ success: true, quizzes: items });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/v1/quizzes/:quizId
 */
export async function getQuiz(req, res, next) {
  try {
    if (!isAdmin(req) && !isTeacher(req)) return badRole(res);

    const { quizId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(quizId)) {
      return res.status(400).json({ success: false, message: "Invalid quizId" });
    }

    const quiz = await Quiz.findById(quizId).select("-__v");
    if (!quiz) return res.status(404).json({ success: false, message: "Quiz not found" });

    await assertTeacherAssignedOrAdmin(req, quiz.courseId);

    return res.json({ success: true, quiz });
  } catch (e) {
    next(e);
  }
}

/**
 * PATCH /api/v1/quizzes/:quizId
 * Update draft quiz content (title/instructions/duration/questions)
 */
export async function updateQuiz(req, res, next) {
  try {
    if (!isAdmin(req) && !isTeacher(req)) return badRole(res);

    const { quizId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(quizId)) {
      return res.status(400).json({ success: false, message: "Invalid quizId" });
    }

    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ success: false, message: "Quiz not found" });

    await assertTeacherAssignedOrAdmin(req, quiz.courseId);

    if (quiz.status === "published") {
      return res.status(400).json({ success: false, message: "Published quiz cannot be edited" });
    }

    const { title, instructions, durationMinutes, questions } = req.body || {};

    if (title !== undefined) quiz.title = String(title).trim();
    if (instructions !== undefined) quiz.instructions = String(instructions || "");
    if (durationMinutes !== undefined) quiz.durationMinutes = Number(durationMinutes || 0);
    if (questions !== undefined) quiz.questions = normalizeQuestions(questions);

    if (!quiz.title?.trim()) {
      return res.status(422).json({ success: false, message: "Quiz title is required" });
    }

    await quiz.save();
    return res.json({ success: true, quiz });
  } catch (e) {
    next(e);
  }
}

/**
 * POST /api/v1/quizzes/:quizId/publish
 */
export async function publishQuiz(req, res, next) {
  try {
    if (!isAdmin(req) && !isTeacher(req)) return badRole(res);

    const { quizId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(quizId)) {
      return res.status(400).json({ success: false, message: "Invalid quizId" });
    }

    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ success: false, message: "Quiz not found" });

    await assertTeacherAssignedOrAdmin(req, quiz.courseId);

    // minimal validation
    if (!quiz.title?.trim()) {
      return res.status(422).json({ success: false, message: "Quiz title is required" });
    }
    if (!Array.isArray(quiz.questions) || quiz.questions.length === 0) {
      return res.status(422).json({ success: false, message: "Add at least 1 question" });
    }

    // validate mcq questions
    for (const q of quiz.questions) {
      if (!q.prompt?.trim()) {
        return res.status(422).json({ success: false, message: "Each question needs text" });
      }
      if (q.type === "mcq") {
        if (!Array.isArray(q.options) || q.options.length < 4) {
          return res.status(422).json({ success: false, message: "MCQ must have 4 options" });
        }
        if (q.correctIndex < 0 || q.correctIndex > 3) {
          return res.status(422).json({ success: false, message: "Select a correct option for all MCQs" });
        }
        const anyEmpty = q.options.some((o) => !String(o?.text || "").trim());
        if (anyEmpty) {
          return res.status(422).json({ success: false, message: "All MCQ options must be filled" });
        }
      }
    }

    quiz.status = "published";
    await quiz.save();

    return res.json({ success: true, quiz });
  } catch (e) {
    next(e);
  }
}
export async function deleteQuiz(req, res, next) {
  try {
    if (!isAdmin(req) && !isTeacher(req)) return badRole(res);

    const { quizId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(quizId)) {
      return res.status(400).json({ success: false, message: "Invalid quizId" });
    }

    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ success: false, message: "Quiz not found" });

    await assertTeacherAssignedOrAdmin(req, quiz.courseId);

    // optional: restrict deleting published quiz
    // if (quiz.status === "published") {
    //   return res.status(400).json({ success: false, message: "Published quiz cannot be deleted" });
    // }

    await Quiz.deleteOne({ _id: quizId });
    return res.json({ success: true, deleted: true });
  } catch (e) {
    next(e);
  }
}
/**
 * GET /api/v1/quizzes/courses/:courseId/published
 * Student list published quizzes for a course
 */
export async function studentListPublishedQuizzes(req, res, next) {
  try {
    const { courseId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ success: false, message: "Invalid courseId" });
    }

    await assertStudentHasCourseAccess(req.user.id, courseId);

    const items = await Quiz.find({ courseId, status: "published" })
      .sort({ createdAt: -1 })
      .select("-__v");

    return res.json({ success: true, quizzes: items });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/v1/quizzes/:quizId/play
 * Student gets quiz without correct answers
 */
export async function getQuizForPlay(req, res, next) {
  try {
    const { quizId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(quizId)) {
      return res.status(400).json({ success: false, message: "Invalid quizId" });
    }

    const quiz = await Quiz.findById(quizId).select("-__v");
    if (!quiz) return res.status(404).json({ success: false, message: "Quiz not found" });
    if (quiz.status !== "published") {
      return res.status(403).json({ success: false, message: "Quiz not published" });
    }

    await assertStudentHasCourseAccess(req.user.id, quiz.courseId);

    // strip correctIndex (don’t leak)
    const safe = {
      _id: quiz._id,
      courseId: quiz.courseId,
      title: quiz.title,
      instructions: quiz.instructions,
      durationMinutes: quiz.durationMinutes,
      status: quiz.status,
      questions: (quiz.questions || []).map((q) => ({
        _id: q._id,
        type: q.type,
        prompt: q.prompt,
        marks: q.marks,
        options: (q.options || []).map((o) => ({ text: o.text })),
      })),
    };

    return res.json({ success: true, quiz: safe });
  } catch (e) {
    next(e);
  }
}

/**
 * POST /api/v1/quizzes/:quizId/attempts
 * Student submits answers => score
 * body: { answers: [{ questionId, selectedIndex }], timeTakenSeconds }
 */
export async function submitQuizAttempt(req, res, next) {
  try {
    const { quizId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(quizId)) {
      return res.status(400).json({ success: false, message: "Invalid quizId" });
    }

    const quiz = await Quiz.findById(quizId).select("-__v");
    if (!quiz) return res.status(404).json({ success: false, message: "Quiz not found" });
    if (quiz.status !== "published") {
      return res.status(403).json({ success: false, message: "Quiz not published" });
    }

    await assertStudentHasCourseAccess(req.user.id, quiz.courseId);

    const incoming = Array.isArray(req.body?.answers) ? req.body.answers : [];
    const timeTakenSeconds = Number(req.body?.timeTakenSeconds || 0);

    // scoring (MCQ only for now)
    let score = 0;
    let totalMarks = 0;

    const qMap = new Map();
    for (const q of quiz.questions || []) qMap.set(String(q._id), q);

    const normalizedAnswers = incoming
      .map((a) => ({
        questionId: a?.questionId,
        selectedIndex: Number(a?.selectedIndex ?? -1),
      }))
      .filter((a) => mongoose.Types.ObjectId.isValid(a.questionId));

    for (const q of quiz.questions || []) {
      totalMarks += Number(q.marks || 0);
      if (q.type !== "mcq") continue;

      const ans = normalizedAnswers.find((x) => String(x.questionId) === String(q._id));
      if (!ans) continue;

      if (Number(ans.selectedIndex) === Number(q.correctIndex)) {
        score += Number(q.marks || 0);
      }
    }

    // basic timer sanity (don’t hard fail; just clamp stored time)
    const maxAllowed = Math.max(0, Number(quiz.durationMinutes || 0) * 60);
    const safeTime = maxAllowed > 0 ? Math.min(timeTakenSeconds, maxAllowed) : timeTakenSeconds;

    const attempt = await QuizAttempt.create({
      quizId: quiz._id,
      courseId: quiz.courseId,
      studentId: req.user.id,
      score,
      totalMarks,
      timeTakenSeconds: safeTime,
      startedAt: new Date(Date.now() - safeTime * 1000),
      submittedAt: new Date(),
      answers: normalizedAnswers.map((a) => ({
        questionId: a.questionId,
        selectedIndex: a.selectedIndex,
      })),
    });

    return res.json({
      success: true,
      attempt: {
        _id: attempt._id,
        quizId: attempt.quizId,
        score: attempt.score,
        totalMarks: attempt.totalMarks,
        timeTakenSeconds: attempt.timeTakenSeconds,
        submittedAt: attempt.submittedAt,
      },
    });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/v1/quizzes/:quizId/attempts/me
 * Student attempt history for this quiz
 */
export async function listMyQuizAttempts(req, res, next) {
  try {
    const { quizId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(quizId)) {
      return res.status(400).json({ success: false, message: "Invalid quizId" });
    }

    const quiz = await Quiz.findById(quizId).select("courseId status");
    if (!quiz) return res.status(404).json({ success: false, message: "Quiz not found" });

    await assertStudentHasCourseAccess(req.user.id, quiz.courseId);

    const items = await QuizAttempt.find({ quizId, studentId: req.user.id })
      .sort({ createdAt: -1 })
      .select("score totalMarks timeTakenSeconds submittedAt createdAt");

    return res.json({ success: true, attempts: items });
  } catch (e) {
    next(e);
  }
}

