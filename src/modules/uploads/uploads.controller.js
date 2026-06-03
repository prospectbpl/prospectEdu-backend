// server/src/modules/uploads/uploads.controller.js
import { uploadBufferToCloudinary } from "../../utils/cloudinaryUpload.js"; // adjust path
// or wherever your cloudinaryUpload.js lives
import { uploadBufferToCloudinaryAny } from "../../utils/cloudinaryUploadAny.js";

export async function uploadCourseImage(req, res, next) {
  try {
    if (!req.file?.buffer) {
      return res.status(422).json({ success: false, message: "Image file is required" });
    }

    const result = await uploadBufferToCloudinary(req.file.buffer, "courses"); // folder = courses

    return res.json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id, // optional, but useful later if you want delete/replace
    });
  } catch (e) {
    next(e);
  }
}
export async function uploadLessonFile(req, res, next) {
  try {
    if (!req.file?.buffer) {
      return res.status(422).json({ success: false, message: "File is required" });
    }

    const file = req.file;

    // video => resource_type: "video"
    // pdf/doc => resource_type: "raw"
    const isVideo = file.mimetype.startsWith("video/");
    const resource_type = isVideo ? "video" : "raw";

    const result = await uploadBufferToCloudinaryAny({
      buffer: file.buffer,
      folder: "lessons", // you can change to "courses/lessons" if you want
      resource_type,
    });

    return res.json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      resourceType: result.resource_type,
      originalName: file.originalname,
      mimeType: file.mimetype,
      bytes: result.bytes,
      format: result.format,
    });
  } catch (e) {
    next(e);
  }
}

export async function uploadAssignmentFile(req, res, next) {
  try {
    if (!req.file?.buffer) {
      return res.status(422).json({ success: false, message: "File is required" });
    }

    const isVideo = req.file.mimetype?.startsWith("video/");
    const resource_type = isVideo ? "video" : "raw";

    const result = await uploadBufferToCloudinaryAny({
      buffer: req.file.buffer,
      folder: "assignments",
      resource_type,
    });

    return res.json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
    });
  } catch (e) {
    next(e);
  }
}
export async function uploadStudyMaterialFile(req, res, next) {
  try {
    if (!req.file?.buffer) {
      return res.status(422).json({ success: false, message: "File is required" });
    }

    const file = req.file;

    // only pdf/doc/docx
    const ok =
      file.mimetype === "application/pdf" ||
      file.mimetype === "application/msword" ||
      file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    if (!ok) {
      return res.status(422).json({ success: false, message: "Only PDF/DOC/DOCX allowed" });
    }

    const result = await uploadBufferToCloudinaryAny({
      buffer: file.buffer,
      folder: "study-materials",
      resource_type: "raw",
    });

    return res.json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      originalName: file.originalname,
      mimeType: file.mimetype,
      bytes: result.bytes,
      format: result.format,
    });
  } catch (e) {
    next(e);
  }
}


