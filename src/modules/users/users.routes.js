import { Router } from "express";
import { User } from "./user.model.js";
import { requireAuth, requireRole } from "../../middlewares/auth.js";
import {listTeachers , listStudents ,blockUser,unblockUser,getStudentById,
  listTeacherRequests,   // ✅ add
  approveTeacher,        // ✅ add
  rejectTeacher ,setTeacherSalary,getTeacherByIdAdmin, listAdminRequests,
  approveAdmin,
  rejectAdmin,
  listAdmins,
  } from "./users.controller.js"
const router = Router();

// TEMP test route: creates a user (remove later)
router.post("/seed-admin", async (req, res, next) => {
  try {
    const exists = await User.findOne({ email: "admin@demo.com" });
    if (exists) {
      return res.json({ ok: true, message: "Admin already exists" });
    }

    const user = new User({
      fullName: "Admin Demo",
      email: "admin@demo.com",
      role: "admin",
    });

    user.password = "Admin@123"; // virtual triggers hashing
    await user.save();

    res.json({ ok: true, id: user._id });
  } catch (e) {
    next(e);
  }
});
router.get(
  "/teachers",
  requireAuth,
  requireRole("admin"),
  listTeachers
);
router.get(
  "/students",
  requireAuth,
  requireRole("admin"),
  listStudents
);

router.patch(
  "/:userId/block",
  requireAuth,
  requireRole("admin"),
  blockUser
);
router.patch(
  "/:userId/unblock",
  requireAuth,
  requireRole("admin"),
  unblockUser
);
// ✅ teacher approval (admin)
router.get(
  "/teacher-requests",
  requireAuth,
  requireRole("admin"),
  listTeacherRequests
);

router.patch(
  "/teacher-requests/:teacherId/approve",
  requireAuth,
  requireRole("admin"),
  approveTeacher
);

router.patch(
  "/teacher-requests/:teacherId/reject",
  requireAuth,
  requireRole("admin"),
  rejectTeacher
);
router.patch(
  "/teachers/:teacherId/salary",
  requireAuth,
  requireRole("admin"),
  setTeacherSalary
);
router.get(
  "/teachers/:id",
  requireAuth,
  requireRole("admin"),
  getTeacherByIdAdmin
);
// ✅ admin approval (admin)
router.get(
  "/admin-requests",
  requireAuth,
  requireRole("admin"),
  listAdminRequests
);

router.patch(
  "/admin-requests/:adminId/approve",
  requireAuth,
  requireRole("admin"),
  approveAdmin
);

router.patch(
  "/admin-requests/:adminId/reject",
  requireAuth,
  requireRole("admin"),
  rejectAdmin
);
// ✅ approved admins list (Admin Management)
router.get(
  "/admins",
  requireAuth,
  requireRole("admin"),
  listAdmins
);

router.get("/students/:studentId", requireAuth, requireRole("admin"), getStudentById);
export default router;
 