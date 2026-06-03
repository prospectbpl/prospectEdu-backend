import { User } from "../users/user.model.js";
import { ParentProfile } from "./parentProfile.model.js";
import mongoose from "mongoose";
import { StudentOverallPerformance } from "../performance/studentOverallPerformance.model.js";
function normalizePhoneDigits(phone) {
  return String(phone || "").replace(/\D/g, "");
}

async function getOrCreateParentProfile(userId) {
  const prof = await ParentProfile.findOneAndUpdate(
    { user: userId },
    { $setOnInsert: { user: userId } },
    { new: true, upsert: true }
  );
  return prof;
}

export async function getMyParentProfile(req, res, next) {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select("fullName email phone role");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (user.role !== "parent") return res.status(403).json({ success: false, message: "Forbidden" });

    const prof = await ParentProfile.findOne({ user: userId }).lean();

    return res.json({
      success: true,
      profile: {
        fullName: user.fullName,
        email: user.email,
        phone: user.phone || "",
        address: prof?.address || "",
      },
    });
  } catch (e) {
    next(e);
  }
}

export async function updateMyParentProfile(req, res, next) {
  try {
    const userId = req.user.id;

    const { fullName, email, phone, address } = req.body || {};

    const payload = {
      fullName: String(fullName || "").trim(),
      email: String(email || "").trim().toLowerCase(),
      phone: String(phone || "").trim(),
    };

    if (!payload.fullName || payload.fullName.length < 2) {
      return res.status(422).json({ success: false, message: "Full name is required" });
    }
    if (!payload.email || !payload.email.includes("@")) {
      return res.status(422).json({ success: false, message: "Valid email is required" });
    }

    const user = await User.findById(userId).select("role");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (user.role !== "parent") return res.status(403).json({ success: false, message: "Forbidden" });

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: payload },
      { new: true, runValidators: true }
    ).select("fullName email phone");

    const prof = await ParentProfile.findOneAndUpdate(
      { user: userId },
      { $set: { address: String(address || "").trim() } },
      { new: true, upsert: true }
    ).lean();

    return res.json({
      success: true,
      message: "Parent profile updated",
      profile: {
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        phone: updatedUser.phone || "",
        address: prof?.address || "",
      },
    });
  } catch (e) {
    if (e?.code === 11000) {
      const field = Object.keys(e.keyPattern || {})[0] || "field";
      return res.status(409).json({ success: false, message: `${field} already in use` });
    }
    next(e);
  }
}

// GET /api/v1/parents/me/children
export async function getMyChildren(req, res, next) {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select("role");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (user.role !== "parent") return res.status(403).json({ success: false, message: "Forbidden" });

    const prof = await ParentProfile.findOne({ user: userId }).lean();
    const ids = (prof?.children || []).map((c) => c.studentUserId).filter(Boolean);

    const students = await User.find({ _id: { $in: ids }, role: "student" })
      .select("_id fullName email phone")
      .lean();

    const map = new Map(students.map((s) => [String(s._id), s]));
    const children = (prof?.children || [])
      .map((c) => map.get(String(c.studentUserId)))
      .filter(Boolean);

    return res.json({ success: true, children });
  } catch (e) {
    next(e);
  }
}

// POST /api/v1/parents/me/children  { phone }
export async function addChildByPhone(req, res, next) {
  try {
    const userId = req.user.id;
    const rawPhone = String(req.body?.phone || "").trim();
    const digits = normalizePhoneDigits(rawPhone);

    if (!digits || digits.length < 8) {
      return res.status(422).json({ success: false, message: "Valid phone is required" });
    }

    const user = await User.findById(userId).select("role");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (user.role !== "parent") return res.status(403).json({ success: false, message: "Forbidden" });

    let student = await User.findOne({ role: "student", phone: rawPhone }).select(
      "_id fullName email phone"
    );
    if (!student) {
      student = await User.findOne({
        role: "student",
        phone: { $regex: `${digits}$` },
      }).select("_id fullName email phone");
    }

    if (!student) {
      return res.status(404).json({ success: false, message: "No student found with this phone" });
    }

    const prof = await getOrCreateParentProfile(userId);
    const already = (prof.children || []).some(
      (c) => String(c.studentUserId) === String(student._id)
    );
    if (already) {
      return res.status(409).json({ success: false, message: "Child already linked" });
    }

    prof.children = [{ studentUserId: student._id, addedAt: new Date() }, ...(prof.children || [])];
    await prof.save();

    return res.json({
      success: true,
      message: "Child linked",
      child: {
        _id: student._id,
        fullName: student.fullName,
        email: student.email,
        phone: student.phone || "",
      },
    });
  } catch (e) {
    next(e);
  }
}

// DELETE /api/v1/parents/me/children/:studentId
export async function removeChild(req, res, next) {
  try {
    const userId = req.user.id;
    const { studentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ success: false, message: "Invalid studentId" });
    }

    const user = await User.findById(userId).select("role");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (user.role !== "parent") return res.status(403).json({ success: false, message: "Forbidden" });

    const prof = await getOrCreateParentProfile(userId);
    const before = prof.children?.length || 0;

    prof.children = (prof.children || []).filter(
      (c) => String(c.studentUserId) !== String(studentId)
    );

    if (prof.children.length === before) {
      return res.status(404).json({ success: false, message: "Child link not found" });
    }

    await prof.save();
    return res.json({ success: true, deleted: true });
  } catch (e) {
    next(e);
  }
}


// GET /api/v1/parents/me/students
// Returns: [{ _id, fullName, isActive, attendance, progress, performanceUpdatedAt }]
export async function getMyStudentsOverview(req, res, next) {
  try {
    const parentUserId = req.user.id;

    // 1) Get linked children ids (same pattern as getMyChildren)
    const prof = await ParentProfile.findOne({ user: parentUserId }).lean();
    const studentIds = (prof?.children || [])
      .map((c) => c?.studentUserId)
      .filter((id) => mongoose.Types.ObjectId.isValid(id));

    if (studentIds.length === 0) {
      return res.json({ success: true, students: [] });
    }

    // 2) Fetch students (name + blocked flag)
    const studentsBasic = await User.find({
      _id: { $in: studentIds },
      role: "student",
    })
      .select("_id fullName isActive")
      .lean();

    // 3) Fetch latest performance per student (attendance + progress)
    // Because model is (teacherId, studentId), we choose latest updated row per student.
    const perfDocs = await StudentOverallPerformance.find({
      studentId: { $in: studentIds },
    })
      .sort({ updatedAt: -1 })
      .select("studentId attendance progress updatedAt")
      .lean();

    const perfMap = new Map(); // studentId -> latest performance doc
    for (const p of perfDocs) {
      const sid = String(p.studentId);
      if (!perfMap.has(sid)) perfMap.set(sid, p); // sorted desc => first is latest
    }

    // 4) Build response (keep only required fields)
    const out = studentsBasic.map((s) => {
      const p = perfMap.get(String(s._id));
      return {
        _id: s._id,
        fullName: s.fullName || "—",
        isActive: !!s.isActive, // false => blocked
        attendance: typeof p?.attendance === "number" ? p.attendance : 0,
        progress: typeof p?.progress === "number" ? p.progress : 0,
        performanceUpdatedAt: p?.updatedAt || null,
      };
    });

    return res.json({ success: true, students: out });
  } catch (e) {
    next(e);
  }
}
