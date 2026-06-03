import mongoose from "mongoose";
const { Schema } = mongoose;


const courseSchema = new Schema(
  {
    // ===== FRONTEND FIELDS (DO NOT RENAME) =====
    title: { type: String, required: true, trim: true },
    category: { type: String, trim: true, default: "" },

    short: { type: String, trim: true, default: "" },        // Short Description
    description: { type: String, trim: true, default: "" },  // Course Description
    info: { type: String, trim: true, default: "" },         // Course Information
    duration: {type : String , trim: true, default: "" },
    professors: [{ type: String, trim: true }],

    price: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },

    date: { type: String, default: "" }, // Start Date (kept string to match UI)
    img: { type: String, trim: true, default: "" },

    tags: [{ type: String, trim: true }],

    // ===== AUTOMATION FIELDS =====
    slug: { type: String, unique: true, index: true },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },

    assignedTeachers: [{ type: Schema.Types.ObjectId, ref: "User" }],

    settings: {
      visibility: { type: String, enum: ["public", "private"], default: "public" },
      live: { type: Boolean, default: true },
      doubts: { type: Boolean, default: true },
      progressBar: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

// slug from title
courseSchema.pre("save", function (next) {
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
});


export const Course = mongoose.model("Course", courseSchema);
