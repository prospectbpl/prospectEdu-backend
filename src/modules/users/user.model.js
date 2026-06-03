// server/modules/users/user.model.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const { Schema } = mongoose;

export const USER_ROLES = ["admin", "student", "parent", "teacher", "supplier"];

const approvalSchema = {
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: null,
    index: true,
  },
  reviewedAt: { type: Date, default: null },
  reviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  note: { type: String, trim: true, default: "" },
};

const userSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    phone: { type: String, trim: true, unique: true, sparse: true },
    passwordHash: { type: String, required: true, select: false },

    role: {
      type: String,
      enum: USER_ROLES,
      required: true,
      index: true,
    },

    isActive: { type: Boolean, default: true },
    state: { type: String, trim: true },
    city: { type: String, trim: true },

    // ✅ Teacher approval workflow
    teacherApproval: approvalSchema,

    // ✅ NEW: Admin approval workflow
    adminApproval: approvalSchema,

    refreshTokenHash: { type: String, select: false, default: null },

        addresses: [
      {
        name: { type: String, required: true, trim: true },
        phone: { type: String, required: true, trim: true },
        email: { type: String, required: true, trim: true, lowercase: true },
        address: { type: String, required: true, trim: true },
        city: { type: String, required: true, trim: true },
        pincode: { type: String, required: true, trim: true },
        state: { type: String, required: true, trim: true },
        country: { type: String, default: "India" },
      },
    ],


    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// ✅ Keep approval states only for the right roles
userSchema.pre("save", function () {
  // Teacher defaults
  if (this.role !== "teacher") {
    this.teacherApproval = undefined;
  } else if (!this.teacherApproval?.status) {
    this.teacherApproval = {
      status: "pending",
      reviewedAt: null,
      reviewedBy: null,
      note: "",
    };
  }

  // Admin defaults
  if (this.role !== "admin") {
    this.adminApproval = undefined;
  } else if (!this.adminApproval?.status) {
    this.adminApproval = {
      status: "pending",
      reviewedAt: null,
      reviewedBy: null,
      note: "",
    };
  }
  
});

userSchema.methods.comparePassword = async function comparePassword(password) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(password, this.passwordHash);
};

export const User = mongoose.model("User", userSchema);
