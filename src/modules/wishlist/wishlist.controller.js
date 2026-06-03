
import Wishlist from "./wishlist.model.js";
import Product from "../products/product.model.js";

async function getOrCreateWishlist(userId) {
  let wl = await Wishlist.findOne({ userId });
  if (!wl) wl = await Wishlist.create({ userId, items: [] });
  return wl;
}

export async function getMyWishlist(req, res, next) {
  try {
    const wl = await getOrCreateWishlist(req.user.id);
    return res.json({ success: true, wishlist: wl });
  } catch (err) {
    next(err);
  }
}

export async function addWishlistItem(req, res, next) {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: "productId is required" });
    }

    const product = await Product.findById(productId).lean();
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const wl = await getOrCreateWishlist(req.user.id);

    const exists = wl.items.some((it) => String(it.productId) === String(productId));
    if (exists) {
      return res.json({ success: true, message: "Already in wishlist", wishlist: wl });
    }

    const price = Number(product.price || 0);
    const offer = Number(product.offerPrice || 0);
    const finalPrice = offer > 0 ? offer : price;

    wl.items.push({
      productId,
      title: product.name || "",
      img: (product.images && product.images[0]) || "",
      oldPrice: price,
      price: finalPrice,
      save: Math.max(0, price - finalPrice),
      outOfStock: Boolean(product.outOfStock) || Number(product.quantity || 0) <= 0,
    });

    await wl.save();
    return res.json({ success: true, message: "Added to wishlist", wishlist: wl });
  } catch (err) {
    next(err);
  }
}

export async function removeWishlistItem(req, res, next) {
  try {
    const { productId } = req.params;

    const wl = await getOrCreateWishlist(req.user.id);
    wl.items = wl.items.filter((it) => String(it.productId) !== String(productId));

    await wl.save();
    return res.json({ success: true, message: "Removed from wishlist", wishlist: wl });
  } catch (err) {
    next(err);
  }
}

export async function clearWishlist(req, res, next) {
  try {
    const wl = await getOrCreateWishlist(req.user.id);
    wl.items = [];
    await wl.save();
    return res.json({ success: true, message: "Wishlist cleared", wishlist: wl });
  } catch (err) {
    next(err);
  }
}
