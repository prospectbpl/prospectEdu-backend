import { StudentProfile } from "./students.model.js";
import { User } from "../users/user.model.js";
import { updateMeSchema } from "./students.validators.js";
import { ensureStudentProfile } from "./students.service.js"; 
import mongoose from "mongoose";
import {StudentOverallPerformance} from "../performance/studentOverallPerformance.model.js";
import {Enrollment} from "../courses/enrollment.model.js";
import { Course } from "../courses/course.model.js";
import { ParentProfile } from "../parents/parentProfile.model.js";

const USER_SELECT = "fullName email phone role";
const ADMIN_USER_SELECT =
  "fullName email phone role state city isActive createdAt lastLoginAt updatedAt";
export async function getMyStudentProfile(req, res, next) {
  try {
    const [user, profileDoc] = await Promise.all([
  User.findById(req.user.id).select(USER_SELECT),
  StudentProfile.findOne({ userId: req.user.id }),
]);

let profile = profileDoc;
if (!profile) {
  profile = await ensureStudentProfile(req.user.id);
}

return res.json({ success: true, user, profile });

  } catch (e) {
    next(e);
  }
}

export async function updateMyStudentProfile(req, res, next) {
  try {
    const data = updateMeSchema.parse(req.body);

    const { fullName, phone, ...profileFields } = data;

    const ops = [];

    // Update User only if needed
    if (fullName !== undefined || phone !== undefined) {
      ops.push(
        User.findByIdAndUpdate(
          req.user.id,
          {
            $set: {
              ...(fullName !== undefined ? { fullName } : {}),
              ...(phone !== undefined ? { phone } : {}),
            },
          },
          { new: true, runValidators: true }
        ).select(USER_SELECT)
      );
    } else {
      ops.push(User.findById(req.user.id).select(USER_SELECT));
    }

    // Update StudentProfile (upsert keeps it safe)
    ops.push(
      StudentProfile.findOneAndUpdate(
        { userId: req.user.id },
        { $set: profileFields },
        { new: true, upsert: true, runValidators: true }
      )
    );

    const [user, profile] = await Promise.all(ops);

    return res.json({ success: true, user, profile });
  } catch (e) {
    if (e?.name === "ZodError") {
      e.statusCode = 422;
      e.message = e.errors?.[0]?.message || "Invalid input";
    }
    next(e);
  }
}


export async function getStudentProfileByIdAdmin(req, res, next) {
  try {
    const { studentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ success: false, message: "Invalid studentId" });
    }

    const user = await User.findOne({ _id: studentId, role: "student" })
      .select("_id fullName email phone state city createdAt lastLoginAt updatedAt isActive");

    if (!user) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    // ✅ ensures profile exists and returns it
    const profile = await ensureStudentProfile(user._id);

    return res.json({ success: true, user, profile });
  } catch (e) {
    next(e);
  }
}


/**
 * GET /api/v1/students/:studentId/details
 */
export async function getStudentDetails(req, res, next) {
  try {
    const { studentId } = req.params;
    const requester = req.user;

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ success: false, message: "Invalid studentId" });
    }

    // 1️⃣ Student basic info
    const student = await User.findOne({
      _id: studentId,
      role: "student",
    }).select("_id fullName email phone isActive createdAt");

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    /**
     * 2️⃣ Authorization
     * - Admin → always allowed
     * - Parent → only if child is linked
     * - Teacher → allowed (you may restrict later)
     */
    if (requester.role === "parent") {
      const prof = await ParentProfile.findOne({
        user: requester.id,
        "children.studentUserId": studentId,
      }).select("_id");

      if (!prof) {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }
    }

    // 3️⃣ Latest performance (teacher maintained)
    const performance = await StudentOverallPerformance.findOne({
      studentId,
    })
      .sort({ updatedAt: -1 })
      .select("assignmentAvg quizAvg attendance progress updatedAt")
      .lean();

    // 4️⃣ Enrolled courses
    const enrollments = await Enrollment.find({
      studentUserId: studentId,
      status: "active",
    })
      .populate("courseId", "title slug img")
      .select("courseId enrolledAt")
      .lean();

    const courses = enrollments
      .filter((e) => e.courseId)
      .map((e) => ({
        _id: e.courseId._id,
        title: e.courseId.title,
        slug: e.courseId.slug,
        img: e.courseId.img || "",
        enrolledAt: e.enrolledAt,
      }));

    // 5️⃣ Optional recent activity (safe, derived)
    const recentActivity = performance
      ? [
          {
            label: "Attendance Updated",
            value: `${performance.attendance}%`,
            at: performance.updatedAt,
          },
          {
            label: "Progress Updated",
            value: `${performance.progress}%`,
            at: performance.updatedAt,
          },
        ]
      : [];

    return res.json({
      success: true,
      student: {
        _id: student._id,
        fullName: student.fullName,
        email: student.email,
        phone: student.phone || "",
        isActive: student.isActive,
        joinedAt: student.createdAt,
      },
      performance: performance || {
        assignmentAvg: 0,
        quizAvg: 0,
        attendance: 0,
        progress: 0,
      },
      courses,
      recentActivity,
    });
  } catch (e) {
    next(e);
  }
}
