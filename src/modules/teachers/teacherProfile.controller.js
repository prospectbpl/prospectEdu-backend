import { TeacherProfile } from "./teacherProfile.model.js";
import { User } from "../users/user.model.js";

/**
 * GET my teacher profile
 */
export async function getMyTeacherProfile(req, res, next) {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select(
      "fullName email phone"
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const profile = await TeacherProfile.findOne({ user: userId });

    return res.json({
      success: true,
      profile: {
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        ...(profile?.toObject() || {}),
      },
    });
  } catch (e) {
    next(e);
  }
}

/**
 * UPDATE my teacher profile
 */
export async function updateMyTeacherProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const {
      fullName,
      phone,
      teacherId,
      department,
      designation,
      experience,
      qualification,
      subjects,
    } = req.body;

    // update base user fields
    await User.findByIdAndUpdate(userId, {
      fullName,
      phone,
    });

    // upsert teacher profile
    const profile = await TeacherProfile.findOneAndUpdate(
      { user: userId },
      {
        teacherId,
        department,
        designation,
        experience,
        qualification,
        subjects,
      },
      { upsert: true, new: true }
    );

    return res.json({
      success: true,
      message: "Profile updated successfully",
      profile,
    });
  } catch (e) {
    next(e);
  }
}
