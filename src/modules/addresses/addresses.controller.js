import { User } from "../users/user.model.js";

export async function getMyAddresses(req, res, next) {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select("addresses");
    return res.json({ success: true, addresses: user?.addresses || [] });
  } catch (e) {
    next(e);
  }
}

export async function addAddress(req, res, next) {
  try {
    const userId = req.user.id;

    const { name, phone, email, address, city, pincode, state, country } =
      req.body;

    const user = await User.findById(userId);

    user.addresses.push({
      name,
      phone,
      email,
      address,
      city,
      pincode,
      state,
      country: country || "India",
    });

    await user.save();

    return res.status(201).json({ success: true, addresses: user.addresses });
  } catch (e) {
    next(e);
  }
}

export async function updateAddress(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const { name, phone, email, address, city, pincode, state, country } =
      req.body;

    const user = await User.findById(userId);
    const addr = user.addresses.id(id);

    if (!addr) {
      return res
        .status(404)
        .json({ success: false, message: "Address not found" });
    }

    addr.name = name;
    addr.phone = phone;
    addr.email = email;
    addr.address = address;
    addr.city = city;
    addr.pincode = pincode;
    addr.state = state;
    addr.country = country || "India";

    await user.save();

    return res.json({ success: true, addresses: user.addresses });
  } catch (e) {
    next(e);
  }
}

export async function deleteAddress(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const user = await User.findById(userId);
    const addr = user.addresses.id(id);

    if (!addr) {
      return res
        .status(404)
        .json({ success: false, message: "Address not found" });
    }

    addr.deleteOne();
    await user.save();

    return res.json({ success: true, addresses: user.addresses });
  } catch (e) {
    next(e);
  }
}
