import ResearchCategory from "./researchCategory.model.js";
import ResearchReport from "./researchReport.model.js";
import cloudinary from "../../config/cloudinary.js";
import { uploadBufferToCloudinary } from "../../utils/cloudinaryUpload.js";

const toSlug = (s = "") =>
  String(s)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

// ---------- PUBLIC ----------
export async function publicListCategories(req, res, next) {
  try {
    const cats = await ResearchCategory.find().sort({ name: 1 }).lean();
    res.json({ success: true, data: cats });
  } catch (e) {
    next(e);
  }
}

export async function publicListReports(req, res, next) {
  try {
    const { category = "All", q = "" } = req.query;

    const filter = {};
    if (category && category !== "All") filter.category = category;

    if (q) {
      const rx = new RegExp(String(q).trim(), "i");
      filter.$or = [{ title: rx }, { description: rx }, { category: rx }];
    }

    const reports = await ResearchReport.find(filter)
      .sort({ createdAt: -1 })
      .select("slug title description category date coverUrl")
      .lean();

    res.json({ success: true, count: reports.length, data: reports });
  } catch (e) {
    next(e);
  }
}

export async function publicGetReportBySlug(req, res, next) {
  try {
    const { slug } = req.params;
    const report = await ResearchReport.findOne({ slug }).lean();
    if (!report) return res.status(404).json({ success: false, message: "Report not found" });
    res.json({ success: true, data: report });
  } catch (e) {
    next(e);
  }
}

// ---------- ADMIN: CATEGORY ----------
export async function adminCreateCategory(req, res, next) {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: "Category name required" });

    const slug = toSlug(name);
    const created = await ResearchCategory.create({ name: name.trim(), slug });
    res.status(201).json({ success: true, message: "Category created", data: created });
  } catch (e) {
    next(e);
  }
}

export async function adminDeleteCategory(req, res, next) {
  try {
    const { id } = req.params;
    const deleted = await ResearchCategory.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, message: "Category not found" });
    res.json({ success: true, message: "Category deleted" });
  } catch (e) {
    next(e);
  }
}

// ---------- ADMIN: REPORT CRUD ----------
export async function adminCreateReport(req, res, next) {
  try {
    const {
      title,
      slug: slugInput,
      description,
      category,
      date,
      englishContent = "",
      hindiContent = "",
    } = req.body;

    if (!title || !description || !category || !date) {
      return res.status(400).json({ success: false, message: "title, description, category, date are required" });
    }

    const slug = slugInput?.trim() ? toSlug(slugInput) : toSlug(title);

    const exists = await ResearchReport.findOne({ slug });
    if (exists) return res.status(400).json({ success: false, message: "Slug already exists" });

    // files
    const cover = req.files?.cover?.[0];
    const pdfEn = req.files?.pdfEnglish?.[0];
    const pdfHi = req.files?.pdfHindi?.[0];

    let coverUpload = null;
    let pdfEnUpload = null;
    let pdfHiUpload = null;

    if (cover?.buffer) {
      coverUpload = await uploadBufferToCloudinary(cover.buffer, { folder: "research/covers", resourceType: "image" });
    }
    if (pdfEn?.buffer) {
      pdfEnUpload = await uploadBufferToCloudinary(pdfEn.buffer, { folder: "research/pdfs", resourceType: "raw" });
    }
    if (pdfHi?.buffer) {
      pdfHiUpload = await uploadBufferToCloudinary(pdfHi.buffer, { folder: "research/pdfs", resourceType: "raw" });
    }

    const created = await ResearchReport.create({
      slug,
      title,
      description,
      category,
      date,
      coverUrl: coverUpload?.secure_url || "",
      coverPublicId: coverUpload?.public_id || "",
      content: { english: englishContent, hindi: hindiContent },
      pdf: {
        englishUrl: pdfEnUpload?.secure_url || "",
        englishPublicId: pdfEnUpload?.public_id || "",
        hindiUrl: pdfHiUpload?.secure_url || "",
        hindiPublicId: pdfHiUpload?.public_id || "",
      },
    });

    res.status(201).json({ success: true, message: "Research report created", data: created });
  } catch (e) {
    next(e);
  }
}

export async function adminUpdateReport(req, res, next) {
  try {
    const { id } = req.params;

    const report = await ResearchReport.findById(id);
    if (!report) return res.status(404).json({ success: false, message: "Report not found" });

    const {
      title,
      slug: slugInput,
      description,
      category,
      date,
      englishContent,
      hindiContent,
    } = req.body;

    if (title !== undefined) report.title = title;
    if (description !== undefined) report.description = description;
    if (category !== undefined) report.category = category;
    if (date !== undefined) report.date = date;

    if (englishContent !== undefined) report.content.english = englishContent;
    if (hindiContent !== undefined) report.content.hindi = hindiContent;

    if (slugInput !== undefined && slugInput?.trim()) {
      const newSlug = toSlug(slugInput);
      const exists = await ResearchReport.findOne({ slug: newSlug, _id: { $ne: id } });
      if (exists) return res.status(400).json({ success: false, message: "Slug already exists" });
      report.slug = newSlug;
    }

    const cover = req.files?.cover?.[0];
    const pdfEn = req.files?.pdfEnglish?.[0];
    const pdfHi = req.files?.pdfHindi?.[0];

    // Replace uploads: delete old from cloudinary if exists
    if (cover?.buffer) {
      if (report.coverPublicId) await cloudinary.uploader.destroy(report.coverPublicId).catch(() => {});
      const up = await uploadBufferToCloudinary(cover.buffer, { folder: "research/covers", resourceType: "image" });
      report.coverUrl = up.secure_url;
      report.coverPublicId = up.public_id;
    }

    if (pdfEn?.buffer) {
      if (report.pdf.englishPublicId) await cloudinary.uploader.destroy(report.pdf.englishPublicId).catch(() => {});
      const up = await uploadBufferToCloudinary(pdfEn.buffer, { folder: "research/pdfs", resourceType: "raw" });
      report.pdf.englishUrl = up.secure_url;
      report.pdf.englishPublicId = up.public_id;
    }

    if (pdfHi?.buffer) {
      if (report.pdf.hindiPublicId) await cloudinary.uploader.destroy(report.pdf.hindiPublicId).catch(() => {});
      const up = await uploadBufferToCloudinary(pdfHi.buffer, { folder: "research/pdfs", resourceType: "raw" });
      report.pdf.hindiUrl = up.secure_url;
      report.pdf.hindiPublicId = up.public_id;
    }

    await report.save();
    res.json({ success: true, message: "Research report updated", data: report });
  } catch (e) {
    next(e);
  }
}

export async function adminDeleteReport(req, res, next) {
  try {
    const { id } = req.params;

    const report = await ResearchReport.findById(id);
    if (!report) return res.status(404).json({ success: false, message: "Report not found" });

    // delete assets
    if (report.coverPublicId) await cloudinary.uploader.destroy(report.coverPublicId).catch(() => {});
    if (report.pdf.englishPublicId) await cloudinary.uploader.destroy(report.pdf.englishPublicId).catch(() => {});
    if (report.pdf.hindiPublicId) await cloudinary.uploader.destroy(report.pdf.hindiPublicId).catch(() => {});

    await ResearchReport.findByIdAndDelete(id);
    res.json({ success: true, message: "Research report deleted" });
  } catch (e) {
    next(e);
  }
}

export async function adminListReports(req, res, next) {
  try {
    const reports = await ResearchReport.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, count: reports.length, data: reports });
  } catch (e) {
    next(e);
  }
}

export async function adminListCategories(req, res, next) {
  try {
    const cats = await ResearchCategory.find().sort({ name: 1 }).lean();
    res.json({ success: true, data: cats });
  } catch (e) {
    next(e);
  }
}
