import ScholarshipRegistration from "./scholarshipRegistration.model.js";
import ScholarshipConfig from "./scholarshipConfig.model.js";
import { uploadBufferToCloudinary } from "../../utils/cloudinaryUpload.js"; 

const toSafeReg = (doc) => ({
  _id: doc._id,
  name: doc.name,
  parent: doc.parent,
  email: doc.email,
  phone: doc.phone,
  course: doc.course,
  status: doc.status,
  notes: doc.notes,
  createdAt: doc.createdAt,
});

async function getOrCreateConfig() {
  let cfg = await ScholarshipConfig.findOne();
  if (!cfg) cfg = await ScholarshipConfig.create({});
  return cfg;
}

/** PUBLIC: POST /api/v1/scholarship/register */
export async function registerScholarship(req, res, next) {
  try {
    const { name, parent, email, phone, course } = req.body;

    if (!name || !parent || !email || !phone || !course) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }
    if (!/^\d{10}$/.test(String(phone))) {
      return res.status(400).json({ success: false, message: "Phone must be 10 digits" });
    }

    const created = await ScholarshipRegistration.create({
      name,
      parent,
      email,
      phone,
      course,
    });

    return res.status(201).json({
      success: true,
      message: "Registration submitted",
      data: toSafeReg(created),
    });
  } catch (err) {
    next(err);
  }
}

/** PUBLIC: GET /api/v1/scholarship/result */
export async function getScholarshipResultStatus(req, res, next) {
  try {
    const cfg = await getOrCreateConfig();
    return res.json({
  success: true,
  data: {
    resultsLive: cfg.resultsLive,
    resultPdfUrl: cfg.resultsLive ? cfg.resultPdfUrl : "",
    resultPdfOriginalName: cfg.resultsLive ? cfg.resultPdfOriginalName : "",
    updatedAt: cfg.updatedAt,
  },
});

  } catch (err) {
    next(err);
  }
}

/** ADMIN: GET /api/v1/scholarship/admin/registrations */
export async function adminListRegistrations(req, res, next) {
  try {
    const { q = "", status = "" } = req.query;

    const filter = {};
    if (status) filter.status = status;

    if (q) {
      const rx = new RegExp(String(q).trim(), "i");
      filter.$or = [{ name: rx }, { email: rx }, { phone: rx }, { course: rx }, { parent: rx }];
    }

    const list = await ScholarshipRegistration.find(filter).sort({ createdAt: -1 }).lean();

    return res.json({
      success: true,
      count: list.length,
      data: list.map((d) => ({
        ...d,
        _id: String(d._id),
      })),
    });
  } catch (err) {
    next(err);
  }
}

/** ADMIN: PATCH /api/v1/scholarship/admin/config */
export async function adminUpdateConfig(req, res, next) {
  try {
    const cfg = await getOrCreateConfig();
    const { resultsLive } = req.body;

    if (typeof resultsLive !== "boolean") {
      return res.status(400).json({ success: false, message: "resultsLive must be boolean" });
    }

    cfg.resultsLive = resultsLive;
    // If turning OFF, keep pdf stored in DB but public endpoint hides it.
    await cfg.save();

    return res.json({
      success: true,
      message: "Config updated",
      data: {
        resultsLive: cfg.resultsLive,
        resultPdfUrl: cfg.resultPdfUrl,
        updatedAt: cfg.updatedAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

/** ADMIN: POST /api/v1/scholarship/admin/upload-result (multipart/form-data, field: file) */
export async function adminUploadResultPdf(req, res, next) {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ success: false, message: "PDF file required" });
    }

    // ✅ upload pdf to cloudinary as RAW
    const uploaded = await uploadBufferToCloudinary(req.file.buffer, {
      folder: "scholarship_results",
      resourceType: "raw",
    });

    const cfg = await getOrCreateConfig();
    cfg.resultPdfUrl = uploaded.secure_url;
    cfg.resultPdfPublicId = uploaded.public_id;
    cfg.resultPdfOriginalName = req.file.originalname;
    await cfg.save();

    return res.json({
      success: true,
      message: "Result PDF uploaded to Cloudinary",
      data: {
        resultPdfUrl: cfg.resultPdfUrl,
        resultPdfPublicId: cfg.resultPdfPublicId,
        resultPdfOriginalName: cfg.resultPdfOriginalName,
        updatedAt: cfg.updatedAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

/** ADMIN: GET /api/v1/scholarship/admin/config */
export async function adminGetConfig(req, res, next) {
  try {
    const cfg = await getOrCreateConfig();
    return res.json({
      success: true,
      data: {
        resultsLive: cfg.resultsLive,
        resultPdfUrl: cfg.resultPdfUrl,
        resultPdfOriginalName: cfg.resultPdfOriginalName,
        updatedAt: cfg.updatedAt,
      },
    });
  } catch (err) {
    next(err);
  }
}
// ADMIN: PATCH /api/v1/scholarship/admin/registrations/:id
export async function adminUpdateRegistration(req, res, next) {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const allowed = new Set(["NEW", "CONTACTED", "APPROVED", "REJECTED"]);
    if (status && !allowed.has(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const updated = await ScholarshipRegistration.findByIdAndUpdate(
      id,
      {
        ...(status ? { status } : {}),
        ...(typeof notes === "string" ? { notes } : {}),
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    return res.json({
      success: true,
      message: "Application updated",
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

