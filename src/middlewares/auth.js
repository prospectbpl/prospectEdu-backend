// import { verifyAccessToken } from "../utils/jwt.js";

// export function requireAuth(req, res, next) {
//   try {
//     const header = req.headers.authorization || "";
//     const [type, token] = header.split(" ");

//     if (type !== "Bearer" || !token) {
//       const err = new Error("Missing or invalid Authorization header");
//       err.statusCode = 401;
//       throw err;
//     }

//     const payload = verifyAccessToken(token);
//     // payload = { sub, role, iat, exp }
//     req.user = { id: payload.sub, role: payload.role };
//     next();
//   } catch (e) {
//     e.statusCode = 401;
//     next(e);
//   }
// }

// export function requireRole(...roles) {
//   return (req, res, next) => {
//     if (!req.user) {
//       const err = new Error("Unauthorized");
//       err.statusCode = 401;
//       return next(err);
//     }
//     if (!roles.includes(req.user.role)) {
//       const err = new Error("Forbidden");
//       err.statusCode = 403;
//       return next(err);
//     }
//     next();
//   };
// }

import { verifyAccessToken } from "../utils/jwt.js";

export function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [type, token] = header.split(" ");

    if (type !== "Bearer" || !token) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized (missing token)" });
    }

    const payload = verifyAccessToken(token);

    // ✅ support multiple payload shapes
    const userId =
      payload?.sub || payload?.id || payload?._id || payload?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized (invalid token payload - missing user id)",
      });
    }

    req.user = { id: String(userId), role: payload?.role };
    next();
  } catch (e) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    next();
  };
}
  
