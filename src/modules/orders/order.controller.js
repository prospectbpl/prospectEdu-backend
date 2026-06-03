import Order from "./order.model.js";
import Product from "../products/product.model.js";
import Supplier from "../suppliers/supplier.model.js";

const makeOrderId = () => "ORD" + Math.floor(10000 + Math.random() * 90000);

const reserveStatuses = new Set(["CONFIRMED", "ON_THE_WAY", "DELIVERED"]);
const releaseStatuses = new Set(["REJECTED", "CANCELED"]);

const allowedStatuses = ["ORDER_RECEIVED", "CONFIRMED", "ON_THE_WAY", "CANCELED", "REJECTED", "DELIVERED"];

export async function createOrder(req, res, next) {
  try {
    const userId = req.user.id;
    const { items, address } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Order items required" });
    }
    if (!address?.name || !address?.phone || !address?.address || !address?.pincode) {
      return res.status(400).json({ success: false, message: "Address required" });
    }

    const orderItems = [];
    let totalMRP = 0;
    let totalPrice = 0;

    for (const it of items) {
      const product = await Product.findById(it.productId).lean();
      if (!product) {
        return res.status(404).json({ success: false, message: "Product not found" });
      }

      const qty = Math.max(1, Number(it.quantity || 1));
      const mrp = Number(product.price || 0);
      const offer = Number(product.offerPrice ?? product.price ?? 0);

      totalMRP += mrp * qty;
      totalPrice += offer * qty;

      const isSupplierProduct = !!product.supplierId;

      orderItems.push({
        productId: product._id,
        supplierId: isSupplierProduct ? product.supplierId : null,
        productOwner: isSupplierProduct ? "SUPPLIER" : "ADMIN",

        title: product.name,
        img: product.images?.[0] || "",
        price: offer,
        quantity: qty,
        status: "CONFIRMED",
      });
    }

    const discount = totalMRP - totalPrice;
    const shipping = totalPrice < 1000 ? 99 : 0;
    const grandTotal = totalPrice + shipping;

    let orderId = makeOrderId();
    for (let i = 0; i < 5; i++) {
      const exists = await Order.findOne({ orderId }).lean();
      if (!exists) break;
      orderId = makeOrderId();
    }

    const doc = await Order.create({
      orderId,
      userId,
      items: orderItems,
      address,
      totalMRP,
      totalPrice,
      discount,
      shipping,
      grandTotal,
    });

    return res.status(201).json({ success: true, message: "Order placed", order: doc });
  } catch (err) {
    next(err);
  }
}

// ✅ User: My Orders
export async function myOrders(req, res, next) {
  try {
    const orders = await Order.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, orders });
  } catch (err) {
    next(err);
  }
}

// ✅ Supplier: Orders list (only supplier items)
export async function supplierOrders(req, res, next) {
  try {
    const supplier = await Supplier.findOne({ userId: req.user.id }).lean();
    if (!supplier) {
      return res.status(404).json({ success: false, message: "Supplier profile not found" });
    }

        // ✅ BLOCK/REJECT CHECK
    if (supplier.status !== "approved") {
      return res.status(403).json({
        success: false,
        message: "Supplier not approved / blocked",
      });
    }


    const allOrders = await Order.find({ "items.supplierId": supplier._id })
      .sort({ createdAt: -1 })
      .lean();

    const orders = allOrders.map((o) => ({
      ...o,
      items: (o.items || []).filter((it) => String(it.supplierId) === String(supplier._id)),
    }));

    return res.json({ success: true, orders });
  } catch (err) {
    next(err);
  }
}

// ✅ Supplier: Update status of supplier item
export async function updateItemStatus(req, res, next) {
  try {
    const supplier = await Supplier.findOne({ userId: req.user.id }).lean();
    if (!supplier) {
      return res.status(404).json({ success: false, message: "Supplier profile not found" });
    }

        // ✅ BLOCK/REJECT CHECK
    if (supplier.status !== "approved") {
      return res.status(403).json({
        success: false,
        message: "Supplier not approved / blocked",
      });
    }


    const { itemId } = req.params;
    const { status } = req.body;

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const order = await Order.findOne({ "items._id": itemId });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order item not found" });
    }

    const item = order.items.id(itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    // ✅ supplier only & only supplier products
    if (item.productOwner !== "SUPPLIER") {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }
    if (String(item.supplierId) !== String(supplier._id)) {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }

    const oldStatus = item.status;
    const oldIsReserved = reserveStatuses.has(oldStatus);
    const newIsReserved = reserveStatuses.has(status);

    item.status = status;

    if (item.productId) {
      const product = await Product.findById(item.productId);
      if (product) {
        const qty = Number(item.quantity || 1);
        const currentQty = Number(product.quantity || 0);

        if (!oldIsReserved && newIsReserved) {
          product.quantity = Math.max(0, currentQty - qty);
        }
        if (oldIsReserved && releaseStatuses.has(status)) {
          product.quantity = currentQty + qty;
        }

        product.outOfStock = Number(product.quantity || 0) <= 0;
        await product.save();
      }
    }

    await order.save();

    return res.json({
      success: true,
      message: "Status updated",
      orderId: order.orderId,
      itemId,
      status,
    });
  } catch (err) {
    next(err);
  }
}

// ✅ Supplier Dashboard stats
export async function supplierStats(req, res, next) {
  try {
    const supplier = await Supplier.findOne({ userId: req.user.id }).lean();
    if (!supplier) {
      return res.status(404).json({ success: false, message: "Supplier profile not found" });
    }
        // ✅ BLOCK/REJECT CHECK
    if (supplier.status !== "approved") {
      return res.status(403).json({
        success: false,
        message: "Supplier not approved / blocked",
      });
    }


    const orders = await Order.find({ "items.supplierId": supplier._id }).lean();

    let totalOrders = 0;
    let pendingOrders = 0;
    let totalRevenue = 0;

    for (const o of orders) {
      for (const it of o.items || []) {
        if (String(it.supplierId) !== String(supplier._id)) continue;

        totalOrders += 1;

        if (["ORDER_RECEIVED", "CONFIRMED", "ON_THE_WAY"].includes(it.status)) {
          pendingOrders += 1;
        }

        if (!["CANCELED", "REJECTED"].includes(it.status)) {
          totalRevenue += Number(it.price || 0) * Number(it.quantity || 0);
        }
      }
    }

    return res.json({
      success: true,
      stats: { totalOrders, pendingOrders, totalRevenue },
    });
  } catch (err) {
    next(err);
  }
}

// ✅ USER: single order
export async function getMyOrderByOrderId(req, res, next) {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({
      orderId,
      userId: req.user.id,
    }).lean();

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    return res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
}

/* =========================
   ✅ ADMIN ENDPOINTS
   ========================= */

// ✅ Admin: all orders
export async function adminAllOrders(req, res, next) {
  try {
    const orders = await Order.find({})
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, orders });
  } catch (err) {
    next(err);
  }
}

// ✅ Admin: single order by orderId
export async function adminGetOrderByOrderId(req, res, next) {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({ orderId }).lean();
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    return res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
}

// ✅ Admin: update status ONLY for ADMIN product items
export async function adminUpdateItemStatus(req, res, next) {
  try {
    const { itemId } = req.params;
    const { status } = req.body;

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const order = await Order.findOne({ "items._id": itemId });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order item not found" });
    }

    const item = order.items.id(itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    // ✅ only admin products
    if (item.productOwner !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Status update allowed only for ADMIN products" });
    }

    const oldStatus = item.status;
    const oldIsReserved = reserveStatuses.has(oldStatus);
    const newIsReserved = reserveStatuses.has(status);

    item.status = status;

    // stock logic
    if (item.productId) {
      const product = await Product.findById(item.productId);
      if (product) {
        const qty = Number(item.quantity || 1);
        const currentQty = Number(product.quantity || 0);

        if (!oldIsReserved && newIsReserved) {
          product.quantity = Math.max(0, currentQty - qty);
        }
        if (oldIsReserved && releaseStatuses.has(status)) {
          product.quantity = currentQty + qty;
        }

        product.outOfStock = Number(product.quantity || 0) <= 0;
        await product.save();
      }
    }

    await order.save();

    return res.json({
      success: true,
      message: "Status updated",
      orderId: order.orderId,
      itemId,
      status,
    });
  } catch (err) {
    next(err);
  }
}
export async function adminOrderStats(req, res, next) {
  try {
    const now = new Date();

    // last 24h window
    const last24hStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const prev24hStart = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    // We count "order items" (because table also item-wise flatten hoti hai)
    const orders = await Order.find(
      { createdAt: { $gte: prev24hStart } },
      { createdAt: 1, items: 1 }
    ).lean();

    let totalItems = 0;

    let newItems = 0;
    let prevNewItems = 0;

    let completedItems = 0;
    let prevCompletedItems = 0;

    let cancelledItems = 0;
    let prevCancelledItems = 0;

    for (const o of orders) {
      const inLast24 = o.createdAt >= last24hStart;
      const inPrev24 = o.createdAt >= prev24hStart && o.createdAt < last24hStart;

      const itemsCount = (o.items || []).length;

      // total across ALL time needs separate query; so we calculate totalItems via countDocuments + items length.
      // We'll do a fast totalItems calculation below. Here only last48h is used for change.
      if (inLast24) newItems += itemsCount;
      if (inPrev24) prevNewItems += itemsCount;

      for (const it of o.items || []) {
        const st = String(it.status || "").toUpperCase();

        if (inLast24) {
          if (st === "DELIVERED") completedItems += 1;
          if (st === "CANCELED" || st === "REJECTED") cancelledItems += 1;
        }

        if (inPrev24) {
          if (st === "DELIVERED") prevCompletedItems += 1;
          if (st === "CANCELED" || st === "REJECTED") prevCancelledItems += 1;
        }
      }
    }

    // ✅ Total items across all orders (accurate)
    const allOrders = await Order.find({}, { items: 1 }).lean();
    for (const o of allOrders) totalItems += (o.items || []).length;

    const pct = (curr, prev) => {
      if (prev === 0 && curr === 0) return "0%";
      if (prev === 0 && curr > 0) return "+100%";
      const v = ((curr - prev) / prev) * 100;
      const sign = v >= 0 ? "+" : "";
      return `${sign}${v.toFixed(1)}%`;
    };

    return res.json({
      success: true,
      stats: {
        totalOrders: { value: totalItems, change: null },

        newOrders: { value: newItems, change: pct(newItems, prevNewItems) },

        completedOrders: {
          value: completedItems,
          change: pct(completedItems, prevCompletedItems),
        },

        cancelledOrders: {
          value: cancelledItems,
          change: pct(cancelledItems, prevCancelledItems),
        },
      },
    });
  } catch (err) {
    next(err);
  }
}
