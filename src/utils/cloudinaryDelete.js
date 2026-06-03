import cloudinary from "../config/cloudinary.js";

export async function deleteFromCloudinary(publicId, resource_type = "raw") {
  if (!publicId) return null;
  return cloudinary.uploader.destroy(publicId, { resource_type });
}
