import mongoose from "mongoose";
import Cart from "./cart.model.js";
import Product from "../products/product.model.js";

const isValidObjectId = (v) => mongoose.Types.ObjectId.isValid(String(v));

const getUserId = (req) => {
  const id = req?.user?.id || req?.user?._id || req?.userId || null;
  return id ? String(id) : null;
};

async function getOrCreateCart(userId) {
  let cart = await Cart.findOne({ userId });
  if (!cart) cart = await Cart.create({ userId, items: [] });
  return cart;
}

export async function getMyCart(req, res, next) {
  try {
    const userId = getUserId(req);
    if (!userId || !isValidObjectId(userId)) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const cart = await getOrCreateCart(userId);
    await cart.populate("items.productId");

    return res.status(200).json({ success: true, cart });
  } catch (err) {
    next(err);
  }
}

export async function addCartItem(req, res, next) {
  try {
    const userId = getUserId(req);
    if (!userId || !isValidObjectId(userId)) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { productId, quantity = 1 } = req.body;

    if (!productId || !isValidObjectId(productId)) {
      return res
        .status(400)
        .json({ success: false, message: "Valid productId is required" });
    }

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty < 1) {
      return res
        .status(400)
        .json({ success: false, message: "quantity must be >= 1" });
    }

    const product = await Product.findById(productId).lean();
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    const cart = await getOrCreateCart(userId);

    const idx = cart.items.findIndex(
      (it) => String(it.productId) === String(productId)
    );

    const snapTitle = product?.name || product?.title || "";
    const snapImg =
      (Array.isArray(product?.images) && product.images[0]) ||
      product?.image ||
      "";
    const snapPrice = Number(product?.offerPrice ?? product?.price ?? 0);
    const snapOldPrice = Number(product?.price ?? 0);

    if (idx >= 0) {
      cart.items[idx].quantity += qty;
      cart.items[idx].title = snapTitle;
      cart.items[idx].img = snapImg;
      cart.items[idx].price = snapPrice;
      cart.items[idx].oldPrice = snapOldPrice;
    } else {
      cart.items.push({
        productId,
        quantity: qty,
        title: snapTitle,
        img: snapImg,
        price: snapPrice,
        oldPrice: snapOldPrice,
      });
    }

    await cart.save();
    await cart.populate("items.productId");

    return res.status(200).json({
      success: true,
      message: "Added to cart",
      cart,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateCartItemQty(req, res, next) {
  try {
    const userId = getUserId(req);
    if (!userId || !isValidObjectId(userId)) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { productId } = req.params;
    if (!productId || !isValidObjectId(productId)) {
      return res
        .status(400)
        .json({ success: false, message: "Valid productId param is required" });
    }

    const qty = Number(req.body.quantity);
    if (!Number.isFinite(qty) || qty < 1) {
      return res
        .status(400)
        .json({ success: false, message: "quantity must be >= 1" });
    }

    const cart = await getOrCreateCart(userId);

    const idx = cart.items.findIndex(
      (it) => String(it.productId) === String(productId)
    );

    if (idx < 0) {
      return res
        .status(404)
        .json({ success: false, message: "Item not found" });
    }

    cart.items[idx].quantity = qty;

    await cart.save();
    await cart.populate("items.productId");

    return res
      .status(200)
      .json({ success: true, message: "Quantity updated", cart });
  } catch (err) {
    next(err);
  }
}

export async function removeCartItem(req, res, next) {
  try {
    const userId = getUserId(req);
    if (!userId || !isValidObjectId(userId)) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { productId } = req.params;
    if (!productId || !isValidObjectId(productId)) {
      return res
        .status(400)
        .json({ success: false, message: "Valid productId param is required" });
    }

    const cart = await getOrCreateCart(userId);

    cart.items = cart.items.filter(
      (it) => String(it.productId) !== String(productId)
    );

    await cart.save();
    await cart.populate("items.productId");

    return res
      .status(200)
      .json({ success: true, message: "Item removed", cart });
  } catch (err) {
    next(err);
  }
}

export async function clearCart(req, res, next) {
  try {
    const userId = getUserId(req);
    if (!userId || !isValidObjectId(userId)) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const cart = await getOrCreateCart(userId);
    cart.items = [];
    await cart.save();

    return res
      .status(200)
      .json({ success: true, message: "Cart cleared", cart });
  } catch (err) {
    next(err);
  }
}
