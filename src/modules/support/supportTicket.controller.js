import SupportTicket from "./supportTicket.model.js";
import { uploadBufferToCloudinary } from "../../utils/cloudinaryUpload.js";

const DAYS_TO_KEEP = 10;

const cutoffDate = () => {
  const d = new Date();
  d.setDate(d.getDate() - DAYS_TO_KEEP);
  return d;
};

const pruneOldMessages = async (ticketId) => {
  const cutoff = cutoffDate();
  // removes embedded messages older than cutoff
  await SupportTicket.updateOne(
    { _id: ticketId },
    { $pull: { messages: { createdAt: { $lt: cutoff } } } }
  );
};

const pickAttachment = async (file) => {
  if (!file) return null;

  const isImage = ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype);
  const resourceType = isImage ? "image" : "raw";
  const folder = "support-tickets";

  const uploaded = await uploadBufferToCloudinary(file.buffer, { folder, resourceType });

  return {
    url: uploaded.secure_url,
    publicId: uploaded.public_id,
    name: file.originalname,
    mimetype: file.mimetype,
    resourceType,
  };
};

// ✅ Student creates ticket -> goes to ALL teachers (unassigned)
export async function createTicket(req, res, next) {
  try {
    const studentId = req.user.id;
    const { doubtType = "General", subject = "", question } = req.body;

    if (!question?.trim()) {
      return res.status(400).json({ success: false, message: "question required" });
    }

    const attachment = await pickAttachment(req.file);

    const ticket = await SupportTicket.create({
      student: studentId,
      assignedTeacher: null, // ✅ visible to all teachers
      doubtType,
      subject,
      question,
      messages: [
        {
          fromRole: "student",
          fromUser: studentId,
          text: question,
          attachment,
        },
      ],
      lastMessageAt: new Date(),
    });

    // prune not needed here but harmless
    await pruneOldMessages(ticket._id);

    const fresh = await SupportTicket.findById(ticket._id)
      .populate("student", "name email role")
      .populate("assignedTeacher", "name email role")
      .populate("messages.fromUser", "name email role")
      .lean();

    res.json({ success: true, data: fresh });
  } catch (e) {
    next(e);
  }
}

// ✅ Student: list own tickets
export async function myTickets(req, res, next) {
  try {
    const studentId = req.user.id;

    // Optional pruning: only prune tickets that the student is fetching
    const ids = await SupportTicket.find({ student: studentId }).select("_id").lean();
    await Promise.all(ids.map((t) => pruneOldMessages(t._id)));

    const tickets = await SupportTicket.find({ student: studentId })
      .sort({ lastMessageAt: -1 })
      .populate("assignedTeacher", "name email role")
      .lean();

    res.json({ success: true, data: tickets });
  } catch (e) {
    next(e);
  }
}

// ✅ Teacher inbox: show unassigned + my assigned
export async function teacherInbox(req, res, next) {
  try {
    const teacherId = req.user.id;

    const ids = await SupportTicket.find({
      $or: [{ assignedTeacher: null }, { assignedTeacher: teacherId }],
    })
      .select("_id")
      .lean();

    await Promise.all(ids.map((t) => pruneOldMessages(t._id)));

    const tickets = await SupportTicket.find({
      $or: [{ assignedTeacher: null }, { assignedTeacher: teacherId }],
    })
      .sort({ lastMessageAt: -1 })
      .populate("student", "name email role")
      .populate("assignedTeacher", "name email role")
      .lean();

    res.json({ success: true, data: tickets });
  } catch (e) {
    next(e);
  }
}

// ✅ Get one ticket thread (only last 10 days kept)
export async function getTicket(req, res, next) {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const { id } = req.params;

    await pruneOldMessages(id);

    const ticket = await SupportTicket.findById(id)
      .populate("student", "name email role")
      .populate("assignedTeacher", "name email role")
      .populate("messages.fromUser", "name email role")
      .lean();

    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });

    const studentOk = role === "student" && String(ticket.student?._id) === String(userId);

    const assignedId = ticket.assignedTeacher?._id || ticket.assignedTeacher; // handles populated or ObjectId
    const teacherOk =
      role === "teacher" && (ticket.assignedTeacher === null || String(assignedId) === String(userId));

    if (!studentOk && !teacherOk) return res.status(403).json({ success: false, message: "Forbidden" });

    res.json({ success: true, data: ticket });
  } catch (e) {
    next(e);
  }
}

// ✅ Add message (student OR teacher)
export async function addTicketMessage(req, res, next) {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const { id } = req.params;
    const { text = "" } = req.body;

    // prune first so chat is always "last 10 days"
    await pruneOldMessages(id);

    const ticket = await SupportTicket.findById(id)
      .populate("student", "name email role")
      .populate("assignedTeacher", "name email role");

    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });

    const isStudent = role === "student" && String(ticket.student?._id || ticket.student) === String(userId);

    const assignedId = ticket.assignedTeacher?._id || ticket.assignedTeacher;
    const teacherAllowed =
      role === "teacher" && (ticket.assignedTeacher === null || String(assignedId) === String(userId));

    if (!isStudent && !teacherAllowed) return res.status(403).json({ success: false, message: "Forbidden" });

    if (!text.trim() && !req.file) {
      return res.status(400).json({ success: false, message: "text or attachment required" });
    }

    const attachment = await pickAttachment(req.file);

    // ✅ Auto-assign when first teacher replies
    if (role === "teacher" && ticket.assignedTeacher === null) {
      ticket.assignedTeacher = userId;
    }

    ticket.messages.push({
      fromRole: role,
      fromUser: userId,
      text,
      attachment,
    });

    ticket.lastMessageAt = new Date();
    await ticket.save();

    // prune again just in case
    await pruneOldMessages(id);

    // ✅ return a fresh populated copy so UI immediately shows assignedTeacher name + attachments
    const fresh = await SupportTicket.findById(id)
      .populate("student", "name email role")
      .populate("assignedTeacher", "name email role")
      .populate("messages.fromUser", "name email role")
      .lean();

    res.json({ success: true, data: fresh });
  } catch (e) {
    next(e);
  }
}

// Teacher-only actions
export async function togglePin(req, res, next) {
  try {
    const teacherId = req.user.id;
    const { id } = req.params;

    const ticket = await SupportTicket.findOne({
      _id: id,
      $or: [{ assignedTeacher: null }, { assignedTeacher: teacherId }],
    });

    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });

    ticket.pinned = !ticket.pinned;
    await ticket.save();

    res.json({ success: true, data: ticket });
  } catch (e) {
    next(e);
  }
}

export async function toggleResolved(req, res, next) {
  try {
    const teacherId = req.user.id;
    const { id } = req.params;

    const ticket = await SupportTicket.findOne({
      _id: id,
      $or: [{ assignedTeacher: null }, { assignedTeacher: teacherId }],
    });

    if (!ticket) return res.status(404).json({ success: false, message: "Ticket not found" });

    ticket.resolved = !ticket.resolved;
    await ticket.save();

    res.json({ success: true, data: ticket });
  } catch (e) {
    next(e);
  }
}
