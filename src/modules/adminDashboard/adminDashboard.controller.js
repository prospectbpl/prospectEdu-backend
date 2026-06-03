import { User } from "../users/user.model.js";
import { Course } from "../courses/course.model.js";
import { Purchase } from "../purchases/purchase.model.js"; // ✅ adjust: purchase vs purchases

export async function getAdminDashboardStats(req, res, next) {
  try {
    const now = new Date();

    // last 30 days window
    const since30 = new Date(now);
    since30.setDate(now.getDate() - 30);

    // previous 30 days window (30–60 days ago)
    const since60 = new Date(now);
    since60.setDate(now.getDate() - 60);

    const [
      totalStudents,
      newStudentsLast30Days,
      totalCourses,
      coursesLast30Days,
      coursesPrev30Days,
      purchaseAgg,
    ] = await Promise.all([
      User.countDocuments({ role: "student" }),
      User.countDocuments({ role: "student", createdAt: { $gte: since30 } }),

      Course.countDocuments({}),
      Course.countDocuments({ createdAt: { $gte: since30 } }),
      Course.countDocuments({ createdAt: { $gte: since60, $lt: since30 } }),

      Purchase.aggregate([
        { $match: { status: "paid", currency: "INR" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    const feesCollectedInr = purchaseAgg?.[0]?.total || 0;

    // Growth % (avoid divide by 0)
    let courseGrowthPercent = 0;
    if (coursesPrev30Days > 0) {
      courseGrowthPercent = Math.round(
        ((coursesLast30Days - coursesPrev30Days) / coursesPrev30Days) * 100
      );
    } else if (coursesLast30Days > 0) {
      courseGrowthPercent = 100; // if previously 0 and now >0
    }

    return res.json({
      success: true,
      stats: {
        totalStudents,
        newStudentsLast30Days,
        totalCourses,
        feesCollectedInr,

        // ✅ optional: for frontend progress/text (no hardcoding)
        courseGrowth: {
          percentage: courseGrowthPercent,
          days: 30,
        },
      },
    });
  } catch (e) {
    next(e);
  }
}
