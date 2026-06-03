import Doubt from "./doubt.model.js";
import cloudinary from "../../config/cloudinary.js";
import { uploadBufferToCloudinary } from "../../utils/cloudinaryUpload.js";
import { sendDoubtAnswerEmail } from "../../utils/mailer.js";

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
const isPhone10 = (v) => /^[0-9]{10}$/.test(String(v || "").trim());

// PUBLIC: create doubt (no login required)
export async function createDoubt(req, res, next) {
  try {
    const { name, email, phone, doubtType, doubt } = req.body;

    if (!name?.trim()) return res.status(400).json({ success: false, message: "Name required" });
    if (!isEmail(email)) return res.status(400).json({ success: false, message: "Valid email required" });
    if (!isPhone10(phone)) return res.status(400).json({ success: false, message: "Valid 10 digit phone required" });
    if (!doubtType?.trim()) return res.status(400).json({ success: false, message: "Doubt type required" });
    if (!doubt?.trim()) return res.status(400).json({ success: false, message: "Doubt required" });

    // optional image upload
    let imageUrl = "";
    let imagePublicId = "";
    const img = req.file; // upload.single("image")
    if (img?.buffer) {
      const up = await uploadBufferToCloudinary(img.buffer, {
        folder: "doubts/images",
        resourceType: "image",
      });
      imageUrl = up.secure_url;
      imagePublicId = up.public_id;
    }

    const created = await Doubt.create({
      name,
      email,
      phone,
      doubtType,
      doubt,
      imageUrl,
      imagePublicId,
    });

    return res.status(201).json({ success: true, message: "Doubt submitted", data: created });
  } catch (e) {
    next(e);
  }
}

// ADMIN: list doubts
export async function adminListDoubts(req, res, next) {
  try {
    const { status = "ALL", q = "" } = req.query;

    const filter = {};
    if (status !== "ALL") filter.status = status;

    if (q) {
      const rx = new RegExp(String(q).trim(), "i");
      filter.$or = [{ name: rx }, { email: rx }, { phone: rx }, { doubtType: rx }, { doubt: rx }];
    }

    const list = await Doubt.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ success: true, count: list.length, data: list });
  } catch (e) {
    next(e);
  }
}

// ADMIN: update status
export async function adminUpdateDoubtStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = new Set(["PENDING", "IN_PROGRESS", "RESOLVED", "CLOSED"]);
    if (!allowed.has(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }
    const update = {
  status,
  closedAt: status === "CLOSED" ? new Date() : null, // ✅ key line
};

const updated = await Doubt.findByIdAndUpdate(id, update, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: "Doubt not found" });

    res.json({ success: true, message: "Status updated", data: updated });
  } catch (e) {
    next(e);
  }
}

// ADMIN: answer + send email
export async function adminAnswerAndEmail(req, res, next) {
  try {
    const { id } = req.params;
    const { answer } = req.body;

    if (!answer?.trim()) {
      return res.status(400).json({ success: false, message: "Answer required" });
    }

    const doubt = await Doubt.findById(id);
    if (!doubt) return res.status(404).json({ success: false, message: "Doubt not found" });

    // Save answer first
    doubt.adminAnswer = answer;
    doubt.answeredAt = new Date();
    doubt.answeredBy = req.user?.email || req.user?.id || "admin";

    // Send email
    await sendDoubtAnswerEmail({
      to: doubt.email,
      name: doubt.name,
      doubtType: doubt.doubtType,
      doubt: doubt.doubt,
      answer,
    });

    doubt.mailSent = true;
    doubt.mailSentAt = new Date();
    doubt.status = "RESOLVED";

    await doubt.save();

    res.json({ success: true, message: "Answer sent to email", data: doubt });
  } catch (e) {
    next(e);
  }
}

// ADMIN: delete doubt (optional)
export async function adminDeleteDoubt(req, res, next) {
  try {
    const { id } = req.params;

    const d = await Doubt.findById(id);
    if (!d) return res.status(404).json({ success: false, message: "Doubt not found" });

    if (d.imagePublicId) {
      await cloudinary.uploader.destroy(d.imagePublicId).catch(() => {});
    }

    await Doubt.findByIdAndDelete(id);
    res.json({ success: true, message: "Doubt deleted" });
  } catch (e) {
    next(e);
  }
}
