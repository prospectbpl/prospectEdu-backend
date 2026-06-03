// src/modules/donations/donation.controller.js
import crypto from "crypto";
import Razorpay from "razorpay";
import Donation from "./donation.model.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
const isMobile = (v) => /^[0-9]{10}$/.test(String(v || "").trim());

/**
 * STEP 1: Create Razorpay Order + Donation (CREATED)
 */
export async function createRazorpayDonationOrder(req, res, next) {
  try {
    const {
      amount,
      currency = "INR",
      firstName,
      lastName,
      email,
      mobile,
      address,
      city,
      state,
      postalCode,
      country,
      pan = "",
    } = req.body;

    if (!amount || Number(amount) <= 0)
      return res.status(400).json({ success: false, message: "Valid amount is required" });

    if (!firstName || !lastName)
      return res.status(400).json({ success: false, message: "Name is required" });

    if (!isEmail(email))
      return res.status(400).json({ success: false, message: "Valid email is required" });

    if (!isMobile(mobile))
      return res.status(400).json({ success: false, message: "Valid mobile is required" });

    if (!address || !city || !state || !postalCode || !country)
      return res.status(400).json({ success: false, message: "Full address is required" });

    // 1️⃣ Create donation (CREATED)
    const donation = await Donation.create({
      amount: Number(amount),
      currency,
      firstName,
      lastName,
      email,
      mobile,
      address,
      city,
      state,
      postalCode,
      country,
      pan,
      status: "CREATED",
    });

    // 2️⃣ Create Razorpay order
    const order = await razorpay.orders.create({
      amount: Number(amount) * 100, // paise
      currency,
      receipt: `don_${donation._id}`,
    });

    donation.razorpayOrderId = order.id;
    await donation.save();

  return res.status(201).json({
  success: true,
  data: {
    donationId: donation._id,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: process.env.RAZORPAY_KEY_ID, // ✅ add this line
  },
});


  } catch (e) {
    next(e);
  }
}

/**
 * STEP 2: Verify payment
 */
export async function verifyRazorpayDonationPayment(req, res, next) {
  try {
    const { donationId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const donation = await Donation.findById(donationId);
    if (!donation)
      return res.status(404).json({ success: false, message: "Donation not found" });

    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expected !== razorpay_signature) {
      donation.status = "FAILED";
      await donation.save();
      return res.status(400).json({ success: false, message: "Payment verification failed" });
    }

    donation.status = "CONFIRMED";
    donation.razorpayPaymentId = razorpay_payment_id;
    donation.razorpaySignature = razorpay_signature;
    await donation.save();

    return res.json({ success: true, data: donation });
  } catch (e) {
    next(e);
  }
}

/**
 * ADMIN: list donations
 */
export async function adminListDonations(req, res, next) {
  try {
    const list = await Donation.find().sort({ createdAt: -1 }).lean();
    return res.json({ success: true, count: list.length, data: list });
  } catch (e) {
    next(e);
  }
}

/**
 * PUBLIC: donation confirmation pagecreateRazorpayDonationOrder
 */
export async function getDonationById(req, res, next) {
  try {
    const donation = await Donation.findById(req.params.id).lean();
    if (!donation)
      return res.status(404).json({ success: false, message: "Donation not found" });

    return res.json({ success: true, data: donation });
  } catch (e) {
    next(e);
  }
}
