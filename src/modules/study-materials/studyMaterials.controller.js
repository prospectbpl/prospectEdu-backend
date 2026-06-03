import mongoose from "mongoose";
import cloudinary from "../../config/cloudinary.js";
import { StudyMaterial, STUDY_MATERIAL_TYPES } from "./studyMaterials.model.js";
import { Enrollment } from "../courses/enrollment.model.js"; // :contentReference[oaicite:1]{index=1}
import { Course } from "../courses/course.model.js"; // :contentReference[oaicite:2]{index=2}
import https from "https";

function extFromName(name = "") {
  const n = String(name).toLowerCase();
  if (n.endsWith(".pdf")) return "pdf";
  if (n.endsWith(".doc")) return "doc";
  if (n.endsWith(".docx")) return "docx";
  return "";
}

function ensureTeacherOrAdmin(req) {
  return req.user?.role === "teacher" || req.user?.role === "admin";
}

/**
 * TEACHER/ADMIN: create study material
 * POST /api/v1/study-materials
 */
export async function createStudyMaterial(req, res, next) {
  try {
    if (!ensureTeacherOrAdmin(req)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const {
      title,
      category,
      materialType, // "pdf" | "handwritten"
      fileUrl,
      filePublicId = "",
      fileName = "",
      mimeType = "",
    } = req.body || {};

    if (!title?.trim()) return res.status(422).json({ success: false, message: "Title is required" });
    if (!category?.trim()) return res.status(422).json({ success: false, message: "Category is required" });
    if (!materialType || !STUDY_MATERIAL_TYPES.includes(materialType)) {
      return res.status(422).json({ success: false, message: "Invalid material type" });
    }
    if (!fileUrl?.trim()) return res.status(422).json({ success: false, message: "File upload is required" });

    const fileType = extFromName(fileName) || (mimeType === "application/pdf" ? "pdf" : "");
    if (!["pdf", "doc", "docx"].includes(fileType)) {
      return res.status(422).json({ success: false, message: "Only PDF/DOC/DOCX allowed" });
    }

    const doc = await StudyMaterial.create({
      title: String(title).trim(),
      category: String(category).trim().toLowerCase(),
      materialType,
      fileType,
      fileUrl: String(fileUrl).trim(),
      filePublicId: String(filePublicId || "").trim(),
      fileName: String(fileName || "").trim(),
      mimeType: String(mimeType || "").trim(),
      uploadedBy: req.user.id,
      isPublished: true,
    });

    return res.json({ success: true, material: doc });
  } catch (e) {
    next(e);
  }
}

/**
 * TEACHER: list my uploads
 * GET /api/v1/study-materials/teacher/mine
 */
export async function teacherListMyStudyMaterials(req, res, next) {
  try {
    if (!ensureTeacherOrAdmin(req)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const filter = req.user.role === "admin" ? {} : { uploadedBy: req.user.id };

    const items = await StudyMaterial.find(filter)
      .sort({ createdAt: -1 })
      .select("-__v");

    return res.json({ success: true, items });
  } catch (e) {
    next(e);
  }
}

/**
 * TEACHER: delete my upload (admin can delete any)
 * DELETE /api/v1/study-materials/:id
 */
export async function deleteStudyMaterial(req, res, next) {
  try {
    if (!ensureTeacherOrAdmin(req)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid id" });
    }

    const doc = await StudyMaterial.findById(id);
    if (!doc) return res.status(404).json({ success: false, message: "Not found" });

    if (req.user.role !== "admin" && String(doc.uploadedBy) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    if (doc.filePublicId) {
      try {
        await cloudinary.uploader.destroy(doc.filePublicId, { resource_type: "raw" });
      } catch (err) {
        console.log("Cloudinary delete failed:", err?.message || err);
      }
    }

    await StudyMaterial.deleteOne({ _id: doc._id });

    return res.json({ success: true, deleted: true });
  } catch (e) {
    next(e);
  }
}

/**
 * STUDENT: list materials based on enrolled course categories
 * GET /api/v1/study-materials/student
 *
 * Rule:
 * - If student has NO enrollments (active/completed): show ALL published materials
 * - Else: show ONLY materials whose category is in student's enrolled course categories
 */
export async function studentListStudyMaterials(req, res, next) {
  try {
    const { type = "all", q = "" } = req.query;

    // get enrolled courseIds (active/completed) :contentReference[oaicite:3]{index=3}
    const enrollments = await Enrollment.find({
      studentUserId: req.user.id,
      status: { $in: ["active", "completed"] },
    })
      .select("courseId")
      .lean();

    const baseFilter = { isPublished: true };

    // optional type filter
    if (type && type !== "all") baseFilter.materialType = String(type);

    // optional search
    if (q) baseFilter.title = { $regex: String(q), $options: "i" };

    // if not subscribed to any course => all
    if (!enrollments.length) {
      const items = await StudyMaterial.find(baseFilter).sort({ createdAt: -1 }).select("-__v");
      return res.json({ success: true, items, scope: "all" });
    }

    const courseIds = enrollments.map((e) => e.courseId);

    const courses = await Course.find({ _id: { $in: courseIds } })
      .select("category")
      .lean();

    const categories = Array.from(
      new Set(
        (courses || [])
          .map((c) => String(c.category || "").trim().toLowerCase())
          .filter(Boolean)
      )
    );

    // if enrolled but course categories empty => safest: show none (or all). We'll show none.
    if (!categories.length) {
      return res.json({ success: true, items: [], scope: "subscribed-empty" });
    }

    const items = await StudyMaterial.find({ ...baseFilter, category: { $in: categories } })
      .sort({ createdAt: -1 })
      .select("-__v");

    return res.json({ success: true, items, scope: "subscribed", categories });
  } catch (e) {
    next(e);
  }
}
export async function getStudyMaterialFile(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid id" });
    }

    const doc = await StudyMaterial.findById(id).select("fileUrl fileName mimeType fileType");
    if (!doc?.fileUrl) return res.status(404).json({ success: false, message: "No file" });

    const mime =
      doc.mimeType ||
      (doc.fileType === "pdf" ? "application/pdf" : "application/octet-stream");

    res.setHeader("Content-Type", mime);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(doc.fileName || "file")}"`
    );

    https
      .get(doc.fileUrl, (fileRes) => {
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
