// src/modules/products/product.controller.js
import Supplier from "../suppliers/supplier.model.js";
import Product from "./product.model.js";
import { createProductSchema } from "./product.validators.js";
import { uploadBufferToCloudinary } from "../../utils/cloudinaryUpload.js";
import Category from "../categories/category.model.js";

// ✅ NEW imports
import mongoose from "mongoose";
import { sendProductRestockEmail } from "../../utils/mailer.js";

/* ---------------- HELPERS ---------------- */

async function ensureCategoryExists(name) {
  const raw = (name || "").trim();
  if (!raw) return false;

  const found = await Category.findOne({
    name: { $regex: new RegExp(`^${raw}$`, "i") },
  }).lean();

  return !!found;
}

async function uploadImages(req) {
  const files = req.files || [];
  const urls = [];

  for (const f of files) {
    const uploaded = await uploadBufferToCloudinary(f.buffer, "products");
    urls.push(uploaded.secure_url);
  }

  return urls;
}

// ✅ NEW: check if product became in stock, then email and clear notify list
async function notifyRestockIfBecameInStock(beforeDoc, afterDoc) {
  const wasOut = !!beforeDoc.outOfStock || Number(beforeDoc.quantity || 0) <= 0;
  const isNowIn = !afterDoc.outOfStock && Number(afterDoc.quantity || 0) > 0;
  const becameInStock = wasOut && isNowIn;

  if (!becameInStock) return;

  const notifyList = Array.isArray(afterDoc.restockNotifyUsers)
    ? afterDoc.restockNotifyUsers.slice()
    : [];

  if (notifyList.length === 0) return;

  // ✅ Clear list first (prevents duplicate emails if toggle happens again)
  await Product.updateOne(
    { _id: afterDoc._id },
    { $set: { restockNotifyUsers: [] } }
  );

  // Send emails best-effort
  for (const u of notifyList) {
    try {
      await sendProductRestockEmail({
        to: u.email,
        name: "", // optional
        productName: afterDoc.name,
        // productUrl: `http://localhost:5173/product/${afterDoc._id}`, // optional
      });
    } catch (err) {
      console.error("Restock email failed:", u.email, err?.message);
    }
  }
}

/* ---------------- SUPPLIER CREATE ---------------- */

export async function createProduct(req, res, next) {
  try {
    const parsed = createProductSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, errors: parsed.error });
    }

    const supplier = await Supplier.findOne({ userId: req.user.id });
    if (!supplier || supplier.status !== "approved") {
      return res
        .status(403)
        .json({ success: false, message: "Supplier not approved" });
    }

    if (!(await ensureCategoryExists(parsed.data.category))) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid category" });
    }

    const images = await uploadImages(req);

    const product = await Product.create({
      supplierId: supplier._id,
      createdBy: req.user.id,
      ...parsed.data,
      images,
    });

    res.status(201).json({ success: true, product });
  } catch (e) {
    next(e);
  }
}

/* ---------------- ADMIN CREATE ---------------- */

export async function createProductAdmin(req, res, next) {
  try {
    const parsed = createProductSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, errors: parsed.error });
    }

    if (!(await ensureCategoryExists(parsed.data.category))) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid category" });
    }

    const images = await uploadImages(req);

    const product = await Product.create({
      supplierId: null,
      createdBy: req.user.id,
      ...parsed.data,
      images,
    });

    res.status(201).json({ success: true, product });
  } catch (e) {
    next(e);
  }
}

/* ---------------- ADMIN LIST ---------------- */

export async function adminMyProducts(req, res, next) {
  try {
    const products = await Product.find({
      createdBy: req.user.id,
      supplierId: null,
    }).sort({ createdAt: -1 });

    res.json({ success: true, products });
  } catch (e) {
    next(e);
  }
}

/* ---------------- ✅ PUBLIC: NOTIFY ME ---------------- */
// User clicks "Notify Me" when out of stock.
// We store userId + signup email in product.restockNotifyUsers
export async function notifyMeWhenInStock(req, res, next) {
  try {
    const productId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid product id" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    const isOut = !!product.outOfStock || Number(product.quantity || 0) <= 0;
    if (!isOut) {
      return res
        .status(400)
        .json({ success: false, message: "Product is already in stock" });
    }

    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // ✅ Safely access User model regardless of export style
    let UserModel;
    try {
      UserModel = mongoose.model("User");
    } catch (err) {
      return res.status(500).json({
        success: false,
        message:
          "User model not registered. Ensure users/user.model.js is loaded at app startup.",
      });
    }

    const user = await UserModel.findById(userId).lean();
    if (!user?.email) {
      return res
        .status(400)
        .json({ success: false, message: "Your account email not found" });
    }

    const email = String(user.email).toLowerCase().trim();

    // prevent duplicate subscriptions
    const exists = (product.restockNotifyUsers || []).some(
      (x) => String(x.userId) === String(userId)
    );

    if (!exists) {
      product.restockNotifyUsers = product.restockNotifyUsers || [];
      product.restockNotifyUsers.push({ userId, email });
      await product.save();
    }

    return res.json({
      success: true,
      message: "You will be notified when the product is back in stock.",
    });
  } catch (e) {
    next(e);
  }
}

/* ---------------- ADMIN TOGGLES ---------------- */

export async function adminToggleStock(req, res, next) {
  try {
    // ✅ read BEFORE update (to detect transition)
    const before = await Product.findOne({
      _id: req.params.id,
      createdBy: req.user.id,
      supplierId: null,
    });

    if (!before) return res.status(404).json({ success: false });

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.id, supplierId: null },
      { outOfStock: !!req.body.outOfStock },
      { new: true }
    );

    if (!product) return res.status(404).json({ success: false });

    // ✅ If product became in-stock now -> email subscribers
    await notifyRestockIfBecameInStock(before, product);

    res.json({ success: true, product });
  } catch (e) {
    next(e);
  }
}

export async function adminToggleTrending(req, res, next) {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isTrending: !!req.body.isTrending },
      { new: true }
    );

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    res.json({ success: true, product });
  } catch (e) {
    next(e);
  }
}

/* ---------------- PUBLIC ---------------- */

export async function listPublicProducts(req, res, next) {
  try {
    const products = await Product.find({ status: "active" }).sort({
      createdAt: -1,
    });
    res.json({ success: true, products });
  } catch (e) {
    next(e);
  }
}

// ✅ ADMIN DELETE PRODUCT
export async function adminDeleteProduct(req, res, next) {
  try {
    const deleted = await Product.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user.id, // only admin who created it
      supplierId: null, // ensure admin product
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Product not found or not allowed",
      });
    }

    return res.json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (e) {
    next(e);
  }
}

// ✅ ADMIN: list ALL supplier-added products
export async function adminAllSupplierProducts(req, res, next) {
  try {
    const products = await Product.find({ supplierId: { $ne: null } })
      .populate({
        path: "supplierId",
        select: "shopName ownerName userId",
        populate: { path: "userId", select: "name email" },
      })
      .sort({ createdAt: -1 });

    res.json({ success: true, products });
  } catch (e) {
    next(e);
  }
}

/* ---------------- SUPPLIER LIST (MINE) ---------------- */

export async function supplierMyProducts(req, res, next) {
  try {
    const supplier = await Supplier.findOne({ userId: req.user.id }).lean();

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier profile not found",
      });
    }

    if (supplier.status !== "approved") {
      return res.status(403).json({
        success: false,
        message: "Supplier not approved / blocked",
      });
    }

    const products = await Product.find({ supplierId: supplier._id })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, products });
  } catch (e) {
    next(e);
  }
}
