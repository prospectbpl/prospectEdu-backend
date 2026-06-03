import { User } from "./user.model.js";
import mongoose from "mongoose";
import { TeacherProfile } from "../teachers/teacherProfile.model.js";
export async function listTeachers(req, res, next) {
  try {
    const status = String(req.query.status || "active"); // active|blocked|all
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.max(parseInt(req.query.limit || "15", 10), 1);
    const q = String(req.query.q || "").trim();
    const skip = (page - 1) * limit;

    const filter = { role: "teacher" };

    if (status === "active") filter.isActive = true;
    else if (status === "blocked") filter.isActive = false;

    if (q) {
      filter.$or = [
        { fullName: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { phone: { $regex: q, $options: "i" } },
      ];
    }

    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("_id fullName email phone state city lastLoginAt createdAt isActive"),
    ]);

    // attach salary from TeacherProfile
    const ids = users.map((u) => u._id);
    const profiles = await TeacherProfile.find({ user: { $in: ids } }).select("user salary");
    const salaryMap = new Map(profiles.map((p) => [String(p.user), p.salary || 0]));

    const teachers = users.map((u) => ({
      ...u.toObject(),
      salary: salaryMap.get(String(u._id)) ?? 0,
    }));

    const totalPages = Math.max(Math.ceil(total / limit), 1);

    res.json({ success: true, teachers, page, limit, total, totalPages });
  } catch (e) {
    next(e);
  }
}



export async function listStudents(req, res, next) {
  try {
    const status = String(req.query.status || "active");
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.max(parseInt(req.query.limit || "15", 10), 1);
    const skip = (page - 1) * limit;

    const filter = { role: "student" };
    if (status === "active") filter.isActive = true;
    else if (status === "blocked") filter.isActive = false;
    // all => no isActive filter

    const [total, students] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("_id fullName email phone state city createdAt lastLoginAt updatedAt isActive"),
    ]);

    const totalPages = Math.max(Math.ceil(total / limit), 1);

    return res.json({
      success: true,
      students,
      page,
      limit,
      total,
      totalPages,
    });
  } catch (e) {
    next(e);
  }
}


export async function blockUser(req, res, next) {
  try {
    const { userId } = req.params;

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { isActive: false } },
      { new: true }
    ).select("_id isActive");

    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    return res.json({ success: true, message: "User blocked", user });
  } catch (e) {
    next(e);
  }
}
export async function unblockUser(req, res, next) {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Invalid userId" });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { isActive: true } },
      { new: true }
    ).select("_id fullName email role isActive");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.json({ success: true, message: "User unblocked", user });
  } catch (e) {
    next(e);
  }
}
export async function getStudentById(req, res, next) {
  try {
    const { studentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ success: false, message: "Invalid studentId" });
    }

    const student = await User.findOne({ _id: studentId, role: "student" })
      .select("_id fullName email phone state city createdAt lastLoginAt updatedAt isActive");

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    return res.json({ success: true, student });
  } catch (e) {
    next(e);
  }
}
export async function listTeacherRequests(req, res, next) {
  try {
    const status = String(req.query.status || "pending"); // pending|approved|rejected|all

    const filter = { role: "teacher" };
    if (status !== "all") filter["teacherApproval.status"] = status;

    const teachers = await User.find(filter)
      .sort({ createdAt: -1 })
      .select("_id fullName email phone state city createdAt teacherApproval isActive");

    return res.json({ success: true, teachers });
  } catch (e) {
    next(e);
  }
}

export async function approveTeacher(req, res, next) {
  try {
    const { teacherId } = req.params;

    const user = await User.findOneAndUpdate(
      { _id: teacherId, role: "teacher" },
      {
        $set: {
          "teacherApproval.status": "approved",
          "teacherApproval.reviewedAt": new Date(),
          "teacherApproval.reviewedBy": req.user.id,
          isActive: true, // keep active
        },
      },
      { new: true }
    ).select("_id fullName email phone state city teacherApproval isActive");

    if (!user) return res.status(404).json({ success: false, message: "Teacher not found" });

    return res.json({ success: true, message: "Teacher approved", teacher: user });
  } catch (e) {
    next(e);
  }
}

export async function rejectTeacher(req, res, next) {
  try {
    const { teacherId } = req.params;
    const { note = "" } = req.body || {};

    const user = await User.findOneAndUpdate(
      { _id: teacherId, role: "teacher" },
      {
        $set: {
          "teacherApproval.status": "rejected",
          "teacherApproval.reviewedAt": new Date(),
          "teacherApproval.reviewedBy": req.user.id,
          "teacherApproval.note": String(note || "").trim(),
        },
      },
      { new: true }
    ).select("_id fullName email phone state city teacherApproval isActive");

    if (!user) return res.status(404).json({ success: false, message: "Teacher not found" });

    return res.json({ success: true, message: "Teacher rejected", teacher: user });
  } catch (e) {
    next(e);
  }
}
export async function setTeacherSalary(req, res, next) {
  try {
    const { teacherId } = req.params;
    const { salary } = req.body;

    const teacher = await User.findOne({ _id: teacherId, role: "teacher" }).select("_id");
    if (!teacher) return res.status(404).json({ success: false, message: "Teacher not found" });

    const prof = await TeacherProfile.findOneAndUpdate(
      { user: teacherId },
      { $set: { salary: Number(salary || 0) } },
      { new: true, upsert: true }
    ).select("user salary");

    return res.json({ success: true, message: "Salary updated", profile: prof });
  } catch (e) {
    next(e);
  }
}
export async function getTeacherByIdAdmin(req, res, next) {
  try {
    const { id } = req.params;

    const user = await User.findOne({ _id: id, role: "teacher" }).select(
      "_id fullName email phone state city role isActive createdAt updatedAt lastLoginAt teacherApproval"
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "Teacher not found" });
    }

    const profile = await TeacherProfile.findOne({ user: id }).lean();

    return res.json({ success: true, user, profile });
  } catch (e) {
    next(e);
  }
}
export async function listAdminRequests(req, res, next) {
  try {
    const status = String(req.query.status || "pending"); // pending|approved|rejected|all
    const filter = { role: "admin" };
    if (status !== "all") filter["adminApproval.status"] = status;

    const admins = await User.find(filter)
      .sort({ createdAt: -1 })
      .select("_id fullName email phone state city createdAt adminApproval isActive");

    return res.json({ success: true, admins });
  } catch (e) {
    next(e);
  }
}

export async function approveAdmin(req, res, next) {
  try {
    const { adminId } = req.params;

    const user = await User.findOneAndUpdate(
      { _id: adminId, role: "admin" },
      {
        $set: {
          "adminApproval.status": "approved",
          "adminApproval.reviewedAt": new Date(),
          "adminApproval.reviewedBy": req.user.id,
          isActive: true,
        },
      },
      { new: true }
    ).select("_id fullName email phone state city adminApproval isActive");

    if (!user) return res.status(404).json({ success: false, message: "Admin not found" });

    return res.json({ success: true, message: "Admin approved", admin: user });
  } catch (e) {
    next(e);
  }
}

export async function rejectAdmin(req, res, next) {
  try {
    const { adminId } = req.params;
    const { note = "" } = req.body || {};

    const user = await User.findOneAndUpdate(
      { _id: adminId, role: "admin" },
      {
        $set: {
          "adminApproval.status": "rejected",
          "adminApproval.reviewedAt": new Date(),
          "adminApproval.reviewedBy": req.user.id,
          "adminApproval.note": String(note || "").trim(),
        },
      },
      { new: true }
    ).select("_id fullName email phone state city adminApproval isActive");

    if (!user) return res.status(404).json({ success: false, message: "Admin not found" });

    return res.json({ success: true, message: "Admin rejected", admin: user });
  } catch (e) {
    next(e);
  }
}

// ✅ List APPROVED admins for Admin Management UI
// GET /api/v1/users/admins?status=active|blocked|all&q=
export async function listAdmins(req, res, next) {
  try {
    const status = String(req.query.status || "active"); // active|blocked|all
    const q = String(req.query.q || "").trim();

    // Only approved admins should appear in Admin Management
    const filter = {
      role: "admin",
      "adminApproval.status": "approved",
    };

    if (status === "active") filter.isActive = true;
    else if (status === "blocked") filter.isActive = false;
    // all => no isActive filter

    if (q) {
      filter.$or = [
        { fullName: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { phone: { $regex: q, $options: "i" } },
      ];
    }

    const admins = await User.find(filter)
      .sort({ createdAt: -1 })
      .select(
        "_id fullName email phone state city createdAt lastLoginAt isActive adminApproval"
      );

    return res.json({ success: true, admins });
  } catch (e) {
    next(e);
  }
}

