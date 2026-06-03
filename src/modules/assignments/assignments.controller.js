import mongoose from "mongoose";
import { Assignment } from "./assignments.model.js";
import { Course } from "../courses/course.model.js";
import { uploadBufferToCloudinaryAny } from "../../utils/cloudinaryUploadAny.js";
import { deleteFromCloudinary } from "../../utils/cloudinaryDelete.js";
import { assertStudentHasCourseAccess } from "../../utils/courseAccess.js";

// ✅ same logic you used elsewhere
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

  const ok = (course.assignedTeachers || []).some(
    (t) => String(t) === String(req.user.id)
  );

  if (!ok) {
    const err = new Error("You are not assigned to this course");
    err.statusCode = 403;
    throw err;
  }
  return true;
}

/**
 * POST /api/v1/assignments/courses/:courseId
 * form-data:
 *  - title (required)
 *  - instructions
 *  - dueDate (YYYY-MM-DD)
 *  - maxMarks (number)
 *  - file (optional) pdf/doc/docx
 */
export async function createAssignment(req, res, next) {
  try {
    if (!isAdmin(req) && !isTeacher(req)) return badRole(res);

    const { courseId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ success: false, message: "Invalid courseId" });
    }

    await assertTeacherAssignedOrAdmin(req, courseId);

    const { title, instructions = "", dueDate = "", maxMarks = 0 } = req.body || {};
    if (!title?.trim()) {
      return res.status(422).json({ success: false, message: "Assignment title is required" });
    }

    let fileUrl = "";
    let filePublicId = "";
    let fileName = "";
    let mimeType = "";

    // optional file upload
    if (req.file?.buffer) {
      fileName = req.file.originalname || "";
      mimeType = req.file.mimetype || "";

      // for pdf/doc/docx we use resource_type: "raw"
      const uploaded = await uploadBufferToCloudinaryAny({
        buffer: req.file.buffer,
        folder: `assignments/${courseId}`,
        resource_type: "raw",
      });

      fileUrl = uploaded.secure_url;
      filePublicId = uploaded.public_id;
    }

    const doc = await Assignment.create({
      courseId,
      title: title.trim(),
      instructions: String(instructions || ""),
      dueDate: dueDate ? new Date(dueDate) : null,
      maxMarks: Number(maxMarks || 0),

      fileUrl,
      filePublicId,
      fileName,
      mimeType,

      createdBy: req.user.id,
    });

    return res.json({ success: true, assignment: doc });
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/v1/assignments/teacher/courses/:courseId
 * Teacher/Admin can list assignments for a course (assigned teacher only)
 */
export async function teacherListAssignments(req, res, next) {
  try {
    if (!isAdmin(req) && !isTeacher(req)) return badRole(res);

    const { courseId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ success: false, message: "Invalid courseId" });
    }

    await assertTeacherAssignedOrAdmin(req, courseId);

    const items = await Assignment.find({ courseId })
      .sort({ createdAt: -1 })
      .select("-__v");

    return res.json({ success: true, assignments: items });
  } catch (e) {
    next(e);
  }
}

/**
 * PATCH /api/v1/assignments/:assignmentId
 * Update title/instructions/dueDate/maxMarks (no file replace for now)
 */
export async function updateAssignment(req, res, next) {
  try {
    if (!isAdmin(req) && !isTeacher(req)) return badRole(res);

    const { assignmentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
      return res.status(400).json({ success: false, message: "Invalid assignmentId" });
    }

    const existing = await Assignment.findById(assignmentId);
    if (!existing) return res.status(404).json({ success: false, message: "Assignment not found" });

    await assertTeacherAssignedOrAdmin(req, existing.courseId);

    const { title, instructions, dueDate, maxMarks } = req.body || {};

    if (title !== undefined) existing.title = String(title).trim();
    if (instructions !== undefined) existing.instructions = String(instructions);
    if (dueDate !== undefined) existing.dueDate = dueDate ? new Date(dueDate) : null;
    if (maxMarks !== undefined) existing.maxMarks = Number(maxMarks || 0);

    await existing.save();
    return res.json({ success: true, assignment: existing });
  } catch (e) {
    next(e);
  }
}

/**
 * DELETE /api/v1/assignments/:assignmentId
 * Deletes record + Cloudinary file (if any)
 */
export async function deleteAssignment(req, res, next) {
  try {
    if (!isAdmin(req) && !isTeacher(req)) return badRole(res);

    const { assignmentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
      return res.status(400).json({ success: false, message: "Invalid assignmentId" });
    }

    const existing = await Assignment.findById(assignmentId);
    if (!existing) return res.status(404).json({ success: false, message: "Assignment not found" });

    await assertTeacherAssignedOrAdmin(req, existing.courseId);

    // delete cloudinary file (raw)
    if (existing.filePublicId) {
      await deleteFromCloudinary(existing.filePublicId, "raw");
    }

    await Assignment.deleteOne({ _id: assignmentId });

    return res.json({ success: true, deleted: true });
  } catch (e) {
    next(e);
  }
}


/**
 * GET /api/v1/assignments/courses/:courseId
 * Student list assignments for a course (purchased/enrolled)
 */
export async function studentListAssignments(req, res, next) {
  try {
    const { courseId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ success: false, message: "Invalid courseId" });
    }

    await assertStudentHasCourseAccess(req.user.id, courseId);

    const items = await Assignment.find({ courseId })
      .sort({ createdAt: -1 })
      .select("-__v");

    return res.json({ success: true, assignments: items });
  } catch (e) {
    next(e);
  }
}
