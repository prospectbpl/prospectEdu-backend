import News from "./news.model.js";
import NewsCategory from "./newsCategory.model.js";
import cloudinary from "../../config/cloudinary.js";
import { uploadBufferToCloudinary } from "../../utils/cloudinaryUpload.js";

const makeSlug = (title) => {
  const base = String(title || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  // add small random to avoid duplicate slug
  const rand = Math.random().toString(36).slice(2, 7);
  return `${base}-${rand}`;
};

// ======================
// PUBLIC
// ======================
export async function publicGetCategories(req, res, next) {
  try {
    const list = await NewsCategory.find({}).sort({ name: 1 }).lean();
    res.json({ success: true, data: list });
  } catch (e) {
    next(e);
  }
}

export async function publicGetNews(req, res, next) {
  try {
    const { category = "All", date = "" } = req.query;

    const filter = {};
    if (category !== "All") filter.category = category;
    if (date) filter.date = date;

    const list = await News.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: list });
  } catch (e) {
    next(e);
  }
}

export async function publicGetNewsBySlug(req, res, next) {
  try {
    const { slug } = req.params;
    const item = await News.findOne({ slug }).lean();
    if (!item) return res.status(404).json({ success: false, message: "News not found" });
    res.json({ success: true, data: item });
  } catch (e) {
    next(e);
  }
}

// ======================
// TEACHER
// ======================
export async function teacherCreateCategory(req, res, next) {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: "Category name required" });

    const exists = await NewsCategory.findOne({ name: name.trim() });
    if (exists) return res.status(400).json({ success: false, message: "Category already exists" });

    const created = await NewsCategory.create({ name: name.trim(), createdBy: "teacher" });
    res.status(201).json({ success: true, message: "Category created", data: created });
  } catch (e) {
    next(e);
  }
}

export async function teacherDeleteCategory(req, res, next) {
  try {
    const { id } = req.params;
    const cat = await NewsCategory.findById(id);
    if (!cat) return res.status(404).json({ success: false, message: "Category not found" });

    // prevent deleting if news exists in this category (safer)
    const used = await News.countDocuments({ category: cat.name });
    if (used > 0) {
      return res.status(400).json({
        success: false,
        message: `Category is used by ${used} news. Delete news first.`,
      });
    }

    await NewsCategory.findByIdAndDelete(id);
    res.json({ success: true, message: "Category deleted" });
  } catch (e) {
    next(e);
  }
}

export async function teacherCreateNews(req, res, next) {
  try {
    const { title, description, category, date, english, hindi } = req.body;

    if (!title?.trim()) return res.status(400).json({ success: false, message: "Title required" });
    if (!description?.trim()) return res.status(400).json({ success: false, message: "Description required" });
    if (!category?.trim()) return res.status(400).json({ success: false, message: "Category required" });
    if (!date?.trim()) return res.status(400).json({ success: false, message: "Date required" });

    const slug = makeSlug(title);

    let imgUrl = "";
    let imgPublicId = "";

    const img = req.file; // upload.single("img")
    if (img?.buffer) {
      const up = await uploadBufferToCloudinary(img.buffer, {
        folder: "news/images",
        resourceType: "image",
      });
      imgUrl = up.secure_url;
      imgPublicId = up.public_id;
    }

    const created = await News.create({
      title,
      description,
      category,
      date,
      slug,
      english: english || "",
      hindi: hindi || "",
      imgUrl,
      imgPublicId,
      createdBy: "teacher",
    });

    res.status(201).json({ success: true, message: "News created", data: created });
  } catch (e) {
    next(e);
  }
}

export async function teacherUpdateNews(req, res, next) {
  try {
    const { id } = req.params;
    const { title, description, category, date, english, hindi } = req.body;

    const item = await News.findById(id);
    if (!item) return res.status(404).json({ success: false, message: "News not found" });

    if (title?.trim()) item.title = title;
    if (description?.trim()) item.description = description;
    if (category?.trim()) item.category = category;
    if (date?.trim()) item.date = date;
    if (typeof english === "string") item.english = english;
    if (typeof hindi === "string") item.hindi = hindi;

    // replace image if uploaded
    const img = req.file;
    if (img?.buffer) {
      if (item.imgPublicId) {
        await cloudinary.uploader.destroy(item.imgPublicId).catch(() => {});
      }
      const up = await uploadBufferToCloudinary(img.buffer, {
        folder: "news/images",
        resourceType: "image",
      });
      item.imgUrl = up.secure_url;
      item.imgPublicId = up.public_id;
    }

    await item.save();
    res.json({ success: true, message: "News updated", data: item });
  } catch (e) {
    next(e);
  }
}

export async function teacherDeleteNews(req, res, next) {
  try {
    const { id } = req.params;

    const item = await News.findById(id);
    if (!item) return res.status(404).json({ success: false, message: "News not found" });

    if (item.imgPublicId) {
      await cloudinary.uploader.destroy(item.imgPublicId).catch(() => {});
    }

    await News.findByIdAndDelete(id);
    res.json({ success: true, message: "News deleted" });
  } catch (e) {
    next(e);
  }
}

export async function teacherListNews(req, res, next) {
  try {
    const { category = "All", q = "" } = req.query;

    const filter = {};
    if (category !== "All") filter.category = category;

    if (q) {
      const rx = new RegExp(String(q).trim(), "i");
      filter.$or = [{ title: rx }, { description: rx }, { category: rx }];
    }

    const list = await News.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: list });
  } catch (e) {
    next(e);
  }
}
