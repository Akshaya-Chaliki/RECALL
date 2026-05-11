import express from "express";
import axios from "axios";

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || "http://127.0.0.1:8000";

const router = express.Router();

router.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "RECALL API is running",
  });
});

router.get("/ai-engine", async (req, res) => {
  try {
    const response = await axios.get(`${AI_ENGINE_URL}/`, { timeout: 3000 });
    res.status(200).json({
      success: true,
      status: "online",
      data: response.data,
    });
  } catch (error) {
    res.status(200).json({
      success: true,
      status: "offline",
      message: "AI Engine is unreachable",
    });
  }
});

export default router;