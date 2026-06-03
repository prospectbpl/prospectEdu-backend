import multer from "multer";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const ok =
    ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype) ||
    file.mimetype === "application/pdf";

  if (!ok) return cb(new Error("Only JPG/PNG/WEBP images and PDF files allowed"), false);
  cb(null, true);
};

export const researchUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
});
