import { createCategorySchema, updateCategorySchema } from "./category.validators.js";
import * as CategoryService from "./category.service.js";
import { uploadBufferToCloudinary } from "../../utils/cloudinaryUpload.js";

export const list = async (req, res, next) => {
  try {
    const items = await CategoryService.listCategories();
    res.json({ success: true, categories: items });
  } catch (e) {
    next(e);
  }
};

export const create = async (req, res, next) => {
  try {
    const data = createCategorySchema.parse(req.body);

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Category image is required" });
    }

    const uploaded = await uploadBufferToCloudinary(req.file.buffer, { folder: "categories" });

    const cat = await CategoryService.createCategory({
      name: data.name,
      imageUrl: uploaded.secure_url,
    });

    res.status(201).json({ success: true, category: cat });
  } catch (e) {
    next(e);
  }
};

export const update = async (req, res, next) => {
  try {
    const data = updateCategorySchema.parse(req.body);

    let imageUrl;
    if (req.file) {
      const uploaded = await uploadBufferToCloudinary(req.file.buffer, { folder: "categories" });
      imageUrl = uploaded.secure_url;
    }

    const updated = await CategoryService.updateCategory(req.params.id, {
      ...data,
      ...(imageUrl ? { imageUrl } : {}),
    });

    res.json({ success: true, category: updated });
  } catch (e) {
    next(e);
  }
};

export const remove = async (req, res, next) => {
  try {
    await CategoryService.deleteCategory(req.params.id);
    res.json({ success: true, message: "Category deleted" });
  } catch (e) {
    next(e);
  }
};
