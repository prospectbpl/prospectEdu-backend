// src/modules/payments/razorpay.controller.js
import Razorpay from "razorpay";
import crypto from "crypto";
import Order from "../orders/order.model.js";
import Product from "../products/product.model.js";

// ✅ add these imports for test series payments
import TestSeries from "../testSeries/testSeries.model.js";
import TestPurchase from "../testPurchase/testPurchase.model.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

function makeOrderId() {
  return `ORD-${Date.now()}`;
}

function getUserId(req) {
  return (
    req.user?._id ||
    req.user?.id ||
    req.userId ||
    req.decoded?.sub ||
    req.decoded?.id ||
    req.decoded?._id ||
    req.auth?.sub ||
    req.auth?.id ||
    req.auth?._id ||
    req.user?.sub
  );
}

// ✅ Debug controller (works in Postman)
export const debugAuth = async (req, res) => {
  return res.json({
    success: true,
    message: "Auth OK",
    userId: getUserId(req),
    hasAuthHeader: Boolean(req.headers.authorization),
    decoded: req.decoded || req.auth || null,
    reqUser: req.user || null,
    reqUserId: req.userId || null,
  });
};

// =========================
// ✅ ECOMMERCE ORDER (existing)
// =========================
export const createRazorpayOrder = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { items, address } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized (userId not found)",
      });
    }

    if (!items?.length) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    if (!address?.name || !address?.phone || !address?.address) {
      return res.status(400).json({ success: false, message: "Address missing" });
    }

    const productIds = items.map((i) => i.productId);
    const products = await Product.find({ _id: { $in: productIds } }).lean();

    if (!products?.length) {
      return res.status(400).json({ success: false, message: "Products not found" });
    }

    const map = new Map(products.map((p) => [String(p._id), p]));

    const orderItems = items.map((i) => {
      const p = map.get(String(i.productId));
      if (!p) throw new Error(`Product not found: ${i.productId}`);

      const qty = Number(i.quantity || 1);

      const title = p.name;
      const mrp = Number(p.price);
      const selling = Number(p.offerPrice ?? p.price);

      const supplierId = p.supplierId || null;
      const productOwner = supplierId ? "SUPPLIER" : "ADMIN";

      const img =
        Array.isArray(p.images) && p.images.length
          ? p.images[0]?.url || p.images[0] || ""
          : "";

      if (!title) throw new Error("Product name missing in DB");
      if (!mrp) throw new Error("Product price (MRP) missing in DB");
      if (!selling) throw new Error("Product offerPrice/price missing in DB");

      return {
        productId: p._id,
        supplierId,
        productOwner,
        title,
        img,
        price: selling,
        quantity: qty,
      };
    });

    const totalMRP = orderItems.reduce((sum, it) => sum + mrpFromItem(it, map), 0);
    const totalPrice = orderItems.reduce((sum, it) => sum + it.price * it.quantity, 0);
    const discount = totalMRP - totalPrice;

    const shipping = totalPrice < 1000 ? 99 : 0;
    const grandTotal = totalPrice + shipping;

    const amountInPaise = Math.round(grandTotal * 100);

    const localOrder = await Order.create({
      userId,
      orderId: makeOrderId(),
      items: orderItems,
      address,
      totalMRP,
      totalPrice,
      discount,
      shipping,
      grandTotal,
    });

    const rzOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `rcpt_${String(localOrder._id).slice(-18)}`, // ✅ always short
      notes: {
        localOrderId: String(localOrder._id),
        userId: String(userId),
      },
    });

    localOrder.razorpayOrderId = rzOrder.id;
    await localOrder.save();

    return res.json({
      success: true,
      data: {
        keyId: process.env.RAZORPAY_KEY_ID,
        razorpayOrderId: rzOrder.id,
        amount: rzOrder.amount,
        currency: rzOrder.currency,
        localOrderId: String(localOrder._id),
        grandTotal,
      },
    });
  } catch (err) {
    next(err);
  }
};

function mrpFromItem(item, map) {
  const p = map.get(String(item.productId));
  const mrp = Number(p?.price || item.price);
  return mrp * Number(item.quantity || 1);
}

export const verifyRazorpayPayment = async (req, res, next) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      localOrderId,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !localOrderId) {
      return res.status(400).json({ success: false, message: "Missing payment details" });
    }

    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expected !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Invalid payment signature" });
    }

    const order = await Order.findById(localOrderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    order.razorpayPaymentId = razorpay_payment_id;
    order.razorpaySignature = razorpay_signature;

    order.items = (order.items || []).map((it) => ({
      ...((typeof it.toObject === "function") ? it.toObject() : it),
      status: "CONFIRMED",
    }));

    order.paymentStatus = "PAID";
    order.status = "CONFIRMED";
    await order.save();

    return res.json({
      success: true,
      data: {
        orderId: String(order._id),
        status: order.status,
        paymentStatus: order.paymentStatus,
      },
    });
  } catch (err) {
    next(err);
  }
};

// =========================
// ✅ TEST SERIES (NEW)
// =========================

// ✅ Create Razorpay order for test series
export const createRazorpayOrderTestSeries = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { testSeriesId } = req.body;

    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    if (!testSeriesId) return res.status(400).json({ success: false, message: "testSeriesId required" });

    const series = await TestSeries.findById(testSeriesId).lean();
    if (!series || !series.isPublished) {
      return res.status(404).json({ success: false, message: "Test series not found" });
    }

    const amount = Math.round(Number(series.price || 0) * 100);
    if (amount <= 0) {
      return res.status(400).json({ success: false, message: "This series is free. No payment needed." });
    }

    // ✅ receipt MUST be <= 40 chars
    const receipt = `ts_${Date.now()}`; // length ~ 16

    const rzOrder = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt,
      notes: {
        userId: String(userId),
        testSeriesId: String(testSeriesId),
        title: String(series.title || "").slice(0, 25),
      },
    });

    return res.json({
      success: true,
      data: {
        keyId: process.env.RAZORPAY_KEY_ID,
        razorpayOrderId: rzOrder.id,
        amount: rzOrder.amount,
        currency: rzOrder.currency,
        testSeriesId: String(testSeriesId),
        title: series.title,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ✅ Verify test series payment and save purchase (shows in admin collection)
export const verifyRazorpayPaymentTestSeries = async (req, res, next) => {
  try {
    const userId = getUserId(req);

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      testSeriesId,
    } = req.body;

    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !testSeriesId) {
      return res.status(400).json({ success: false, message: "Missing payment details" });
    }

    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expected !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Invalid payment signature" });
    }

    const series = await TestSeries.findById(testSeriesId).lean();
    if (!series || !series.isPublished) {
      return res.status(404).json({ success: false, message: "Test series not found" });
    }

    const amountPaid = Number(series.price || 0);

    const doc = await TestPurchase.findOneAndUpdate(
      { user: userId, testSeries: testSeriesId },
      {
        $set: {
          status: "PAID",
          provider: "RAZORPAY",
          amountPaid,
          transactionId: razorpay_payment_id,

          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
        },
      },
      { upsert: true, new: true }
    );

    return res.json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
};
