import mongoose from "mongoose";
import { User } from "../users/user.model.js";
import { ParentProfile } from "../parents/parentProfile.model.js";
import { StudentReport } from "./studentReport.model.js";
import { uploadBufferToCloudinaryAny } from "../../utils/cloudinaryUploadAny.js";
import { Readable } from "stream"; // ✅ add at top with other imports



const MAX_FILES = 10;

async function getOrCreateStudentReport(studentId) {
  return StudentReport.findOneAndUpdate(
    { studentId },
    { $setOnInsert: { studentId, files: [] } },
    { new: true, upsert: true }
  );
}

/**
 * TEACHER: list students (simple)
 * GET /api/v1/reports/teacher/students?q=
 */
export async function teacherListStudents(req, res, next) {
  try {
    const q = String(req.query.q || "").trim();

    const filter = { role: "student" };
    if (q) {
      filter.$or = [
        { fullName: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { phone: { $regex: q, $options: "i" } },
      ];
    }

    const students = await User.find(filter)
      .sort({ createdAt: -1 })
      .select("_id fullName email phone isActive")
      .lean();

    return res.json({ success: true, students });
  } catch (e) {
    next(e);
  }
}

/**
 * TEACHER: get reports for student
 * GET /api/v1/reports/teacher/students/:studentId
 */
export async function teacherGetStudentReports(req, res, next) {
  try {
    const { studentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ success: false, message: "Invalid studentId" });
    }

    const student = await User.findOne({ _id: studentId, role: "student" })
      .select("_id fullName isActive")
      .lean();
    if (!student) return res.status(404).json({ success: false, message: "Student not found" });

    const doc = await getOrCreateStudentReport(studentId);

    return res.json({
      success: true,
      student,
      files: doc.files || [],
      maxFiles: MAX_FILES,
    });
  } catch (e) {
    next(e);
  }
}

/**
 * TEACHER: upload report files (multiple)
 * POST /api/v1/reports/teacher/students/:studentId/files
 * form-data: files[] (max 10)
 */
export async function teacherUploadStudentReports(req, res, next) {
  try {
    const { studentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ success: false, message: "Invalid studentId" });
    }

    const student = await User.findOne({ _id: studentId, role: "student" }).select("_id");
    if (!student) return res.status(404).json({ success: false, message: "Student not found" });

    const incoming = Array.isArray(req.files) ? req.files : [];
    if (incoming.length === 0) {
      return res.status(422).json({ success: false, message: "At least 1 file is required" });
    }

    const doc = await getOrCreateStudentReport(studentId);
    const remaining = Math.max(0, MAX_FILES - (doc.files?.length || 0));

    if (remaining <= 0) {
      return res.status(409).json({ success: false, message: `Max ${MAX_FILES} files already uploaded` });
    }

    const toUpload = incoming.slice(0, remaining);

    const uploaded = [];
    for (const f of toUpload) {
      if (!f?.buffer) continue;

      const isVideo = f.mimetype?.startsWith("video/");
      const resource_type = isVideo ? "video" : "raw";

      const result = await uploadBufferToCloudinaryAny({
        buffer: f.buffer,
        folder: "student-reports",
        resource_type,
      });

      uploaded.push({
        url: result.secure_url,
        publicId: result.public_id,
        originalName: f.originalname,
        mimeType: f.mimetype,
        bytes: result.bytes || 0,
        uploadedAt: new Date(),
        uploadedBy: req.user.id,
      });
    }

    doc.files = [...uploaded, ...(doc.files || [])].slice(0, MAX_FILES);
    doc.updatedAt = new Date();
    await doc.save();

    return res.json({
      success: true,
      message: "Reports uploaded",
      files: doc.files,
      maxFiles: MAX_FILES,
    });
  } catch (e) {
    next(e);
  }
}

/**
 * TEACHER: delete a report file (record delete)
 * DELETE /api/v1/reports/teacher/students/:studentId/files/:fileId
 * NOTE: This removes DB entry. (Optional: also delete from Cloudinary if you add a util)
 */
export async function teacherDeleteStudentReport(req, res, next) {
  try {
    const { studentId, fileId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(studentId) || !mongoose.Types.ObjectId.isValid(fileId)) {
      return res.status(400).json({ success: false, message: "Invalid id(s)" });
    }

    const doc = await getOrCreateStudentReport(studentId);
    const before = doc.files?.length || 0;

    doc.files = (doc.files || []).filter((x) => String(x._id) !== String(fileId));
    if ((doc.files?.length || 0) === before) {
      return res.status(404).json({ success: false, message: "File not found" });
    }

    doc.updatedAt = new Date();
    await doc.save();

    return res.json({ success: true, message: "File deleted", files: doc.files, maxFiles: MAX_FILES });
  } catch (e) {
    next(e);
  }
}

/**
 * PARENT: get reports for a linked child
 * GET /api/v1/reports/parent/students/:studentId
 */
export async function parentGetChildReports(req, res, next) {
  try {
    const parentId = req.user.id;
    const { studentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ success: false, message: "Invalid studentId" });
    }

    const prof = await ParentProfile.findOne({ user: parentId }).lean();
    const linked = (prof?.children || []).some((c) => String(c.studentUserId) === String(studentId));

    if (!linked) {
      return res.status(403).json({ success: false, message: "You are not linked to this student" });
    }

    const doc = await getOrCreateStudentReport(studentId);

    return res.json({ success: true, files: doc.files || [], maxFiles: MAX_FILES });
  } catch (e) {
    next(e);
  }
}
export const downloadFile = async (req, res) => {
  try {
    const { fileId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      return res.status(400).json({ message: "Invalid fileId" });
    }

    // ✅ find the student report doc that contains this file subdoc
    const doc = await StudentReport.findOne(
      { "files._id": fileId },
      { "files.$": 1, studentId: 1 }
    ).lean();

    if (!doc || !doc.files || !doc.files.length) {
      return res.status(404).json({ message: "File not found" });
    }

    const file = doc.files[0];

    // ✅ AUTH (basic example)
    // Teacher: allowed (you can add stronger logic if you want)
    // Parent: must be linked to this studentId
    if (req.user.role === "parent") {
      const prof = await ParentProfile.findOne({ user: req.user.id }).lean();
      const linked = (prof?.children || []).some(
        (c) => String(c.studentUserId) === String(doc.studentId)
      );
      if (!linked) {
        return res.status(403).json({ message: "You are not linked to this student" });
      }
    }

    // ✅ fetch file bytes from cloudinary url
    const response = await fetch(file.url);
    if (!response.ok) {
      return res.status(400).json({ message: "Unable to fetch file" });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // ✅ headers
    res.setHeader("Content-Type", file.mimeType || "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${file.originalName || "file"}"`
    );
    res.setHeader("Content-Length", buffer.length);

    return res.status(200).send(buffer);
  } catch (e) {
    return res.status(500).json({ message: "Download failed" });
  }
};
