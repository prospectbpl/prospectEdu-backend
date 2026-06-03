import mongoose from "mongoose";

const blogSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true },

    title: { type: String, required: true, trim: true },
    subtitle: { type: String, default: "", trim: true },
    content: { type: String, required: true },

    coverUrl: { type: String, default: "" },
    coverPublicId: { type: String, default: "" },

    isPublished: { type: Boolean, default: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Blog", blogSchema);
