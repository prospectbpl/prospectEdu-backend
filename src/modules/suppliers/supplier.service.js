import Supplier from "./supplier.model.js";
import { User } from "../users/user.model.js";

export const getMySupplierProfile = async (userId) => {
  return Supplier.findOne({ userId });
};

export const applySupplier = async (userId, data) => {
  const exists = await Supplier.findOne({ userId });
  if (exists) throw new Error("Supplier application already exists");
  return Supplier.create({ userId, ...data });
};

// ✅ FIXED populate: user has fullName not name
export const listApplications = async (status) => {
  const q = status ? { status } : {};
  return Supplier.find(q).populate("userId", "fullName email phone role isActive");
};

export const approveSupplier = async (supplierId, adminId) => {
  const supplier = await Supplier.findById(supplierId);
  if (!supplier) throw new Error("Supplier not found");

  supplier.status = "approved";
  supplier.reviewedBy = adminId;
  supplier.reviewNote = undefined;
  await supplier.save();

  await User.findByIdAndUpdate(supplier.userId, { role: "supplier" });
  return supplier;
};

export const rejectSupplier = async (supplierId, adminId, note) => {
  const supplier = await Supplier.findById(supplierId);
  if (!supplier) throw new Error("Supplier not found");

  supplier.status = "rejected";
  supplier.reviewedBy = adminId;
  supplier.reviewNote = note || "Rejected by admin";
  await supplier.save();

  // optional: role downgrade if you want blocked person not treated as supplier
  await User.findByIdAndUpdate(supplier.userId, { role: "user" });

  return supplier;
};

// ✅ NEW: Block (sets rejected + downgrade role)
export const blockSupplier = async (supplierId, adminId, note) => {
  const supplier = await Supplier.findById(supplierId);
  if (!supplier) throw new Error("Supplier not found");

  supplier.status = "rejected";
  supplier.reviewedBy = adminId;
  supplier.reviewNote = note || "Blocked by admin";
  await supplier.save();

  await User.findByIdAndUpdate(supplier.userId, { role: "user" });

  return supplier;
};

// ✅ NEW: Unblock (sets approved + upgrade role)
export const unblockSupplier = async (supplierId, adminId, note) => {
  const supplier = await Supplier.findById(supplierId);
  if (!supplier) throw new Error("Supplier not found");

  supplier.status = "approved";
  supplier.reviewedBy = adminId;
  supplier.reviewNote = note || "Unblocked by admin";
  await supplier.save();

  await User.findByIdAndUpdate(supplier.userId, { role: "supplier" });

  return supplier;
};

export const updateMySupplierProfile = async (userId, data) => {
  const supplier = await Supplier.findOne({ userId });
  if (!supplier) throw new Error("Supplier profile not found");

  if (data.shopName !== undefined) supplier.shopName = data.shopName;
  if (data.ownerName !== undefined) supplier.ownerName = data.ownerName;
  if (data.phone !== undefined) supplier.phone = data.phone;
  if (data.categories !== undefined) supplier.categories = data.categories;

  if (data.pickupAddress) {
    supplier.pickupAddress = { ...supplier.pickupAddress, ...data.pickupAddress };
  }
  if (data.bank) {
    supplier.bank = { ...supplier.bank, ...data.bank };
  }

  await supplier.save();
  return supplier;
};
