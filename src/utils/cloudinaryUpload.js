import cloudinary from "../config/cloudinary.js";

export const uploadBufferToCloudinary = (buffer, { folder = "products", resourceType = "image" } = {}) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType, // ✅ "image" or "raw"
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    stream.end(buffer);
  });
};
