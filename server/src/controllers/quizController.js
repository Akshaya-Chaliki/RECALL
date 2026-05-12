import axios from "axios";
import Topic from "../models/Topic.js";
import Skill from "../models/Skill.js";
import Assessment from "../models/Assessment.js";
import MemoryState from "../models/MemoryState.js";

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || "http://127.0.0.1:8001";

/**
 * In-memory response cache for AI-generated content.
 * Provides sub-50ms response times for repeated topic requests,
 * reducing Gemini API pressure and fulfilling <200ms latency targets.
 * TTL: 5 minutes (300,000ms) per entry.
 */
const responseCache = {};
const CACHE_TTL_MS = 5 * 60 * 1000;

function getCached(key) {
  const entry = responseCache[key];
  if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
    return entry.data;
  }
  if (entry) delete responseCache[key]; // Expired
  return null;
}

function setCache(key, data) {
  responseCache[key] = { data, timestamp: Date.now() };
}

/**
 * @desc    Generate flashcards via AI Engine (10 pairs)
 * @route   GET /api/quiz/:topicId/flashcards
 * @access  Private
 */
export const getFlashcards = async (req, res) => {
  try {
    const { topicId } = req.params;

    // Check cache first for sub-200ms response
    const cachedFlashcards = getCached(`flashcards:${topicId}`);
    if (cachedFlashcards) {
      return res.status(200).json({ success: true, data: cachedFlashcards, cached: true });
    }

    const topic = await Topic.findOne({ _id: topicId, user: req.user._id });
    if (!topic) {
      return res.status(404).json({ success: false, message: "Topic not found" });
    }

    const response = await axios.post(`${AI_ENGINE_URL}/generate-flashcards`, {
      topic_name: topic.name,
    }, { timeout: 30000 }); // 30 second timeout

    setCache(`flashcards:${topicId}`, response.data);
    res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    console.error("Error in getFlashcards proxy:", error.message);
    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({ success: false, message: "AI Engine request timed out. The server might be overloaded." });
    }
    if (error.response) {
      return res.status(error.response.status).json({
        success: false,
        message: `AI Engine Error: ${error.response.data?.detail || JSON.stringify(error.response.data)}`,
      });
    }
    res.status(500).json({ success: false, message: `AI Engine unreachable: ${error.message}` });
  }
};

/**
 * @desc    Generate entry-test questions (3 MCQs) for the "Test-Before-Add" flow
 * @route   POST /api/quiz/entry-test
 * @access  Private
 * @body    { topicName: string }
 */
export const entryTest = async (req, res) => {
  try {
    const { topicName } = req.body;

    if (!topicName) {
      return res.status(400).json({ success: false, message: "topicName is required" });
    }

    // Call Python with count=3
    const response = await axios.post(`${AI_ENGINE_URL}/generate-questions`, {
      topic_name: topicName,
      count: 3,
    });

    res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json({
        success: false,
        message: `AI Engine Error: ${error.response.data?.detail || JSON.stringify(error.response.data)}`,
      });
    }
    res.status(500).json({ success: false, message: `AI Engine unreachable: ${error.message}` });
  }
};

/**
 * @desc    Submit entry-test results: create Topic + Assessment + MemoryState in one shot
 * @route   POST /api/quiz/entry-test/submit
 * @access  Private
 * @body    { skillId, topicName, description, score, answers }
 */
export const submitEntryTest = async (req, res) => {
  try {
    const { skillId, topicName, description, score, answers } = req.body;

    if (!skillId || !topicName || score === undefined) {
      return res.status(400).json({ success: false, message: "skillId, topicName, and score are required" });
    }

    // Verify skill belongs to user
    const skill = await Skill.findOne({ _id: skillId, user: req.user._id });
    if (!skill) {
      return res.status(404).json({ success: false, message: "Skill not found" });
    }

    // 1. Create the Topic
    const topic = await Topic.create({
      user: req.user._id,
      skill: skillId,
      name: topicName,
      description: description || "",
    });

    // 2. Save the initial Assessment
    await Assessment.create({
      user: req.user._id,
      topic: topic._id,
      score,
      answers: answers || [],
    });

    // 3. Calculate initial half-life via Python
    const hlResponse = await axios.post(`${AI_ENGINE_URL}/update-half-life`, {
      score,
      current_half_life: 24.0, // default starting half-life
    });
    const newHalfLife = hlResponse.data.new_half_life;

    // 4. Create MemoryState
    await MemoryState.create({
      user: req.user._id,
      topic: topic._id,
      initialMemoryStrength: 100,
      halfLife: newHalfLife,
      lastCalculated: new Date(),
    });

    res.status(201).json({
      success: true,
      data: {
        topic,
        score,
        halfLife: newHalfLife,
      },
    });
  } catch (error) {
    // Handle duplicate topic
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "Topic already exists in this skill" });
    }
    if (error.response) {
      return res.status(error.response.status).json({
        success: false,
        message: `AI Engine Error: ${error.response.data?.detail || JSON.stringify(error.response.data)}`,
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Generate quiz questions via AI Engine (5 MCQs for regular review)
 * @route   GET /api/quiz/:topicId/questions
 * @access  Private
 */
export const getQuestions = async (req, res) => {
  try {
    const { topicId } = req.params;

    // Check cache first for sub-200ms response
    const cachedQuestions = getCached(`questions:${topicId}`);
    if (cachedQuestions) {
      return res.status(200).json({ success: true, data: cachedQuestions, cached: true });
    }

    // 1. Fetch Topic name from DB
    const topic = await Topic.findOne({ _id: topicId, user: req.user._id });
    if (!topic) {
      return res.status(404).json({ success: false, message: "Topic not found" });
    }

    // 2. Call Python POST /generate-questions with count=5
    const response = await axios.post(`${AI_ENGINE_URL}/generate-questions`, {
      topic_name: topic.name,
      count: 5,
    }, { timeout: 30000 });

    // 3. Cache and return the 5 AI MCQs to the frontend
    setCache(`questions:${topicId}`, response.data);
    res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    console.error("[getQuestions] Error:", error.message);
    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({ success: false, message: "AI Engine request timed out. Please try again." });
    }
    if (error.response) {
      return res.status(error.response.status).json({
        success: false,
        message: `AI Engine Error: ${error.response.data?.detail || JSON.stringify(error.response.data)}`,
      });
    }
    res.status(500).json({ success: false, message: `AI Engine unreachable: ${error.message}` });
  }
};

/**
 * @desc    Submit quiz results and update HLR via AI Engine
 * @route   POST /api/quiz/:topicId/results
 * @access  Private
 */
export const processResults = async (req, res) => {
  try {
    const { topicId } = req.params;
    const { score, answers } = req.body; // score is raw correct count

    if (score === undefined) {
      return res.status(400).json({ success: false, message: "score is required" });
    }

    // Validate topic belongs to user
    const topic = await Topic.findOne({ _id: topicId, user: req.user._id });
    if (!topic) {
      return res.status(404).json({ success: false, message: "Topic not found" });
    }

    // Process Behavioral Metrics
    const totalQuestions = answers ? answers.length : 5;
    let totalLatency = 0;
    let totalConfidence = 0;

    if (answers && answers.length > 0) {
      answers.forEach(a => {
        totalLatency += (a.latency || 0);
        totalConfidence += (a.confidence || 3);
      });
    }

    const avgLatency = totalQuestions > 0 ? totalLatency / totalQuestions : 0;
    const avgConfidence = totalQuestions > 0 ? totalConfidence / totalQuestions : 3;

    // Behavioral Score (Max 5.0)
    const safeTotal = totalQuestions || 5;
    // Correctness (60%)
    const correctnessScore = (score / safeTotal) * 5 * 0.6;
    // Latency (20%): cap max acceptable at 30s
    const latencyScore = Math.max(0, (30 - avgLatency) / 30) * 5 * 0.2;
    // Confidence (20%)
    const confidenceScore = (avgConfidence / 5) * 5 * 0.2;

    const behavioralScore = Number.isNaN(correctnessScore + latencyScore + confidenceScore)
      ? 0
      : correctnessScore + latencyScore + confidenceScore;

    // 2. Save the Assessment entry
    await Assessment.create({
      user: req.user._id,
      topic: topicId,
      score, // Save the raw score
      answers: answers || [],
    });

    // 3. Fetch existing MemoryState for that user/topic
    let memoryState = await MemoryState.findOne({ user: req.user._id, topic: topicId });
    let currentHalfLife = 24.0;

    if (memoryState) {
      currentHalfLife = memoryState.halfLife;
    }

    // 4. Call Python POST /update-half-life
    const response = await axios.post(`${AI_ENGINE_URL}/update-half-life`, {
      score: behavioralScore,
      current_half_life: currentHalfLife,
      avg_latency: avgLatency,
      avg_confidence: avgConfidence
    }, { timeout: 10000 });

    const newHalfLife = response.data.new_half_life;

    // 5. Update MemoryState
    if (memoryState) {
      memoryState.halfLife = newHalfLife;
      memoryState.lastCalculated = new Date();
      await memoryState.save();
    } else {
      memoryState = await MemoryState.create({
        user: req.user._id,
        topic: topicId,
        initialMemoryStrength: 100,
        halfLife: newHalfLife,
        lastCalculated: new Date(),
      });
    }

    res.status(200).json({
      success: true,
      data: {
        score,
        behavioralScore,
        newHalfLife: memoryState.halfLife,
        lastCalculated: memoryState.lastCalculated,
      },
    });
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json({
        success: false,
        message: `AI Engine Error: ${error.response.data?.detail || JSON.stringify(error.response.data)}`,
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};
