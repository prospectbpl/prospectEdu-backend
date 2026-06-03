import { CourseCategory } from "./category.model.js";
import { createCategorySchema, updateCategorySchema } from "./category.validators.js";

export async function listCategories(req, res, next) {
  try {
    const categories = await CourseCategory.find({ isActive: true })
      .sort({ name: 1 })
      .select("-__v");

    res.json({ success: true, categories });
  } catch (e) {
    next(e);
  }
}

export async function createCategory(req, res, next) {
  try {
    const { name } = createCategorySchema.parse(req.body);

    const category = await CourseCategory.create({
      name,
      createdBy: req.user?.id,
      isActive: true,
    });

    res.json({ success: true, category });
  } catch (e) {
    if (e?.name === "ZodError") {
      return res.status(422).json({ success: false, message: e.errors?.[0]?.message || "Invalid input" });
    }
    if (e?.code === 11000) {
      return res.status(409).json({ success: false, message: "Category already exists" });
    }
    next(e);
  }
}

export async function updateCategory(req, res, next) {
  try {
    const { name } = updateCategorySchema.parse(req.body);

    const category = await CourseCategory.findByIdAndUpdate(
      req.params.id,
      { $set: { name } },
      { new: true }
    ).select("-__v");

    if (!category) return res.status(404).json({ success: false, message: "Category not found" });

    res.json({ success: true, category });
  } catch (e) {
    if (e?.name === "ZodError") {
      return res.status(422).json({ success: false, message: e.errors?.[0]?.message || "Invalid input" });
    }
    if (e?.code === 11000) {
      return res.status(409).json({ success: false, message: "Category already exists" });
    }
    next(e);
  }
}

export async function deleteCategory(req, res, next) {
  try {
    const category = await CourseCategory.findByIdAndDelete(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.json({ success: true, deleted: true });
  } catch (e) {
    next(e);
  }
}
export async function listPublicCategories(req, res, next) {
  try {
    const categories = await CourseCategory.find({ isActive: true })
      .sort({ name: 1 })
      .select("_id name");

    res.json({ success: true, categories });
  } catch (e) {
    next(e);
  }
}

