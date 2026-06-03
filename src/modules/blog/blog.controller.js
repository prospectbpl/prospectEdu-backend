import Blog from "./blog.model.js";
import cloudinary from "../../config/cloudinary.js";
import { uploadBufferToCloudinary } from "../../utils/cloudinaryUpload.js";

const toSlug = (s = "") =>
  String(s).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const getUserId = (req) => req.user?._id || req.user?.id;

// ---------- PUBLIC ----------
export async function publicListBlogs(req, res, next) {
  try {
    const blogs = await Blog.find({ isPublished: true })
      .sort({ createdAt: -1 })
      .select("slug title subtitle coverUrl createdAt")
      .lean();
    res.json({ success: true, count: blogs.length, data: blogs });
  } catch (e) {
    next(e);
  }
}

export async function publicGetBlogBySlug(req, res, next) {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug, isPublished: true }).lean();
    if (!blog) return res.status(404).json({ success: false, message: "Blog not found" });
    res.json({ success: true, data: blog });
  } catch (e) {
    next(e);
  }
}

// ---------- TEACHER ----------
export async function teacherListBlogs(req, res, next) {
  try {
    const userId = getUserId(req);
    const blogs = await Blog.find({ createdBy: userId }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, count: blogs.length, data: blogs });
  } catch (e) {
    next(e);
  }
}

export async function teacherCreateBlog(req, res, next) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const { title, subtitle = "", content = "", slug: slugInput, isPublished } = req.body;
    if (!title?.trim() || !content?.trim()) {
      return res.status(400).json({ success: false, message: "title and content are required" });
    }

    const slug = slugInput?.trim() ? toSlug(slugInput) : toSlug(title);
    const exists = await Blog.findOne({ slug });
    if (exists) return res.status(400).json({ success: false, message: "Slug already exists" });

    let coverUrl = "";
    let coverPublicId = "";

    if (req.file?.buffer) {
      const up = await uploadBufferToCloudinary(req.file.buffer, {
        folder: "blogs/covers",
        resourceType: "image",
      });
      coverUrl = up.secure_url;
      coverPublicId = up.public_id;
    }

    const created = await Blog.create({
      slug,
      title: title.trim(),
      subtitle: subtitle.trim(),
      content,
      coverUrl,
      coverPublicId,
      isPublished: isPublished === "false" ? false : true,
      createdBy: userId,
    });

    res.status(201).json({ success: true, message: "Blog created", data: created });
  } catch (e) {
    next(e);
  }
}

export async function teacherUpdateBlog(req, res, next) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ success: false, message: "Blog not found" });

    if (String(blog.createdBy) !== String(userId)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const { title, subtitle, content, slug: slugInput, isPublished } = req.body;

    if (slugInput?.trim()) {
      const newSlug = toSlug(slugInput);
      const exists = await Blog.findOne({ slug: newSlug, _id: { $ne: blog._id } });
      if (exists) return res.status(400).json({ success: false, message: "Slug already exists" });
      blog.slug = newSlug;
    }

    if (title !== undefined) blog.title = title;
    if (subtitle !== undefined) blog.subtitle = subtitle;
    if (content !== undefined) blog.content = content;
    if (isPublished !== undefined) blog.isPublished = isPublished !== "false";

    if (req.file?.buffer) {
      if (blog.coverPublicId) await cloudinary.uploader.destroy(blog.coverPublicId).catch(() => {});
      const up = await uploadBufferToCloudinary(req.file.buffer, {
        folder: "blogs/covers",
        resourceType: "image",
      });
      blog.coverUrl = up.secure_url;
      blog.coverPublicId = up.public_id;
    }

    await blog.save();
    res.json({ success: true, message: "Blog updated", data: blog });
  } catch (e) {
    next(e);
  }
}

export async function teacherDeleteBlog(req, res, next) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ success: false, message: "Blog not found" });

    if (String(blog.createdBy) !== String(userId)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    if (blog.coverPublicId) await cloudinary.uploader.destroy(blog.coverPublicId).catch(() => {});
    await blog.deleteOne();

    res.json({ success: true, message: "Blog deleted" });
  } catch (e) {
    next(e);
  }
}
