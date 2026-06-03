import { applySupplierSchema, updateSupplierSchema } from "./supplier.validators.js";
import * as SupplierService from "./supplier.service.js";

export const getMe = async (req, res, next) => {
  try {
    const supplier = await SupplierService.getMySupplierProfile(req.user.id);
    if (!supplier) return res.json({ exists: false });
    res.json({ exists: true, ...supplier.toObject() });
  } catch (e) {
    next(e);
  }
};

// ✅ NEW: status endpoint (NO direct Supplier usage, so no "Supplier is not defined")
export const myStatus = async (req, res, next) => {
  try {
    const supplier = await SupplierService.getMySupplierProfile(req.user.id);
    if (!supplier) return res.json({ success: true, supplierStatus: "none", supplier: null });

    return res.json({
      success: true,
      supplierStatus: supplier.status, // pending | approved | rejected
      supplier,
    });
  } catch (e) {
    next(e);
  }
};

export const apply = async (req, res, next) => {
  try {
    const data = applySupplierSchema.parse(req.body);
    await SupplierService.applySupplier(req.user.id, data);
    res.status(201).json({ message: "Application submitted" });
  } catch (e) {
    next(e);
  }
};

export const list = async (req, res, next) => {
  try {
    const suppliers = await SupplierService.listApplications(req.query.status);
    res.json(suppliers);
  } catch (e) {
    next(e);
  }
};

export const approve = async (req, res, next) => {
  try {
    const supplier = await SupplierService.approveSupplier(req.params.id, req.user.id);
    res.json({ message: "Supplier approved", supplier });
  } catch (e) {
    next(e);
  }
};

export const reject = async (req, res, next) => {
  try {
    const supplier = await SupplierService.rejectSupplier(req.params.id, req.user.id, req.body.reviewNote);
    res.json({ message: "Supplier rejected", supplier });
  } catch (e) {
    next(e);
  }
};

// ✅ NEW: block
export const block = async (req, res, next) => {
  try {
    const supplier = await SupplierService.blockSupplier(req.params.id, req.user.id, req.body.reviewNote);
    res.json({ message: "Supplier blocked", supplier });
  } catch (e) {
    next(e);
  }
};

// ✅ NEW: unblock
export const unblock = async (req, res, next) => {
  try {
    const supplier = await SupplierService.unblockSupplier(req.params.id, req.user.id, req.body.reviewNote);
    res.json({ message: "Supplier unblocked", supplier });
  } catch (e) {
    next(e);
  }
};

export const updateMe = async (req, res, next) => {
  try {
    const data = updateSupplierSchema.parse(req.body);
    const updated = await SupplierService.updateMySupplierProfile(req.user.id, data);

    res.json({
      success: true,
      message: "Profile updated successfully",
      supplier: updated,
    });
  } catch (e) {
    next(e);
  }
};
