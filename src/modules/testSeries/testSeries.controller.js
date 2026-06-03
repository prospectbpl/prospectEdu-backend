import TestSeries from "./testSeries.model.js";
import cloudinary from "../../config/cloudinary.js";
import { uploadBufferToCloudinary } from "../../utils/cloudinaryUpload.js";

// ✅ helper (use everywhere)
const getUserId = (req) => req.user?._id || req.user?.id;

const ensureOwner = (doc, userId) => {
  if (String(doc.createdBy) !== String(userId)) {
    const err = new Error("Forbidden");
    err.statusCode = 403;
    throw err;
  }
};

const sumQuestions = (tests = []) =>
  tests.reduce((acc, t) => acc + (Number(t.totalQuestions) || 0), 0);

const sumMarksFromQuestions = (questions = []) =>
  (questions || []).reduce((acc, q) => acc + (Number(q?.marks) || 0), 0);

const recomputeSeriesTotals = (seriesDoc) => {
  seriesDoc.totalTest = seriesDoc.tests.length;
  seriesDoc.totalQuestion = sumQuestions(seriesDoc.tests);
};

export const createTestSeries = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const schedule = req.body.schedule ? JSON.parse(req.body.schedule) : [];

    let imageUrl = "";
    let imagePublicId = "";

    if (req.file?.buffer) {
      const up = await uploadBufferToCloudinary(req.file.buffer, {
        folder: "test-series",
        resourceType: "image",
      });
      imageUrl = up.secure_url;
      imagePublicId = up.public_id;
    }

    const doc = await TestSeries.create({
      title: req.body.title,
      type: req.body.type || "Online",
      language: req.body.language || "English",

      // ✅ totals will be computed from tests
      totalTest: 0,
      totalQuestion: 0,

      // ✅ FORCE MCQ ONLY (ignore any incoming)
      questionType: "MCQ",

      price: Number(req.body.price || 0),
      mrp: Number(req.body.mrp || 0),
      description: req.body.description || "",
      isPublished: req.body.isPublished === "false" ? false : true,

      schedule,
      imageUrl,
      imagePublicId,
      createdBy: userId,
      tests: [],
    });

    res.status(201).json({ success: true, data: doc });
  } catch (e) {
    next(e);
  }
};

export const listPublicTestSeries = async (req, res, next) => {
  try {
    const items = await TestSeries.find({ isPublished: true }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: items });
  } catch (e) {
    next(e);
  }
};

export const listTeacherMine = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const items = await TestSeries.find({ createdBy: userId }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: items });
  } catch (e) {
    next(e);
  }
};

// ✅ NEW: Teacher can fetch own series even if unpublished
export const getTeacherSeriesById = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const doc = await TestSeries.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: "Not found" });

    ensureOwner(doc, userId);
    res.json({ success: true, data: doc });
  } catch (e) {
    next(e);
  }
};

// ✅ public details (students)
export const getTestSeriesById = async (req, res, next) => {
  try {
    const doc = await TestSeries.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ success: false, message: "Not found" });
    if (!doc.isPublished) return res.status(403).json({ success: false, message: "Not published" });
    res.json({ success: true, data: doc });
  } catch (e) {
    next(e);
  }
};

export const updateTestSeries = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const doc = await TestSeries.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: "Not found" });

    ensureOwner(doc, userId);

    if (req.body.schedule) doc.schedule = JSON.parse(req.body.schedule);

    if (req.file?.buffer) {
      if (doc.imagePublicId) await cloudinary.uploader.destroy(doc.imagePublicId);

      const up = await uploadBufferToCloudinary(req.file.buffer, {
        folder: "test-series",
        resourceType: "image",
      });
      doc.imageUrl = up.secure_url;
      doc.imagePublicId = up.public_id;
    }

    doc.title = req.body.title ?? doc.title;
    doc.type = req.body.type ?? doc.type;
    doc.language = req.body.language ?? doc.language;

    // ✅ FORCE MCQ ONLY
    doc.questionType = "MCQ";

    doc.price = req.body.price !== undefined ? Number(req.body.price) : doc.price;
    doc.mrp = req.body.mrp !== undefined ? Number(req.body.mrp) : doc.mrp;
    doc.description = req.body.description ?? doc.description;

    doc.isPublished =
      req.body.isPublished !== undefined ? req.body.isPublished !== "false" : doc.isPublished;

    recomputeSeriesTotals(doc);

    await doc.save();
    res.json({ success: true, data: doc });
  } catch (e) {
    next(e);
  }
};

export const deleteTestSeries = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const doc = await TestSeries.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: "Not found" });

    ensureOwner(doc, userId);

    if (doc.imagePublicId) await cloudinary.uploader.destroy(doc.imagePublicId);
    await doc.deleteOne();

    res.json({ success: true, message: "Deleted" });
  } catch (e) {
    next(e);
  }
};

// -----------------------------
// SERIES TESTS (Teacher CRUD)
// -----------------------------

export const listSeriesTests = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const doc = await TestSeries.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: "Not found" });

    ensureOwner(doc, userId);

    res.json({ success: true, data: doc.tests || [] });
  } catch (e) {
    next(e);
  }
};

export const addSeriesTest = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const doc = await TestSeries.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: "Not found" });

    ensureOwner(doc, userId);

    const { name, totalQuestions = 0, totalMarks = 0, durationMinutes = 0 } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: "Test name is required" });

    doc.tests.push({
      name: name.trim(),
      totalQuestions: Number(totalQuestions) || 0,
      totalMarks: Number(totalMarks) || 0,
      durationMinutes: Number(durationMinutes) || 0,
      questions: [],
    });

    recomputeSeriesTotals(doc);
    await doc.save();

    res.status(201).json({ success: true, data: doc.tests });
  } catch (e) {
    next(e);
  }
};

export const updateSeriesTest = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const doc = await TestSeries.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: "Not found" });

    ensureOwner(doc, userId);

    const t = doc.tests.id(req.params.testId);
    if (!t) return res.status(404).json({ success: false, message: "Test not found" });

    const { name, totalQuestions, totalMarks, durationMinutes } = req.body;

    if (name !== undefined) t.name = String(name).trim();
    if (totalQuestions !== undefined) t.totalQuestions = Number(totalQuestions) || 0;
    if (durationMinutes !== undefined) t.durationMinutes = Number(durationMinutes) || 0;

    // ✅ if totalMarks not provided, auto compute from current questions
    if (totalMarks !== undefined) {
      t.totalMarks = Number(totalMarks) || 0;
    } else {
      t.totalMarks = sumMarksFromQuestions(t.questions);
    }

    recomputeSeriesTotals(doc);
    await doc.save();

    res.json({ success: true, data: doc.tests });
  } catch (e) {
    next(e);
  }
};

export const deleteSeriesTest = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const doc = await TestSeries.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: "Not found" });

    ensureOwner(doc, userId);

    const t = doc.tests.id(req.params.testId);
    if (!t) return res.status(404).json({ success: false, message: "Test not found" });

    t.deleteOne();

    recomputeSeriesTotals(doc);
    await doc.save();

    res.json({ success: true, data: doc.tests });
  } catch (e) {
    next(e);
  }
};

// -----------------------------
// TEST QUESTIONS (Teacher) - MCQ ONLY
// -----------------------------

const normalizeMcq = (q) => {
  const options = Array.isArray(q?.options) ? q.options.map((x) => String(x ?? "")) : [];
  const safeOptions = [...options, "", "", "", ""].slice(0, 4);

  const correctIndexNum = Number(q?.correctIndex);
  const correctIndex =
    Number.isFinite(correctIndexNum) && correctIndexNum >= 0 && correctIndexNum <= 3
      ? correctIndexNum
      : 0;

  const marksNum = Number(q?.marks);
  const marks = Number.isFinite(marksNum) && marksNum >= 0 ? marksNum : 1;

  return {
    q: String(q?.q ?? ""),
    options: safeOptions,
    correctIndex,
    marks,
    explanation: String(q?.explanation ?? ""),
  };
};

export const getTestQuestions = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const { id, testId } = req.params;

    const series = await TestSeries.findById(id);
    if (!series) return res.status(404).json({ success: false, message: "Series not found" });

    ensureOwner(series, userId);

    const test = series.tests.id(testId);
    if (!test) return res.status(404).json({ success: false, message: "Test not found" });

    res.json({ success: true, data: test.questions || [] });
  } catch (e) {
    next(e);
  }
};

export const saveTestQuestionsBulk = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const { id, testId } = req.params;
    const { questions } = req.body;

    if (!Array.isArray(questions)) {
      return res.status(400).json({ success: false, message: "questions must be an array" });
    }

    const series = await TestSeries.findById(id);
    if (!series) return res.status(404).json({ success: false, message: "Series not found" });

    ensureOwner(series, userId);

    const test = series.tests.id(testId);
    if (!test) return res.status(404).json({ success: false, message: "Test not found" });

    // ✅ normalize + enforce EXACT count = test.totalQuestions
    const targetLen = Math.max(0, Number(test.totalQuestions || 0));
    let normalized = questions.map(normalizeMcq);

    if (normalized.length < targetLen) {
      while (normalized.length < targetLen) normalized.push(normalizeMcq({}));
    }
    if (normalized.length > targetLen) normalized = normalized.slice(0, targetLen);

    test.questions = normalized;

    // ✅ auto-compute totalMarks from question marks
    test.totalMarks = sumMarksFromQuestions(test.questions);

    recomputeSeriesTotals(series);
    await series.save();

    res.json({ success: true, message: "Questions saved", data: test.questions });
  } catch (e) {
    next(e);
  }
};
