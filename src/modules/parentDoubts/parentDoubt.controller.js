import ParentDoubt from "./parentDoubt.model.js";

const TEN_DAYS_MS = 10 * 24 * 60 * 60 * 1000;
const cutoffDate = () => new Date(Date.now() - TEN_DAYS_MS);

/* =======================
   PARENT
======================= */

export async function createParentDoubt(req, res, next) {
  try {
    const parentId = req.user.id;
    const { subject, message, category, priority } = req.body;

    if (!subject || subject.trim().length < 3)
      return res.status(400).json({ message: "Subject is required" });

    if (!message || message.trim().length < 5)
      return res.status(400).json({ message: "Message is required" });

    const doubt = await ParentDoubt.create({
      parent: parentId,
      subject,
      message,
      category: category || "General",
      priority: priority || "MEDIUM",
    });

    res.status(201).json({
      success: true,
      message: "Doubt submitted to teachers",
      data: doubt,
    });
  } catch (err) {
    next(err);
  }
}

export async function getParentDoubts(req, res, next) {
  try {
    const doubts = await ParentDoubt.find({
      parent: req.user.id,
      createdAt: { $gte: cutoffDate() }, // ✅ hide older than 10 days immediately
    })
      .populate("answeredBy", "name email")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: doubts });
  } catch (err) {
    next(err);
  }
}

/* =======================
   TEACHER
======================= */

export async function getTeacherDoubts(req, res, next) {
  try {
    const doubts = await ParentDoubt.find({
      createdAt: { $gte: cutoffDate() }, // ✅ hide older than 10 days immediately
    })
      .populate("parent", "name email")
      .populate("answeredBy", "name email")
      .sort({ status: 1, createdAt: -1 }); // OPEN first

    res.json({ success: true, data: doubts });
  } catch (err) {
    next(err);
  }
}

export async function answerParentDoubt(req, res, next) {
  try {
    const { id } = req.params;
    const { answer } = req.body;

    if (!answer || answer.trim().length < 2)
      return res.status(400).json({ message: "Answer is required" });

    // ✅ prevent answering an expired doubt (older than 10 days)
    const doubt = await ParentDoubt.findOne({
      _id: id,
      createdAt: { $gte: cutoffDate() },
    });

    if (!doubt) return res.status(404).json({ message: "Doubt not found (expired)" });

    // optional: lock if already answered
    if (doubt.status === "ANSWERED") {
      return res.status(400).json({ message: "This doubt is already answered." });
    }

    doubt.answer = answer;
    doubt.status = "ANSWERED";
    doubt.answeredBy = req.user.id;
    doubt.answeredAt = new Date();

    const updated = await doubt.save();

    await updated.populate("parent", "name email");
    await updated.populate("answeredBy", "name email");

    res.json({
      success: true,
      message: "Answer sent to parent",
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}
