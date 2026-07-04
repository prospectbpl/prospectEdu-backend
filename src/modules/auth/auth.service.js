import bcrypt from "bcryptjs";
import { User } from "../users/user.model.js";
import { verifyRefreshToken, signAccessToken, signRefreshToken } from "../../utils/jwt.js";
import { ensureStudentProfile } from "../students/students.service.js";
import crypto from "crypto";
import { sendResetPasswordEmail } from "../../utils/mailer.js";

export async function registerUser({ fullName, email, phone, password, role, state, city }) {
  const exists = await User.findOne({ email });
  if (exists) {
    const err = new Error("Email already in use");
    err.statusCode = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  let user;
  try {
    user = await User.create({
      fullName,
      email,
      phone,
      role,
      state,
      city,
      passwordHash,

      // ✅ if teacher -> pending approval
      teacherApproval:
        role === "teacher"
          ? { status: "pending", reviewedAt: null, reviewedBy: null, note: "" }
          : { status: null, reviewedAt: null, reviewedBy: null, note: "" },
    

          adminApproval:
    role === "admin"
      ? { status: "pending", reviewedAt: null, reviewedBy: null, note: "" }
      : { status: null, reviewedAt: null, reviewedBy: null, note: "" },
        });

    if (user.role === "student") {
      await ensureStudentProfile(user._id, { state: "", city: "" });
    }
  } catch (e) {
    if (e?.code === 11000) {
      const field = Object.keys(e.keyPattern || {})[0] || "field";
      const err = new Error(`${field} already in use`);
      err.statusCode = 409;
      throw err;
    }
    throw e;
  }

  // ✅ If teacher, stop here: pending approval (NO tokens)
  if (user.role === "teacher") {
    return {
      user: sanitizeUser(user),
      pendingApproval: true,
      message: "Teacher account created. Please wait for admin approval.",
    };
  }
  if (user.role === "admin") {
  return {
    user: sanitizeUser(user),
    pendingApproval: true,
    message: "Admin request sent. Please wait for approval from existing admin.",
  };
}

  // normal flow for others (student/parent/admin/supplier)
  const fresh = await User.findById(user._id).select("+refreshTokenHash");
  const accessToken = signAccessToken({ sub: user._id.toString(), role: user.role });
  const refreshToken = signRefreshToken({ sub: user._id.toString(), role: user.role });

  fresh.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
  await fresh.save();

  return { user: sanitizeUser(user), accessToken, refreshToken };
}


export async function loginUser({ phone, password }) {
  const user = await User.findOne({ phone }).select("+passwordHash +refreshTokenHash");
  if (!user || !user.isActive) {
    const err = new Error("Invalid credentials");
    err.statusCode = 401;
    throw err;
  }

  const ok = await user.comparePassword(password);
  if (!ok) {
    const err = new Error("Invalid credentials");
    err.statusCode = 401;
    throw err;
  }

if (user.role === "teacher") {
  if (!user.teacherApproval || !user.teacherApproval.status) {
    const err = new Error("Teacher approval data missing. Contact admin.");
    err.statusCode = 403;
    throw err;
  }

  if (user.teacherApproval.status !== "approved") {
    const err = new Error("Teacher account pending admin approval");
    err.statusCode = 403;
    throw err;
  }
}


  user.lastLoginAt = new Date();

  const accessToken = signAccessToken({ sub: user._id.toString(), role: user.role });
  const refreshToken = signRefreshToken({ sub: user._id.toString(), role: user.role });

  user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
  await user.save();

  return { user: sanitizeUser(user), accessToken, refreshToken };
}

export function sanitizeUser(user) {
  return {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    state: user.state,
    city: user.city,
    isActive: user.isActive,
    teacherApproval: user.teacherApproval || null,
    adminApproval: user.adminApproval || null,  // ✅ add
    createdAt: user.createdAt,
  };
}

export async function refreshSession({ refreshToken }) {
  if (!refreshToken) {
    const err = new Error("Missing refresh token");
    err.statusCode = 401;
    throw err;
  }

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    const err = new Error("Invalid refresh token");
    err.statusCode = 401;
    throw err;
  }

  const user = await User.findById(payload.sub).select("+refreshTokenHash");
  if (!user || !user.isActive) {
    const err = new Error("Unauthorized");
    err.statusCode = 401;
    throw err;
  }

  // Compare stored hash with presented refresh token
  const ok = await bcrypt.compare(refreshToken, user.refreshTokenHash || "");
  if (!ok) {
    // Token reuse / rotation protection: invalidate stored token
    user.refreshTokenHash = null;
    await user.save();

    const err = new Error("Refresh token revoked");
    err.statusCode = 401;
    throw err;
  }

  // Rotate: issue new tokens
  const newAccessToken = signAccessToken({ sub: user._id.toString(), role: user.role });
  const newRefreshToken = signRefreshToken({ sub: user._id.toString(), role: user.role });

  user.refreshTokenHash = await bcrypt.hash(newRefreshToken, 10);
  await user.save();

  return { accessToken: newAccessToken, refreshToken: newRefreshToken, user: sanitizeUser(user) };
}

export async function logoutUser({ userId }) {
  if (!userId) return;
  await User.updateOne({ _id: userId }, { $set: { refreshTokenHash: null } });
}

export async function changePassword({ userId, oldPassword, newPassword }) {
  if (!userId) {
    const err = new Error("Unauthorized");
    err.statusCode = 401;
    throw err;
  }

  const user = await User.findById(userId).select("+passwordHash +refreshTokenHash");
  if (!user || !user.isActive) {
    const err = new Error("Unauthorized");
    err.statusCode = 401;
    throw err;
  }

  // 1) verify old password
  const ok = await user.comparePassword(oldPassword);
  if (!ok) {
    const err = new Error("Old password is incorrect");
    err.statusCode = 400;
    throw err;
  }

  // 2) ensure new != old
  const same = await bcrypt.compare(newPassword, user.passwordHash);
  if (same) {
    const err = new Error("New password must be different");
    err.statusCode = 400;
    throw err;
  }

  // 3) update password + revoke refresh token
  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.refreshTokenHash = null;
  await user.save();

  return { success: true };
}

export async function forgotPasswordUser({ email }) {
  const user = await User.findOne({ email }).select(
    "+resetPasswordToken +resetPasswordExpires"
  );

  // Don't reveal whether the email exists
  if (!user) {
    return {
      success: true,
      message:
        "If an account exists with this email, a password reset link has been sent.",
    };
  }

  // Generate random token
  const resetToken = crypto.randomBytes(32).toString("hex");

  // Store HASHED token in database
  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour

  await user.save();

  // Frontend URL
  const resetUrl = `${process.env.CORS_ORIGIN}/reset-password/${resetToken}`;

  await sendResetPasswordEmail({
    to: user.email,
    name: user.fullName,
    resetUrl,
  });

  return {
    success: true,
    message:
      "If an account exists with this email, a password reset link has been sent.",
  };
}

export async function resetPasswordUser({ token, password }) {
  // Hash received token
  const hashedToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() },
  }).select(
    "+passwordHash +resetPasswordToken +resetPasswordExpires +refreshTokenHash"
  );

  if (!user) {
    const err = new Error("Reset link is invalid or has expired.");
    err.statusCode = 400;
    throw err;
  }

  // Update password
  user.passwordHash = await bcrypt.hash(password, 10);

  // Clear reset token
  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;

  // Logout from all devices
  user.refreshTokenHash = null;

  await user.save();

  return {
    success: true,
    message: "Password reset successful.",
  };
}