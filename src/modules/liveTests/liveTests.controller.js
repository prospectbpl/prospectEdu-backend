import TestSeries from "../testSeries/testSeries.model.js";
import LiveAttempt from "./liveAttempt.model.js";

const getUserId = (req) => req.user?._id || req.user?.id;

const sumMarks = (questions = []) =>
  questions.reduce((acc, q) => acc + (Number(q?.marks) || 0), 0);

export const getOrCreateLiveAttempt = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const { seriesId, testId } = req.params;

    const series = await TestSeries.findById(seriesId);
    if (!series) return res.status(404).json({ success: false, message: "Series not found" });

    const test = series.tests.id(testId);
    if (!test) return res.status(404).json({ success: false, message: "Test not found" });

    let attempt = await LiveAttempt.findOne({ user: userId, seriesId, testId });

    if (!attempt) {
      const durationMin = Number(test.durationMinutes || 0);
      const expiresAt = new Date(Date.now() + durationMin * 60 * 1000);

      const totalQ = Number(test.totalQuestions || test.questions?.length || 0);
      const answers = Array.from({ length: totalQ }, () => ({ selectedIndex: null, review: false }));

      attempt = await LiveAttempt.create({
        user: userId,
        seriesId,
        testId,
        expiresAt,
        answers,
        submitted: false,
        score: 0,
        totalMarks: sumMarks(test.questions || []),
      });
    }

    // Do NOT return correct answers in live attempt
    const safeQuestions = (test.questions || []).map((q) => ({
      q: q.q,
      options: q.options,
      marks: q.marks ?? 1,
    }));

    res.json({
      success: true,
      data: {
        seriesTitle: series.title,
        test: {
          name: test.name,
          durationMinutes: test.durationMinutes,
          totalQuestions: test.totalQuestions,
          totalMarks: test.totalMarks,
        },
        questions: safeQuestions,
        attempt: {
          attemptId: attempt._id,
          startedAt: attempt.startedAt,
          expiresAt: attempt.expiresAt,
          answers: attempt.answers,
          submitted: attempt.submitted,
        },
      },
    });
  } catch (e) {
    next(e);
  }
};

export const saveLiveAttempt = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const { attemptId } = req.params;
    const { answers } = req.body;

    if (!Array.isArray(answers)) {
      return res.status(400).json({ success: false, message: "answers must be an array" });
    }

    const attempt = await LiveAttempt.findById(attemptId);
    if (!attempt) return res.status(404).json({ success: false, message: "Attempt not found" });
    if (String(attempt.user) !== String(userId)) return res.status(403).json({ success: false, message: "Forbidden" });
    if (attempt.submitted) return res.status(400).json({ success: false, message: "Already submitted" });

    attempt.answers = answers;
    await attempt.save();

    res.json({ success: true, message: "Saved" });
  } catch (e) {
    next(e);
  }
};

export const submitLiveAttempt = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const { attemptId } = req.params;

    const attempt = await LiveAttempt.findById(attemptId);
    if (!attempt) return res.status(404).json({ success: false, message: "Attempt not found" });
    if (String(attempt.user) !== String(userId)) return res.status(403).json({ success: false, message: "Forbidden" });
    if (attempt.submitted) return res.status(400).json({ success: false, message: "Already submitted" });

    const series = await TestSeries.findById(attempt.seriesId);
    if (!series) return res.status(404).json({ success: false, message: "Series not found" });

    const test = series.tests.id(attempt.testId);
    if (!test) return res.status(404).json({ success: false, message: "Test not found" });

    let score = 0;
    const qs = test.questions || [];
    const ans = attempt.answers || [];

    for (let i = 0; i < qs.length; i++) {
    const correct = Number(qs[i]?.correctIndex);
const rawChosen = ans[i]?.selectedIndex;   // IMPORTANT: keep raw
const marks = Number(qs[i]?.marks) || 1;

// ✅ if skipped => score 0 (do nothing)
if (rawChosen === null || rawChosen === undefined) continue;

const chosen = Number(rawChosen);
if (Number.isFinite(chosen) && chosen === correct) score += marks;

    }

    attempt.score = score;
    attempt.submitted = true;
    attempt.submittedAt = new Date();
    attempt.totalMarks = sumMarks(qs);

    await attempt.save();

    res.json({
      success: true,
      message: "Submitted",
      data: {
        attemptId: attempt._id,
        score: attempt.score,
        totalMarks: attempt.totalMarks,
      },
    });
  } catch (e) {
    next(e);
  }
};

// ✅ NEW: Report endpoint (returns correct answers + student answers)
export const getTestReport = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const { seriesId, testId } = req.params;

    const attempt = await LiveAttempt.findOne({ user: userId, seriesId, testId }).lean();
    if (!attempt) return res.status(404).json({ success: false, message: "Attempt not found" });
    if (!attempt.submitted) return res.status(400).json({ success: false, message: "Test not submitted yet" });

    const series = await TestSeries.findById(seriesId).lean();
    if (!series) return res.status(404).json({ success: false, message: "Series not found" });

    const test = (series.tests || []).find((t) => String(t._id) === String(testId));
    if (!test) return res.status(404).json({ success: false, message: "Test not found" });

    const qs = test.questions || [];
    const ans = attempt.answers || [];

    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;
    let markedCount = 0;

    const review = qs.map((q, idx) => {
      const chosen = ans[idx]?.selectedIndex;
      const marked = !!ans[idx]?.review;
      const correctIndex = Number(q.correctIndex ?? 0);
      const marks = Number(q.marks ?? 1);

      const isSkipped = chosen === null || chosen === undefined;
      const isCorrect = !isSkipped && Number(chosen) === correctIndex;

      if (marked) markedCount++;
      if (isSkipped) skippedCount++;
      else if (isCorrect) correctCount++;
      else wrongCount++;

      return {
        index: idx + 1,
        q: q.q,
        options: q.options,
        marks,
        correctIndex,
        chosenIndex: isSkipped ? null : Number(chosen),
        isCorrect,
        isSkipped,
        marked,
        explanation: q.explanation || "",
      };
    });

    const totalMarks = Number(attempt.totalMarks ?? 0) || sumMarks(qs);
    const score = Number(attempt.score ?? 0) || 0;
    const accuracy = correctCount + wrongCount > 0 ? Math.round((correctCount / (correctCount + wrongCount)) * 100) : 0;
    const percent = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;

    res.json({
      success: true,
      data: {
        series: { id: seriesId, title: series.title },
        test: {
          id: testId,
          name: test.name,
          totalQuestions: test.totalQuestions ?? qs.length,
          durationMinutes: test.durationMinutes ?? 0,
          totalMarks,
        },
        attempt: {
          attemptId: String(attempt._id),
          submittedAt: attempt.submittedAt,
          score,
          percent,
          accuracy,
        },
        stats: {
          correct: correctCount,
          wrong: wrongCount,
          skipped: skippedCount,
          marked: markedCount,
        },
        review,
      },
    });
  } catch (e) {
    next(e);
  }
};
