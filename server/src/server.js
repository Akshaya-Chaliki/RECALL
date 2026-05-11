import "dotenv/config";
import mongoose from "mongoose";
import app from "./app.js";

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("[FATAL] MONGO_URI is not defined in .env");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("[OK] MongoDB connected");
    app.listen(PORT, () => {
      console.log(`[OK] RECALL server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("[FATAL] MongoDB connection failed:", err.message);
    process.exit(1);
  });
