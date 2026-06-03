import Achiever from "./achiever.model.js";
import { uploadBufferToCloudinary } from "../../utils/cloudinaryUpload.js"; // adjust if needed

// PUBLIC: GET /api/v1/achievers
export async function listAchievers(req, res, next) {
  try {
    const { q = "", course = "", year = "" } = req.query;

    const filter = {};
    if (course && course !== "All") filter.course = course;
    if (year && year !== "All") filter.year = year;

    if (q) {
      const rx = new RegExp(String(q).trim(), "i");
      filter.$or = [{ name: rx }, { achievement: rx }, { extra: rx }];
    }

    const data = await Achiever.find(filter).sort({ createdAt: -1 }).lean();

    res.json({ success: true, count: data.length, data });
  } catch (err) {
    next(err);
  }
}

// ADMIN: POST /api/v1/achievers/admin (multipart: img)
export async function createAchiever(req, res, next) {
  try {
    const { name, course, year, achievement, extra = "", quote = "" } = req.body;

    if (!name || !course || !year || !achievement) {
      return res.status(400).json({ success: false, message: "name, course, year, achievement are required" });
    }
    if (!req.file?.buffer) {
      return res.status(400).json({ success: false, message: "Image is required" });
    }

    // ✅ upload image to cloudinary
    const uploaded = await uploadBufferToCloudinary(req.file.buffer, {
      folder: "achievers",
      resourceType: "image",
    });

    const doc = await Achiever.create({
      name,
      course,
      year,
      achievement,
      extra,
      quote,
      imgUrl: uploaded.secure_url,
      imgPublicId: uploaded.public_id,
    });

    res.status(201).json({ success: true, message: "Achiever added", data: doc });
  } catch (err) {
    next(err);
  }
}

// ADMIN: DELETE /api/v1/achievers/admin/:id
export async function deleteAchiever(req, res, next) {
  try {
    const { id } = req.params;
    const deleted = await Achiever.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, message: "Not found" });

    // Optional: delete from cloudinary later if you want.
    res.json({ success: true, message: "Achiever deleted" });
  } catch (err) {
    next(err);
  }
}
