import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { connectDB } from "./db/connect.js";

async function bootstrap() {
  await connectDB();
  const app = createApp();
 
  app.listen(env.PORT, () => {
    console.log(`🚀 Server running on http://localhost:${env.PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});
