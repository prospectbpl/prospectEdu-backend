// server/modules/courses/content.controller.js
import { Course } from "./course.model.js";
import { Enrollment } from "./enrollment.model.js";
import { CourseModule } from "./module.model.js";
import { Lesson } from "./lesson.model.js";
import cloudinary from "../../config/cloudinary.js"; // adjust path if different
import https from "https";

/**
 * Helper: student must be enrolled to view content (for now)
 */
async function assertStudentEnrolled(req, courseId) {
  const enr = await Enrollment.findOne({ studentUserId: req.user.id, courseId, status: "active" });
  if (!enr) {
    const err = new Error("Enroll in the course to access content");
    err.statusCode = 403;
    throw err;
  }
}

/**
 * Helper: teacher must be assigned (admin always allowed)
 */
async function assertTeacherAssignedOrAdmin(req, courseId) {
  if (req.user.role === "admin") return;

  if (req.user.role !== "teacher") {
    const err = new Error("Forbidden");
    err.statusCode = 403;
    throw err;
  }

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
}

/**
 * TEACHER/ADMIN: Create module
 * POST /api/v1/courses/:courseId/modules
 */
export async function createModule(req, res, next) {
  try {
    const { courseId } = req.params;
    const { title, description = "", order = 0, isPublished = true } = req.body;

    if (!title) return res.status(422).json({ success: false, message: "Module title is required" });

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ success: false, message: "Course not found" });

    // ✅ enforce teacher assignment
    await assertTeacherAssignedOrAdmin(req, courseId);

    const moduleDoc = await CourseModule.create({
      courseId,
      title,
      description,
      order: Number(order || 0),
      isPublished: !!isPublished,
    });

    res.json({ success: true, module: moduleDoc });
  } catch (e) {
    next(e);
  }
}

/**
 * STUDENT: List modules for a course (enrolled only)
 * GET /api/v1/courses/:courseId/modules
 */
export async function listModules(req, res, next) {
  try {
    const { courseId } = req.params;

    const course = await Course.findOne({ _id: courseId, status: "published" });
    if (!course) return res.status(404).json({ success: false, message: "Course not found" });

    await assertStudentEnrolled(req, courseId);

    const modules = await CourseModule.find({ courseId, isPublished: true })
      .sort({ order: 1, createdAt: 1 })
      .select("-__v");

    res.json({ success: true, modules });
  } catch (e) {
    next(e);
  }
}

/**
 * TEACHER/ADMIN: Create lesson under module
 * POST /api/v1/modules/:moduleId/lessons
 */
export async function createLesson(req, res, next) {
  try {
    const { moduleId } = req.params;
    const {
  title,
  type = "video",
  contentUrl = "",
  filePublicId = "",
  fileName = "",
  mimeType = "",
  contentText = "",
  durationMinutes = 0,
  order = 0,
  isPreview = false,
  isPublished = true,
} = req.body;
    if (!title) return res.status(422).json({ success: false, message: "Lesson title is required" });

    const mod = await CourseModule.findById(moduleId);
    if (!mod) return res.status(404).json({ success: false, message: "Module not found" });

    // ✅ enforce teacher assignment (via courseId from module)
    await assertTeacherAssignedOrAdmin(req, mod.courseId);

    const lesson = await Lesson.create({
  courseId: mod.courseId,
  moduleId,
  title,
  type,
  contentUrl,
  filePublicId,
  fileName,
  mimeType,
  contentText,
  durationMinutes: Number(durationMinutes || 0),
  order: Number(order || 0),
  isPreview: !!isPreview,
  isPublished: !!isPublished,
});


    res.json({ success: true, lesson });
  } catch (e) {
    next(e);
  }
}

/**
 * STUDENT: List lessons in a module (enrolled only)
 * GET /api/v1/modules/:moduleId/lessons
 */
export async function listLessons(req, res, next) {
  try {
    const { moduleId } = req.params;

    const mod = await CourseModule.findById(moduleId);
    if (!mod) return res.status(404).json({ success: false, message: "Module not found" });

    const course = await Course.findOne({ _id: mod.courseId, status: "published" });
    if (!course) return res.status(404).json({ success: false, message: "Course not found" });

    await assertStudentEnrolled(req, mod.courseId);

    const lessons = await Lesson.find({ moduleId, isPublished: true })
      .sort({ order: 1, createdAt: 1 })
      .select("-__v");

    res.json({ success: true, lessons });
  } catch (e) {
    next(e);
  }
}

export async function teacherGetModulesWithLessons(req, res, next) {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId).select("_id assignedTeachers");
    if (!course) return res.status(404).json({ success: false, message: "Course not found" });

    await assertTeacherAssignedOrAdmin(req, courseId);

    const modules = await CourseModule.find({ courseId })
      .sort({ order: 1, createdAt: 1 })
      .select("-__v")
      .lean();

    const moduleIds = modules.map((m) => m._id);

    const lessons = await Lesson.find({ courseId, moduleId: { $in: moduleIds } })
      .sort({ order: 1, createdAt: 1 })
      .select("-__v")
      .lean();

    const map = new Map();
    for (const l of lessons) {
      const key = String(l.moduleId);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(l);
    }

    const result = modules.map((m) => ({
      ...m,
      lessons: map.get(String(m._id)) || [],
    }));

    return res.json({ success: true, modules: result });
  } catch (e) {
    next(e);
  }
}
export async function deleteLesson(req, res, next) {
  try {
    const { lessonId } = req.params;

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({ success: false, message: "Lesson not found" });
    }

    // Only assigned teacher/admin can delete
    await assertTeacherAssignedOrAdmin(req, lesson.courseId);

    // ✅ delete from Cloudinary (if filePublicId exists)
    if (lesson.filePublicId) {
      // decide resource_type based on mimeType/type
      const isVideo =
        lesson.type === "video" || (lesson.mimeType || "").startsWith("video/");
      const resource_type = isVideo ? "video" : "raw"; // pdf/doc/docx should be raw

      try {
        await cloudinary.uploader.destroy(lesson.filePublicId, { resource_type });
      } catch (err) {
        // don't crash delete if cloudinary deletion fails
        console.log("Cloudinary delete failed:", err?.message || err);
      }
    }

    await Lesson.deleteOne({ _id: lessonId });

    return res.json({ success: true, deleted: true });
  } catch (e) {
    next(e);
  }
}
export async function updateLesson(req, res, next) {
  try {
    const { lessonId } = req.params;
    const { title, fileName, isPublished, isPreview, order } = req.body || {};

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({ success: false, message: "Lesson not found" });
    }

    // only assigned teacher/admin
    await assertTeacherAssignedOrAdmin(req, lesson.courseId);

    // ✅ allow editing title + filename
    if (title !== undefined) lesson.title = String(title).trim();
    if (fileName !== undefined) lesson.fileName = String(fileName).trim();

    // optional fields
    if (isPublished !== undefined) lesson.isPublished = !!isPublished;
    if (isPreview !== undefined) lesson.isPreview = !!isPreview;
    if (order !== undefined) lesson.order = Number(order || 0);

    if (!lesson.title) {
      return res.status(422).json({ success: false, message: "Title is required" });
    }

    await lesson.save();

    return res.json({ success: true, lesson });
  } catch (e) {
    next(e);
  }
}
export async function getLessonFile(req, res, next) {
  try {
    const { lessonId } = req.params;

    const l = await Lesson.findById(lessonId).select("contentUrl fileName mimeType type");
    if (!l?.contentUrl) {
      return res.status(404).json({ success: false, message: "No file" });
    }

    // ✅ set proper headers so browser opens in new tab (inline)
    const mime = l.mimeType || (l.type === "pdf" ? "application/pdf" : "application/octet-stream");
    res.setHeader("Content-Type", mime);

    // inline forces browser viewer for PDF (and helps other types)
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(l.fileName || "file")}"`
    );

    // ✅ stream bytes from Cloudinary to browser
    https
      .get(l.contentUrl, (fileRes) => {
        if (fileRes.statusCode && fileRes.statusCode >= 400) {
          return res.status(fileRes.statusCode).end();
        }
        fileRes.pipe(res);
      })
      .on("error", (err) => next(err));
  } catch (e) {
    next(e);
  }
}
// ✅ Student: Course modules overview (enrolled only)
// GET /api/v1/content/student/courses/:courseId/modules-overview
export async function studentModulesOverview(req, res, next) {
  try {
    const { courseId } = req.params;

    const course = await Course.findOne({ _id: courseId, status: "published" })
      .select("title slug category short img date price")
      .lean();

    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    await assertStudentEnrolled(req, courseId);

    const modules = await CourseModule.find({ courseId, isPublished: true })
      .sort({ order: 1, createdAt: 1 })
      .select("_id courseId title description order isPublished createdAt updatedAt")
      .lean();

    const moduleIds = modules.map((m) => m._id);

    const lessons = await Lesson.find({
      courseId,
      moduleId: { $in: moduleIds },
      isPublished: true,
    })
      .select("_id moduleId durationMinutes type")
      .lean();

    const stats = new Map(); // moduleId -> { lessonCount, totalMinutes, videos, files }
    for (const l of lessons) {
      const key = String(l.moduleId);
      if (!stats.has(key)) {
        stats.set(key, { lessonCount: 0, totalMinutes: 0, videos: 0, files: 0 });
      }
      const s = stats.get(key);
      s.lessonCount += 1;
      s.totalMinutes += Number(l.durationMinutes || 0);

      if (String(l.type) === "video") s.videos += 1;
      else s.files += 1;
    }

    const enriched = modules.map((m) => {
      const s = stats.get(String(m._id)) || {
        lessonCount: 0,
        totalMinutes: 0,
        videos: 0,
        files: 0,
      };
      return { ...m, stats: s };
    });

    return res.json({ success: true, course, modules: enriched });
  } catch (e) {
    next(e);
  }
}

export async function updateModule(req, res, next) {
  try {
    const { moduleId } = req.params;
    const { title, description, order, isPublished } = req.body || {};

    const mod = await CourseModule.findById(moduleId);
    if (!mod) return res.status(404).json({ success: false, message: "Module not found" });

    // ✅ only assigned teacher/admin
    await assertTeacherAssignedOrAdmin(req, mod.courseId);

    if (title !== undefined) mod.title = String(title).trim();
    if (description !== undefined) mod.description = String(description || "").trim();
    if (order !== undefined) mod.order = Number(order || 0);
    if (isPublished !== undefined) mod.isPublished = !!isPublished;

    if (!mod.title) {
      return res.status(422).json({ success: false, message: "Module title is required" });
    }

    await mod.save();
    return res.json({ success: true, module: mod });
  } catch (e) {
    next(e);
  }
}

export async function deleteModule(req, res, next) {
  try {
    const { moduleId } = req.params;

    const mod = await CourseModule.findById(moduleId);
    if (!mod) return res.status(404).json({ success: false, message: "Module not found" });

    // ✅ only assigned teacher/admin
    await assertTeacherAssignedOrAdmin(req, mod.courseId);

    // ✅ delete all lessons + their cloudinary files
    const lessons = await Lesson.find({ moduleId: mod._id }).select("filePublicId mimeType type").lean();

    for (const l of lessons) {
      if (!l.filePublicId) continue;

      const isVideo = l.type === "video" || String(l.mimeType || "").startsWith("video/");
      const resource_type = isVideo ? "video" : "raw";

      try {
        await cloudinary.uploader.destroy(l.filePublicId, { resource_type });
      } catch (err) {
        console.log("Cloudinary delete failed:", err?.message || err);
      }
    }

    await Lesson.deleteMany({ moduleId: mod._id });
    await CourseModule.deleteOne({ _id: mod._id });

    return res.json({ success: true, deleted: true });
  } catch (e) {
    next(e);
  }
}





