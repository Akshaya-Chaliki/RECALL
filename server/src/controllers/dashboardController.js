import axios from "axios";
import MemoryState from "../models/MemoryState.js";
import Topic from "../models/Topic.js";

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || "http://127.0.0.1:8000";

/**
 * Local fallback: compute retention using R = m * 2^(-t/h)
 * Used when the AI Engine is unreachable.
 */
function localRetention(halfLife, hoursPassed, m = 100) {
  const h = Math.max(0.1, halfLife);
  const r = m * Math.pow(2, -hoursPassed / h);
  if (Number.isNaN(r) || !Number.isFinite(r)) return 0;
  return Math.max(0, Math.min(100, r));
}

/**
 * Local fallback: compute 7-day projection starting from current retention.
 */
function localProjection(halfLife, currentRetention = 100, days = 7) {
  const h = Math.max(0.1, halfLife);
  const points = [];
  for (let day = 0; day <= days; day++) {
    const hours = day * 24;
    let r = currentRetention * Math.pow(2, -hours / h);
    if (Number.isNaN(r) || !Number.isFinite(r)) r = 0;
    points.push({ day, retention: Math.round(Math.max(0, Math.min(100, r)) * 100) / 100 });
  }
  return points;
}

/**
 * @desc    Get dashboard retention data for a specific topic via AI Engine
 * @route   GET /api/dashboard/:topicId/retention
 * @access  Private
 */
export const getTopicRetention = async (req, res) => {
  try {
    const { topicId } = req.params;

    // Validate topic belongs to user
    const topic = await Topic.findOne({ _id: topicId, user: req.user._id });
    if (!topic) {
      return res.status(404).json({ success: false, message: "Topic not found" });
    }

    // 1. Fetch MemoryState for the topic
    const memoryState = await MemoryState.findOne({ user: req.user._id, topic: topicId });

    if (!memoryState) {
      // New topic — no quiz taken yet. Return defaults WITH a projection curve.
      const defaultProjection = localProjection(24, 100, 7);
      return res.status(200).json({
        success: true,
        data: {
          retentionPercentage: 100,
          halfLife: 24,
          projection: defaultProjection,
          isNew: true,
        },
      });
    }

    // 2. Calculate hoursPassed since last quiz
    const hoursPassed = (Date.now() - new Date(memoryState.lastCalculated).getTime()) / (1000 * 60 * 60);
    const halfLife = Math.max(0.1, Number(memoryState.halfLife || 24));

    // 3. Try calling the Python AI Engine; fall back to local math if unreachable
    let retentionPercentage;
    let projection;

    try {
      const [retentionRes, projectionRes] = await Promise.all([
        axios.post(`${AI_ENGINE_URL}/calculate-retention`, {
          half_life: halfLife,
          hours_passed: hoursPassed,
        }, { timeout: 5000 }),
        axios.post(`${AI_ENGINE_URL}/calculate-projection`, {
          half_life: halfLife,
          // Use current retention as starting point, NOT initialMemoryStrength
          m: undefined, // Will be overridden below after we know current retention
          days: 7,
        }, { timeout: 5000 }),
      ]);

      retentionPercentage = Math.max(0, Math.min(100, Number(retentionRes.data.retention_percentage || 0)));
      if (Number.isNaN(retentionPercentage)) retentionPercentage = 0;

      // The Python projection starts from m=100 (initialMemoryStrength).
      // Re-compute projection starting from the CURRENT retention for accuracy.
      projection = localProjection(halfLife, retentionPercentage, 7);
    } catch (aiError) {
      // AI Engine unreachable — compute locally
      console.warn("[dashboardController] AI Engine unreachable, using local fallback:", aiError.message);
      retentionPercentage = localRetention(halfLife, hoursPassed, memoryState.initialMemoryStrength || 100);
      projection = localProjection(halfLife, retentionPercentage, 7);
    }

    // 4. Return the Retention %, Half-Life, and Projection
    res.status(200).json({
      success: true,
      data: {
        retentionPercentage,
        halfLife,
        projection,
        isNew: false,
      },
    });
  } catch (error) {
    console.error("[dashboardController] Error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};
