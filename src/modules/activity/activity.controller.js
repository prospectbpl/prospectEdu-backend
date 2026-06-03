import { Activity } from "./activity.model.js";

const DEDUPE_WINDOW_MS = 30 * 60 * 1000;

export const logActivity = async (req, res) => {
  try {
    console.log("REQ.USER =", req.user);
    const userId = req.user?._id || req.user?.id;
if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const { type, title, route } = req.body;

    if (!type || !title) {
      return res
        .status(400)
        .json({ success: false, message: "type and title are required" });
    }

    const now = new Date();
    const windowStart = new Date(now.getTime() - DEDUPE_WINDOW_MS);

    const normalizedRoute = route ?? ""; // ✅ always string

    // ✅ 1) Deduplicate within last 30 minutes
    const recentSame = await Activity.findOne({
      userId,
      type,
      route: normalizedRoute,
      createdAt: { $gte: windowStart },
    }).sort({ createdAt: -1 });

    if (recentSame) {
      return res.json({
        success: true,
        skipped: true,
        message: "Duplicate activity within 30 minutes skipped",
      });
    }

    // ✅ 2) Create new activity
    const activity = await Activity.create({
      userId,
      type,
      title,
      route: normalizedRoute,
    });

    // ✅ 3) Keep only latest 7 (delete older)
    const latestSeven = await Activity.find({ userId })
      .sort({ createdAt: -1 })
      .limit(7)
      .select("_id");

    const keepIds = latestSeven.map((a) => a._id);

    await Activity.deleteMany({
      userId,
      _id: { $nin: keepIds },
    });

    return res.status(201).json({ success: true, activity });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to log activity",
      error: err.message,
    });
  }
};

export async function myRecentActivities(req, res, next) {
  try {
    const userId = req.user?._id || req.user?.id;
if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const activities = await Activity.find({ userId })
      .sort({ createdAt: -1 })
      .limit(7) // ✅ only 7
      .select("type title route createdAt");

    res.json({ success: true, activities });
  } catch (e) {
    next(e);
  }
}
  
