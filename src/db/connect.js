import mongoose from "mongoose";
import { env } from "../config/env.js";

export async function connectDB() {
  try {
    mongoose.set("strictQuery", true);
    await mongoose.connect(env.MONGO_URI);
    console.log("✅ Mongo connected:", mongoose.connection.name);
    console.log("✅ Mongo host:", mongoose.connection.host);
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  }
}
