import mongoose from "mongoose";
import { User } from "../users/user.model.js";
import { ParentPayment } from "./parentPayment.model.js";

function summaryFromItems(items = []) {
  const total = items.reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const paid = items
    .filter((x) => x.status === "paid")
    .reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const pending = total - paid;

  const nextDueItem = items
    .filter((x) => x.status !== "paid")
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0];

  return {
    total,
    paid,
    pending,
    nextDue: nextDueItem ? nextDueItem.dueDate : null,
  };
}

async function getOrCreateParentPayment(parentUserId) {
  return ParentPayment.findOneAndUpdate(
    { parentUserId },
    { $setOnInsert: { parentUserId, items: [] } },
    { new: true, upsert: true }
  );
}

/**
 * TEACHER: list parents + their current dues
 * GET /api/v1/payments/teacher/parents?q=
 */
export async function teacherListParentsPayments(req, res, next) {
  try {
    const q = String(req.query.q || "").trim();

    const filter = { role: "parent" };
    if (q) {
      filter.$or = [
        { fullName: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { phone: { $regex: q, $options: "i" } },
      ];
    }

    const parents = await User.find(filter)
      .sort({ createdAt: -1 })
      .select("_id fullName email phone")
      .lean();

    const ids = parents.map((p) => p._id);
    const paymentDocs = await ParentPayment.find({ parentUserId: { $in: ids } })
      .select("parentUserId items lastUpdatedAt lastUpdatedByTeacherId")
      .lean();

    const paymentMap = new Map(paymentDocs.map((d) => [String(d.parentUserId), d]));

    const rows = parents.map((p) => {
      const pay = paymentMap.get(String(p._id));
      const items = pay?.items || [];
      return {
        parent: p,
        items,
        summary: summaryFromItems(items),
        lastUpdatedAt: pay?.lastUpdatedAt || null,
      };
    });

    return res.json({ success: true, parents: rows });
  } catch (e) {
    next(e);
  }
}

/**
 * TEACHER: add a fee item
 * POST /api/v1/payments/teacher/parents/:parentId/items
 * body: { title, amount, dueDate }
 */
export async function teacherAddFeeItem(req, res, next) {
  try {
    const { parentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(parentId)) {
      return res.status(400).json({ success: false, message: "Invalid parentId" });
    }

    const parent = await User.findOne({ _id: parentId, role: "parent" }).select("_id");
    if (!parent) return res.status(404).json({ success: false, message: "Parent not found" });

    const title = String(req.body?.title || "").trim();
    const amount = Number(req.body?.amount || 0);
    const dueDateRaw = req.body?.dueDate;

    if (!title) return res.status(422).json({ success: false, message: "Fee title is required" });
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(422).json({ success: false, message: "Valid amount is required" });
    }

    const dueDate = new Date(dueDateRaw);
    if (String(dueDate) === "Invalid Date") {
      return res.status(422).json({ success: false, message: "Valid dueDate is required" });
    }

    const doc = await getOrCreateParentPayment(parentId);

    doc.items.unshift({
      title,
      amount,
      dueDate,
      status: "pending",
      paidAt: null,
      updatedBy: req.user.id,
    });

    doc.lastUpdatedByTeacherId = req.user.id;
    doc.lastUpdatedAt = new Date();
    await doc.save();

    return res.json({
      success: true,
      message: "Fee added",
      items: doc.items,
      summary: summaryFromItems(doc.items),
    });
  } catch (e) {
    next(e);
  }
}

/**
 * TEACHER: update fee item (title/amount/dueDate/status)
 * PATCH /api/v1/payments/teacher/parents/:parentId/items/:itemId
 */
export async function teacherUpdateFeeItem(req, res, next) {
  try {
    const { parentId, itemId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(parentId) || !mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ success: false, message: "Invalid id(s)" });
    }

    const doc = await getOrCreateParentPayment(parentId);
    const item = doc.items.id(itemId);
    if (!item) return res.status(404).json({ success: false, message: "Fee item not found" });

    if (req.body?.title !== undefined) item.title = String(req.body.title || "").trim();
    if (req.body?.amount !== undefined) item.amount = Number(req.body.amount || 0);
    if (req.body?.dueDate !== undefined) item.dueDate = new Date(req.body.dueDate);

    if (req.body?.status !== undefined) {
      const st = String(req.body.status);
      if (!["pending", "paid"].includes(st)) {
        return res.status(422).json({ success: false, message: "Invalid status" });
      }
      item.status = st;
      item.paidAt = st === "paid" ? new Date() : null;
    }

    item.updatedBy = req.user.id;

    doc.lastUpdatedByTeacherId = req.user.id;
    doc.lastUpdatedAt = new Date();
    await doc.save();

    return res.json({
      success: true,
      message: "Fee updated",
      items: doc.items,
      summary: summaryFromItems(doc.items),
    });
  } catch (e) {
    next(e);
  }
}

/**
 * TEACHER: remove fee item (optional but useful)
 * DELETE /api/v1/payments/teacher/parents/:parentId/items/:itemId
 */
export async function teacherRemoveFeeItem(req, res, next) {
  try {
    const { parentId, itemId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(parentId) || !mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ success: false, message: "Invalid id(s)" });
    }

    const doc = await getOrCreateParentPayment(parentId);
    const item = doc.items.id(itemId);
    if (!item) return res.status(404).json({ success: false, message: "Fee item not found" });

    item.deleteOne();

    doc.lastUpdatedByTeacherId = req.user.id;
    doc.lastUpdatedAt = new Date();
    await doc.save();

    return res.json({
      success: true,
      message: "Fee removed",
      items: doc.items,
      summary: summaryFromItems(doc.items),
    });
  } catch (e) {
    next(e);
  }
}

/**
 * PARENT: get my dues (no history)
 * GET /api/v1/payments/parent/me
 */
export async function parentGetMyPayments(req, res, next) {
  try {
    const parentUserId = req.user.id;

    const doc = await getOrCreateParentPayment(parentUserId);
    const items = doc.items || [];

    return res.json({
      success: true,
      items,
      summary: summaryFromItems(items),
    });
  } catch (e) {
    next(e);
  }
}
