import crypto from "crypto";
import Razorpay from "razorpay";
import { Course } from "../courses/course.model.js";
import { Enrollment } from "../courses/enrollment.model.js";
import { Purchase } from "./purchase.model.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * STEP 1: Create pending purchase (checkout)
 */
export async function createCheckout(req, res, next) {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    const course = await Course.findOne({ _id: courseId, status: "published" });
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    const price = Number(course.price || 0);
    const discount = Number(course.discount || 0);

    // ✅ tax treated as % (matches your UI)
    const taxPercent = Number(course.tax || 0);
    const taxAmount = (price * taxPercent) / 100;

    const amount = Math.max(0, price - discount + taxAmount);

    const purchase = await Purchase.create({
      userId,
      courseId,
      amount,
      currency: "INR",
      status: "pending",
      provider: "razorpay",
    });

    return res.json({
      success: true,
      purchaseId: purchase._id,
      amount: purchase.amount,
      currency: purchase.currency,
    });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Purchase already exists",
      });
    }
    next(e);
  }
}

/**
 * ✅ Razorpay: create order for this pending purchase
 */
export async function createRazorpayOrderForCourse(req, res, next) {
  try {
    const { purchaseId } = req.params;
    const userId = req.user.id;

    const purchase = await Purchase.findOne({ _id: purchaseId, userId, status: "pending" })
      .populate("courseId", "title");

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: "Purchase not found or not pending",
      });
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({
        success: false,
        message: "Razorpay keys missing in env",
      });
    }

    const amountInPaise = Math.round(Number(purchase.amount || 0) * 100);
    if (amountInPaise <= 0) {
      return res.status(400).json({ success: false, message: "Amount must be greater than 0" });
    }

    const rzOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: purchase.currency || "INR",
      receipt: `course_${String(purchase._id).slice(-18)}`, // short receipt
      notes: {
        purchaseId: String(purchase._id),
        userId: String(userId),
      },
    });

    purchase.provider = "razorpay";
    purchase.providerOrderId = rzOrder.id;
    await purchase.save();

    return res.json({
      success: true,
      data: {
        keyId: process.env.RAZORPAY_KEY_ID,
        razorpayOrderId: rzOrder.id,
        amount: rzOrder.amount,
        currency: rzOrder.currency,
        purchaseId: String(purchase._id),
        courseTitle: purchase.courseId?.title || "Course",
      },
    });
  } catch (e) {
    next(e);
  }
}

/**
 * ✅ Razorpay: verify signature, mark paid, enroll student
 */
export async function verifyRazorpayPaymentForCourse(req, res, next) {
  try {
    const { purchaseId } = req.params;
    const userId = req.user.id;

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: "Missing payment details" });
    }

    const purchase = await Purchase.findOne({ _id: purchaseId, userId, status: "pending" });
    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: "Purchase not found or already confirmed",
      });
    }

    // must match the stored order id
    if (purchase.providerOrderId && purchase.providerOrderId !== razorpay_order_id) {
      return res.status(400).json({ success: false, message: "OrderId mismatch" });
    }

    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expected !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Invalid payment signature" });
    }

    // ✅ mark paid
    purchase.status = "paid";
    purchase.paidAt = new Date();
    purchase.provider = "razorpay";
    purchase.providerOrderId = razorpay_order_id;
    purchase.providerPaymentId = razorpay_payment_id;
    await purchase.save();

    // ✅ enroll student
    let enrollment = null;
    try {
      enrollment = await Enrollment.create({
        studentUserId: userId,
        courseId: purchase.courseId,
        status: "active",
      });
    } catch (e) {
      if (e?.code !== 11000) throw e;
    }

    return res.json({
      success: true,
      message: "Payment verified and enrollment activated",
      purchase,
      enrollment: enrollment || null,
    });
  } catch (e) {
    next(e);
  }
}

/**
 * (Your existing confirmPurchase can stay for manual/admin cases)
 */
export async function confirmPurchase(req, res, next) {
  try {
    const { purchaseId } = req.params;
    const userId = req.user.id;

    const purchase = await Purchase.findOneAndUpdate(
      { _id: purchaseId, userId, status: "pending" },
      {
        $set: {
          status: "paid",
          paidAt: new Date(),
          providerPaymentId: req.body?.providerPaymentId || "manual_paid",
        },
      },
      { new: true }
    );

    if (!purchase) {
      return res.status(409).json({
        success: false,
        message: "Purchase not found or already confirmed",
      });
    }

    let enrollment;
    try {
      enrollment = await Enrollment.create({
        studentUserId: userId,
        courseId: purchase.courseId,
        status: "active",
      });
    } catch (e) {
      if (e?.code !== 11000) throw e;
    }

    return res.json({
      success: true,
      message: "Payment confirmed and enrollment activated",
      purchase,
      enrollment: enrollment || null,
    });
  } catch (e) {
    next(e);
  }
}


export async function purchaseCourse(req, res, next) {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    const course = await Course.findOne({ _id: courseId, status: "published" });
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    const amount =
      Number(course.price || 0) -
      Number(course.discount || 0) +
      Number(course.tax || 0);

    // 1️⃣ Create purchase
    const purchase = await Purchase.create({
      userId,
      courseId,
      amount,
      currency: "INR",
      status: "paid",
    });

    // 2️⃣ Create enrollment
    const enrollment = await Enrollment.create({
      studentUserId: userId,
      courseId,
      status: "active",
    });

    res.json({
      success: true,
      message: "Course purchased & enrolled successfully",
      purchase,
      enrollment,
    });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Already purchased or already enrolled",
      });
    }
    next(e);
  }
}

export async function myPurchases(req, res, next) {
  try {
    const userId = req.user.id;

    const purchases = await Purchase.find({ userId, status: "paid" })
      .sort({ createdAt: -1 })
      .populate("courseId", "title slug category img price discount tax date status")
      .select("-__v");

    res.json({ success: true, purchases });
  } catch (e) {
    next(e);
  }
}
export async function adminListPurchases(req, res, next) {
  try {
    const role = req.user?.role;
    if (role !== "admin") {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const {
      q = "",
      status = "all",
      provider = "all",
      from = "",
      to = "",
      page = 1,
      limit = 15,
      sort = "createdAt_desc", // createdAt_desc | createdAt_asc | amount_desc | amount_asc
    } = req.query;

    const p = Math.max(1, Number(page || 1));
    const l = Math.min(100, Math.max(5, Number(limit || 15)));

    const filter = {};

    // status filter
    if (status && status !== "all") filter.status = String(status);

    // provider filter
    if (provider && provider !== "all") filter.provider = String(provider);

    // date range filter (createdAt)
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    // sorting
    const sortMap = {
      createdAt_desc: { createdAt: -1 },
      createdAt_asc: { createdAt: 1 },
      amount_desc: { amount: -1 },
      amount_asc: { amount: 1 },
    };
    const sortObj = sortMap[sort] || sortMap.createdAt_desc;

    // base query
    let query = Purchase.find(filter)
      .populate("userId", "fullName email phone isActive role")
      .populate("courseId", "title category price discount tax status")
      .select("-__v")
      .sort(sortObj);

    // search (student name/email/phone OR course title OR ids)
    const search = String(q || "").trim();
    if (search) {
      // If q looks like an ObjectId, try matching purchaseId/userId/courseId
      const isObjectId = mongoose.Types.ObjectId.isValid(search);

      // We'll do a two-step approach: fetch with populate then filter in JS for simple reliability
      // (keeps it simple, works well for moderate data).
      const all = await query.lean();

      const s = search.toLowerCase();
      const filtered = all.filter((x) => {
        const student = x.userId || {};
        const course = x.courseId || {};
        const hay = [
          String(x._id || ""),
          String(student._id || ""),
          String(course._id || ""),
          String(student.fullName || ""),
          String(student.email || ""),
          String(student.phone || ""),
          String(course.title || ""),
          String(x.providerOrderId || ""),
          String(x.providerPaymentId || ""),
        ]
          .join(" ")
          .toLowerCase();

        if (isObjectId) return hay.includes(search.toLowerCase());
        return hay.includes(s);
      });

      const total = filtered.length;
      const start = (p - 1) * l;
      const purchases = filtered.slice(start, start + l);

      // quick stats (from filtered set)
      const stats = buildStats(filtered);

      return res.json({
        success: true,
        page: p,
        limit: l,
        total,
        stats,
        purchases,
      });
    }

    // normal pagination (no q)
    const [total, rows] = await Promise.all([
      Purchase.countDocuments(filter),
      query
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
    ]);

    // quick stats (for current filter)
    const allForStats = await Purchase.find(filter).select("amount status").lean();
    const stats = buildStats(allForStats);

    return res.json({
      success: true,
      page: p,
      limit: l,
      total,
      stats,
      purchases: rows,
    });
  } catch (e) {
    next(e);
  }
}

function buildStats(list) {
  const stats = {
    totalCount: list.length,
    paidCount: 0,
    pendingCount: 0,
    failedCount: 0,
    refundedCount: 0,
    totalRevenue: 0,
  };

  for (const x of list) {
    if (x.status === "paid") {
      stats.paidCount += 1;
      stats.totalRevenue += Number(x.amount || 0);
    } else if (x.status === "pending") stats.pendingCount += 1;
    else if (x.status === "failed") stats.failedCount += 1;
    else if (x.status === "refunded") stats.refundedCount += 1;
  }

  return stats;
}
