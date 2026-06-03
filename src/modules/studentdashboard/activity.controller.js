import { LessonWatch } from "./lessonWatch.model.js";

// POST /api/v1/activity/lesson-watch/:lessonId
export async function markLessonWatched(req, res, next) {
  try {
    await LessonWatch.create({
      studentId: req.user.id,
      lessonId: req.params.lessonId,
    });

    return res.json({ success: true });
  } catch (e) {
    // duplicate entry = already watched → ignore
    return res.json({ success: true });
  }
}

// GET /api/v1/activity/lesson-watch/count
export async function getLessonWatchCount(req, res, next) {
  try {
    const count = await LessonWatch.countDocuments({
      studentId: req.user.id,
    });

    return res.json({ success: true, count });
  } catch (e) {
    next(e);
  }
}
