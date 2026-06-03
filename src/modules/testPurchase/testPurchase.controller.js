import TestPurchase from "./testPurchase.model.js";
import TestSeries from "../testSeries/testSeries.model.js";
import LiveAttempt from "../liveTests/liveAttempt.model.js"; // ✅ NEW

const getUserId = (req) => req.user?._id || req.user?.id;

export const confirmPurchase = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { testSeriesId, provider = "MANUAL", transactionId = "" } = req.body;

    const series = await TestSeries.findById(testSeriesId).lean();
    if (!series || !series.isPublished) {
      return res.status(404).json({ success: false, message: "Test series not found" });
    }

    const amountPaid = Number(series.price || 0);

    const doc = await TestPurchase.findOneAndUpdate(
      { user: userId, testSeries: testSeriesId },
      { $set: { status: "PAID", amountPaid, provider, transactionId } },
      { upsert: true, new: true }
    );

    res.json({ success: true, data: doc });
  } catch (e) {
    next(e);
  }
};

export const myPurchasedSeries = async (req, res, next) => {
  try {
   const userId = getUserId(req);
const items = await TestPurchase.find({ user: userId, status: "PAID" })

      .populate("testSeries")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: items.map((x) => x.testSeries).filter(Boolean) });
  } catch (e) {
    next(e);
  }
};

export const hasPurchased = async (req, res, next) => {
  try {
    const userId = getUserId(req);
const found = await TestPurchase.findOne({
  user: userId,
  testSeries: req.params.id,
  status: "PAID",
}).lean();


    res.json({ success: true, purchased: !!found });
  } catch (e) {
    next(e);
  }
};

// ✅ NEW: purchased student series details INCLUDING attempt/submission for each test
export const mySeriesDetails = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const { seriesId } = req.params;

    // ensure purchased
    const purchased = await TestPurchase.findOne({
      user: userId,
      testSeries: seriesId,
      status: "PAID",
    }).lean();

    if (!purchased) {
      return res.status(403).json({ success: false, message: "Not purchased" });
    }

    const series = await TestSeries.findById(seriesId).lean();
    if (!series) return res.status(404).json({ success: false, message: "Series not found" });

    // fetch attempts by this student
    const attempts = await LiveAttempt.find({ user: userId, seriesId }).lean();

    const byTestId = new Map();
    for (const a of attempts) {
      byTestId.set(String(a.testId), {
        attemptId: String(a._id),
        submitted: !!a.submitted,
        submittedAt: a.submittedAt || null,
        score: a.score ?? 0,
        totalMarks: a.totalMarks ?? 0,
      });
    }

    // attach attempt to each embedded test
    const tests = (series.tests || []).map((t) => {
      const att = byTestId.get(String(t._id)) || null;
      return {
        ...t,
        attempted: !!att?.submitted, // ✅ used by frontend computeTestStatus
        attempt: att,               // ✅ used by frontend for score, etc.
      };
    });

    res.json({
      success: true,
      data: {
        ...series,
        tests,
      },
    });
  } catch (e) {
    next(e);
  }
};
// ✅ ADMIN: list all paid purchases (for fees collection style page)
export const adminListPurchases = async (req, res, next) => {
  try {
    const items = await TestPurchase.find({ status: "PAID" })
      .populate("user", "name email role")         // adjust fields if your User schema differs
      .populate("testSeries")                      // brings title, price, etc.
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: items });
  } catch (e) {
    next(e);
  }
};

