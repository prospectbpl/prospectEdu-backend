import Category from "./category.model.js";

export const listCategories = async () => {
  return Category.find().sort({ createdAt: -1 });
};

export const createCategory = async ({ name, imageUrl }) => {
  const exists = await Category.findOne({ name: name.trim() });
  if (exists) throw new Error("Category already exists");
  return Category.create({ name: name.trim(), imageUrl });
};

export const updateCategory = async (id, data) => {
  const cat = await Category.findById(id);
  if (!cat) throw new Error("Category not found");

  if (data.name !== undefined) cat.name = data.name.trim();
  if (data.imageUrl !== undefined) cat.imageUrl = data.imageUrl;

  await cat.save();
  return cat;
};

export const deleteCategory = async (id) => {
  const cat = await Category.findById(id);
  if (!cat) throw new Error("Category not found");
  await cat.deleteOne();
  return true;
};
