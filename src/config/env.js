import dotenv from "dotenv";
dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: (process.env.PORT) || 5000,
  MONGO_URI: process.env.MONGO_URI,
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  CORS_ORIGIN: process.env.CORS_ORIGIN || "*",
};
console.log("CORS_ORIGIN =", env.CORS_ORIGIN);
["MONGO_URI", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"].forEach((k) => {
  if (!env[k]) throw new Error(`Missing required env var: ${k}`);
});
