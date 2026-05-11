import axios from "axios";
import MemoryState from "../models/MemoryState.js";
import Topic from "../models/Topic.js";
import Assessment from "../models/Assessment.js";

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || "http://127.0.0.1:8000";

/**
 * Computes memory retention using the Ebbinghaus forgetting curve.
 * 
 * Formula: R(t) = M * 2^(-t/h)
 * - R: Current retention percentage
 * - M: Initial memory strength (typically 100)
 * - t: Time elapsed since the last review (in hours)
 * - h: Half-life of the memory (hours until retention drops to 50%)
 * 
 * Note: This strictly implements continuous exponential decay without 
 * relying on Spaced Repetition System (SRS) interval arrays.
 * 
 * Local fallback used when the AI Engine is unreachable.
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
 * @desc    Get full dashboard data for a specific topic (retention, memory state, assessments)
 * @route   GET /api/dashboard/:topicId/retention
 * @access  Private
 * 
 * Returns the complete data shape required by DashboardPage:
 *   { topic, M, h, lastCalculated, currentRetention, assessments, isNew, projection }
 */
export const getTopicRetention = async (req, res) => {
  try {
    const { topicId } = req.params;

    // Validate topic belongs to user
    const topic = await Topic.findOne({ _id: topicId, user: req.user._id });
    if (!topic) {
      return res.status(404).json({ success: false, message: "Topic not found" });
    }

    // Fetch MemoryState for the topic
    const memoryState = await MemoryState.findOne({ user: req.user._id, topic: topicId });

    // Fetch recent assessments (last 10, newest first)
    const assessments = await Assessment.find({ user: req.user._id, topic: topicId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Format assessments with dateTaken field for frontend compatibility
    const formattedAssessments = assessments.map(a => ({
      _id: a._id,
      score: a.score,
      answers: a.answers,
      dateTaken: a.createdAt,
    }));

    if (!memoryState) {
      // New topic — no quiz taken yet. Return defaults WITH a projection curve.
      const defaultProjection = localProjection(24, 100, 7);
      return res.status(200).json({
        success: true,
        data: {
          topic: { name: topic.name, category: topic.category || "General" },
          M: 100,
          h: 24,
          lastCalculated: null,
          currentRetention: 100,
          assessments: formattedAssessments,
          isNew: true,
          retentionPercentage: 100,
          halfLife: 24,
          projection: defaultProjection,
        },
      });
    }

    // Calculate hoursPassed since last quiz
    const lastCalculated = memoryState.lastCalculated || new Date();
    const hoursPassed = (Date.now() - new Date(lastCalculated).getTime()) / (1000 * 60 * 60);
    const halfLife = Math.max(0.1, Number(memoryState.halfLife || 24));
    const M = Number(memoryState.initialMemoryStrength || 100);

    // Try calling the Python AI Engine; fall back to local math if unreachable
    let retentionPercentage;
    let projection;

    try {
      const retentionRes = await axios.post(`${AI_ENGINE_URL}/calculate-retention`, {
        half_life: halfLife,
        hours_passed: hoursPassed,
      }, { timeout: 5000 });

      retentionPercentage = Math.max(0, Math.min(100, Number(retentionRes.data.retention_percentage || 0)));
      if (Number.isNaN(retentionPercentage)) retentionPercentage = 0;
    } catch (aiError) {
      // AI Engine unreachable — compute locally
      console.warn("[dashboardController] AI Engine unreachable, using local fallback:", aiError.message);
      retentionPercentage = localRetention(halfLife, hoursPassed, M);
    }

    // Always compute projection locally from current retention for accuracy
    projection = localProjection(halfLife, retentionPercentage, 7);

    // Return the complete dashboard data shape
    res.status(200).json({
      success: true,
      data: {
        topic: { name: topic.name, category: topic.category || "General" },
        M,
        h: halfLife,
        lastCalculated: lastCalculated,
        currentRetention: retentionPercentage,
        assessments: formattedAssessments,
        isNew: false,
        retentionPercentage,
        halfLife,
        projection,
      },
    });
  } catch (error) {
    console.error("[dashboardController] Error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};
