import cloudinary from "../config/cloudinary.js";

export async function uploadBufferToCloudinaryAny({ buffer, folder, resource_type }) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type }, // resource_type: "video" or "raw"
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );

    stream.end(buffer);
  });
}
