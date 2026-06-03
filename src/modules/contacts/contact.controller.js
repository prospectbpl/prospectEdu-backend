import ContactRequest from "./contact.model.js";

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
const isPhone10 = (v) => /^[0-9]{10}$/.test(String(v || "").trim());

export async function createContactRequest(req, res, next) {
  try {
    const { name, email, phone, issue, message } = req.body;

    if (!name?.trim()) return res.status(400).json({ success: false, message: "Name required" });
    if (!isEmail(email)) return res.status(400).json({ success: false, message: "Valid email required" });
    if (!isPhone10(phone)) return res.status(400).json({ success: false, message: "Valid 10 digit phone required" });
    if (!issue?.trim()) return res.status(400).json({ success: false, message: "Issue required" });
    if (!message?.trim()) return res.status(400).json({ success: false, message: "Message required" });

    const created = await ContactRequest.create({ name, email, phone, issue, message });
    return res.status(201).json({ success: true, message: "Contact request submitted", data: created });
  } catch (e) {
    next(e);
  }
}

export async function adminListContactRequests(req, res, next) {
  try {
    const { status = "ALL", q = "" } = req.query;

    const filter = {};
    if (status !== "ALL") filter.status = status;

    if (q) {
      const rx = new RegExp(String(q).trim(), "i");
      filter.$or = [{ name: rx }, { email: rx }, { phone: rx }, { issue: rx }, { message: rx }];
    }

    const list = await ContactRequest.find(filter).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, count: list.length, data: list });
  } catch (e) {
    next(e);
  }
}

export async function adminUpdateContactStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = new Set(["PENDING", "IN_PROGRESS", "RESOLVED", "CLOSED"]);
    if (!allowed.has(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }
    const update = {
  status,
  closedAt: status === "CLOSED" ? new Date() : null,
};

const updated = await ContactRequest.findByIdAndUpdate(id, update, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: "Request not found" });

    return res.json({ success: true, message: "Status updated", data: updated });
  } catch (e) {
    next(e);
  }
}
