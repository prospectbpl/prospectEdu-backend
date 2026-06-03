import multer from "multer";

const storage = multer.memoryStorage();

const allowed = [
  // video
  "video/mp4",
  "video/webm",
  "video/quicktime", // .mov

  // pdf
  "application/pdf",

  // doc
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
];
const fileFilter = (req, file, cb) => {
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error("Only MP4/WEBM/MOV/PDF/DOC/DOCX allowed"), false);
  }
  cb(null, true);
};

export const uploadAny = multer({
  storage,
  fileFilter,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB (adjust if needed)
});
