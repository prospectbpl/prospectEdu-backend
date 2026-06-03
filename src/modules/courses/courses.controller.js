
// server/modules/courses/courses.controller.js
import mongoose from "mongoose";
import { Course } from "./course.model.js";
import { Enrollment } from "./enrollment.model.js";
import { User } from "../users/user.model.js";
import {
  createCourseSchema,
  updateCourseSchema,
  setCourseStatusSchema,
  assignTeachersSchema,
} from "./courses.validators.js";


/**
 * Helpers
 */
function isTeacher(req) {
  return req?.user?.role === "teacher";
}
function isAdmin(req) {
  return req?.user?.role === "admin";
}
function badRole(res) {
  return res.status(403).json({ success: false, message: "Forbidden" });
}

function normalizeStringArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map((x) => String(x || "").trim()).filter(Boolean);
}

function normalizeTags(arr) {
  const list = normalizeStringArray(arr);
  const seen = new Set();
  const out = [];
  for (const t of list) {
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

export async function assertTeacherAssignedOrAdmin(req, course) {
  if (isAdmin(req)) return true;
  if (!isTeacher(req)) return false;

  const tid = String(req.user.id);
  const assigned = (course.assignedTeachers || []).some((x) => String(x) === tid);
  return assigned;
}

/**
 * =========================
 * ADMIN: Course Master CRUD
 * =========================
 */

/**
 * POST /api/v1/courses (admin ONLY)
 * ✅ Now matches your Admin Add Course frontend fields:
 * title, category, short, description, info, professors, price, discount, tax, date, tags, img
 */
export async function createCourse(req, res, next) {
  try {
    if (!isAdmin(req)) return badRole(res);

    const data = createCourseSchema.parse(req.body);

    const course = await Course.create({
      // ===== FRONTEND FIELDS (same names) =====
      title: data.title,
      category: String(data.category || "")
  .toLowerCase()
  .trim(),

      short: data.short || "",
      description: data.description || "",
      info: data.info || "",

      professors: normalizeStringArray(data.professors),

      price: Number(data.price || 0),
      discount: Number(data.discount || 0),
      tax: Number(data.tax || 0),

      date: data.date || "",
      img: data.img || "",

      tags: normalizeTags(data.tags), 

      // ===== AUTOMATION FIELDS =====
      status: "published",
      createdBy: req.user.id,

      // keep if your schema allows these
      assignedTeachers: (data.assignedTeachers || [])
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id)),

      settings: data.settings || {},
    });

    res.json({ success: true, course });
  } catch (e) {
    if (e?.name === "ZodError") {
      return res.status(422).json({
        success: false,
        message: e.errors?.[0]?.message || "Invalid input",
      });
    }
    next(e);
  }
}

/**
 * GET /api/v1/courses/admin
 * list all courses (any status) + search + pagination
 */
export async function adminListCourses(req, res, next) {
  try {
    if (!isAdmin(req)) return badRole(res);

    const courses = await Course.find({})
      .sort({ createdAt: -1 })
      .select("-__v");

    res.json({ success: true, courses });
  } catch (e) {
    next(e);
  }
}


/**
 * GET /api/v1/courses/admin/:id
 */
export async function adminGetCourse(req, res, next) {
  try {
    if (!isAdmin(req)) return badRole(res);

    const course = await Course.findById(req.params.id)
  .populate("assignedTeachers", "fullName")   // ✅ add this
  .select("-__v");
    if (!course) return res.status(404).json({ success: false, message: "Course not found" });

    res.json({ success: true, course });
  } catch (e) {
    next(e);
  }
}

/**
 * PATCH /api/v1/courses/admin/:id
 * ✅ Updates only frontend fields (same names) + keeps automation fields untouched
 */
export async function adminUpdateCourse(req, res, next) {
  try {
    if (!isAdmin(req)) return badRole(res);

    const data = updateCourseSchema.parse(req.body);

    const update = { ...data };

    // normalize arrays if present

    if (data.professors) update.professors = normalizeStringArray(data.professors);
    if (data.tags) update.tags = normalizeTags(data.tags);
if (data.assignedTeachers) {
  update.assignedTeachers = (data.assignedTeachers || [])
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
}
    // coerce numbers if present
    if (data.price !== undefined) update.price = Number(data.price || 0);
    if (data.discount !== undefined) update.discount = Number(data.discount || 0);
    if (data.tax !== undefined) update.tax = Number(data.tax || 0);

    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true }
    ).select("-__v");

    if (!course) return res.status(404).json({ success: false, message: "Course not found" });

    res.json({ success: true, course });
  } catch (e) {
    if (e?.name === "ZodError") {
      return res.status(422).json({
        success: false,
        message: e.errors?.[0]?.message || "Invalid input",
      });
    }
    next(e);
  }
}

/**
 * PATCH /api/v1/courses/admin/:id/settings
 * (Keep only if your validators/model include settings)
 */
export async function adminUpdateCourseSettings(req, res, next) {
  try {
    if (!isAdmin(req)) return badRole(res);

    const data = updateCourseSettingsSchema.parse(req.body);

    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { $set: { settings: { ...data } } },
      { new: true }
    ).select("-__v");

    if (!course) return res.status(404).json({ success: false, message: "Course not found" });

    res.json({ success: true, course });
  } catch (e) {
    if (e?.name === "ZodError") {
      return res.status(422).json({
        success: false,
        message: e.errors?.[0]?.message || "Invalid input",
      });
    }
    next(e);
  }
}

/**
 * PATCH /api/v1/courses/admin/:id/status
 */
export async function adminSetCourseStatus(req, res, next) {
  try {
    if (!isAdmin(req)) return badRole(res);

    const { status } = setCourseStatusSchema.parse(req.body);

    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { $set: { status } },
      { new: true }
    ).select("-__v");

    if (!course) return res.status(404).json({ success: false, message: "Course not found" });

    res.json({ success: true, course });
  } catch (e) {
    if (e?.name === "ZodError") {
      return res.status(422).json({
        success: false,
        message: e.errors?.[0]?.message || "Invalid input",
      });
    }
    next(e);
  }
}

/**
 * PATCH /api/v1/courses/admin/:id/assign-teachers
 */
export async function adminAssignTeachers(req, res, next) {
  try {
    if (!isAdmin(req)) return badRole(res);

    const { teacherIds } = assignTeachersSchema.parse(req.body);

    const ids = (teacherIds || [])
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { $set: { assignedTeachers: ids } },
      { new: true }
    ).select("-__v");

    if (!course) return res.status(404).json({ success: false, message: "Course not found" });

    res.json({ success: true, course });
  } catch (e) {
    if (e?.name === "ZodError") {
      return res.status(422).json({
        success: false,
        message: e.errors?.[0]?.message || "Invalid input",
      });
    }
    next(e);
  }
}

/**
 * DELETE /api/v1/courses/admin/:id
 */
export async function adminDeleteCourse(req, res, next) {
  try {
    if (!isAdmin(req)) return badRole(res);

    const course = await Course.findByIdAndDelete(req.params.id).select("_id");
    if (!course) return res.status(404).json({ success: false, message: "Course not found" });

    res.json({ success: true, deleted: true });
  } catch (e) {
    next(e);
  }
}

/**
 * =========================
 * PUBLIC/STUDENT browsing
 * =========================
 */

export async function listPublishedCourses(req, res, next) {
  try {
    const { q = "", page = 1, limit = 12, category } = req.query;

    const p = Math.max(1, Number(page));
    const l = Math.min(50, Math.max(1, Number(limit)));

    const filter = { status: "published" };

    if (category) {
      filter.category = String(category).trim().toLowerCase();
    }

    if (q) {
      filter.$text = { $search: String(q) };
    }

    const courses = await Course.find(filter)
      .sort({ createdAt: -1 })
      .skip((p - 1) * l)
      .limit(l)
      .select("-__v");

    console.log("FOUND COURSES =", courses.length);
    res.json({ success: true, page: p, limit: l, courses });
  } catch (e) {
    next(e);
  }
}



export async function getCourseById(req, res, next) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
  return res.status(400).json({ success: false, message: "Invalid course id" });
}

    const course = await Course.findOne({ _id: req.params.id, status: "published" })
  .populate("assignedTeachers", "fullName")
  .select("-__v");

    if (!course) return res.status(404).json({ success: false, message: "Course not found" });
    res.json({ success: true, course });
  } catch (e) {
    next(e);
  }
}

export async function getCourseBySlug(req, res, next) {
  try {
   const course = await Course.findOne({ slug: req.params.slug, status: "published" })
  .populate("assignedTeachers", "fullName")
  .select("-__v");

    if (!course) return res.status(404).json({ success: false, message: "Course not found" });
    res.json({ success: true, course });
  } catch (e) {
    next(e);
  }
}

/**
 * =========================
 * TEACHER: assigned courses
 * =========================
 */

export async function teacherMyCourses(req, res, next) {
  try {
    if (!isTeacher(req)) return badRole(res);

    const courses = await Course.find({
      assignedTeachers: req.user.id,
      status: { $in: ["published", "draft", "archived"] },
    })
      .sort({ updatedAt: -1 })
      .select("-__v");

    res.json({ success: true, courses });
  } catch (e) {
    next(e);
  }
}

export async function teacherGetCourseForManagement(req, res, next) {
  try {
      if (!mongoose.Types.ObjectId.isValid(req.params.courseId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid course id",
      });
    }
    if (!isTeacher(req)) return badRole(res);

    const course = await Course.findById(req.params.courseId).select("-__v");
    if (!course) return res.status(404).json({ success: false, message: "Course not found" });

    const ok = await assertTeacherAssignedOrAdmin(req, course);
    if (!ok) return badRole(res);

    res.json({ success: true, course });
  } catch (e) {
    next(e);
  }
}

/**
 * =========================
 * STUDENT enroll + my courses
 * =========================
 */

export async function enrollInCourse(req, res, next) {
  try {
    const course = await Course.findOne({ _id: req.params.id, status: "published" });
    if (!course) return res.status(404).json({ success: false, message: "Course not found" });

    // keep your paid logic if you have it; otherwise remove later
    if (course.isPaid) {
      return res.status(403).json({ success: false, message: "This is a paid course. Purchase required." });
    }

    const enrollment = await Enrollment.create({
      studentUserId: req.user.id,
      courseId: course._id,
      status: "active",
    });

    res.json({ success: true, enrollment });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ success: false, message: "Already enrolled" });
    }
    next(e);
  }
}

export async function listMyCourses(req, res, next) {
  try {
    const enrollments = await Enrollment.find({ studentUserId: req.user.id })
      .sort({ createdAt: -1 })
      .populate("courseId", "title slug category short img price discount tax date status")
      .select("status enrolledAt courseId");

    const courses = enrollments
      .filter((e) => e.courseId)
      .map((e) => ({
        enrollmentStatus: e.status,
        enrolledAt: e.enrolledAt,
        course: e.courseId,
      }));

    res.json({ success: true, courses });
  } catch (e) {
    next(e);
  }
}

// server/modules/courses/courses.controller.js
 // ✅ add if not already imported

export async function teacherListEnrolledStudents(req, res, next) {
  try {
    const { courseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ success: false, message: "Invalid course id" });
    }

    const course = await Course.findById(courseId).select("_id assignedTeachers");
    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    // ✅ teacher must be assigned OR admin
    const ok = await assertTeacherAssignedOrAdmin(req, course);
    if (!ok) return badRole(res);

    const enrollments = await Enrollment.find({ courseId, status: "active" })
      .sort({ updatedAt: -1 })
      .select("studentUserId enrolledAt updatedAt")
      .lean();

    const studentIds = enrollments.map((e) => e.studentUserId);

    const users = await User.find({ _id: { $in: studentIds }, role: "student" })
      .select("_id fullName email phone lastLoginAt updatedAt")
      .lean();

    const map = new Map(users.map((u) => [String(u._id), u]));

    const students = enrollments
      .map((e) => {
        const u = map.get(String(e.studentUserId));
        if (!u) return null;

        // ✅ last active: prefer lastLoginAt, fallback to user.updatedAt or enrollment.updatedAt
        const lastActive = u.lastLoginAt || u.updatedAt || e.updatedAt;

        return {
          _id: u._id,
          fullName: u.fullName || "—",
          email: u.email || "—",
          phone: u.phone || "—",
          lastActive,
          enrolledAt: e.enrolledAt,
        };
      })
      .filter(Boolean);

    return res.json({ success: true, courseId, students });
  } catch (e) {
    next(e);
  }
}
