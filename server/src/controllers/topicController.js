import Topic from "../models/Topic.js";
import MemoryState from "../models/MemoryState.js";

/**
 * @desc    Get all topics for the authenticated user
 * @route   GET /api/topics
 * @access  Private
 */
export const getTopics = async (req, res) => {
  try {
    const { skillId } = req.query;
    const query = { user: req.user.id };
    if (skillId) query.skill = skillId;

    const topics = await Topic.find(query).sort({ createdAt: -1 });

    const topicsWithState = await Promise.all(
      topics.map(async (topic) => {
        const ms = await MemoryState.findOne({ user: req.user.id, topic: topic._id });
        const topicObj = topic.toObject();
        if (ms) {
          topicObj.memoryState = {
            M: Number(ms.initialMemoryStrength || 100),
            h: Math.max(0.1, Number(ms.halfLife || 24)),
            lastCalculated: ms.lastCalculated || new Date(),
          };
        }
        return topicObj;
      })
    );

    res.status(200).json({ success: true, data: topicsWithState });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Create a new topic
 * @route   POST /api/topics
 * @access  Private
 */
export const createTopic = async (req, res) => {
  try {
    const { name, description, category, skillId } = req.body;

    if (!name || !skillId) {
      return res.status(400).json({ success: false, message: "Topic name and skillId are required" });
    }

    // Check for duplicate in the same skill
    const existing = await Topic.findOne({ 
      user: req.user.id, 
      skill: skillId,
      name: { $regex: new RegExp(`^${name}$`, "i") } 
    });
    if (existing) {
      return res.status(400).json({ success: false, message: "Topic already exists in this skill" });
    }

    const topic = await Topic.create({
      user: req.user.id,
      skill: skillId,
      name,
      description: description || "",
      category: category || "General",
    });

    res.status(201).json({ success: true, data: topic });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Delete a topic and its associated data
 * @route   DELETE /api/topics/:id
 * @access  Private
 */
export const deleteTopic = async (req, res) => {
  try {
    const topic = await Topic.findOne({ _id: req.params.id, user: req.user.id });

    if (!topic) {
      return res.status(404).json({ success: false, message: "Topic not found" });
    }

    // Cascade delete memory state and assessments
    await MemoryState.deleteMany({ user: req.user.id, topic: topic._id });
    const Assessment = (await import("../models/Assessment.js")).default;
    await Assessment.deleteMany({ user: req.user.id, topic: topic._id });
    await topic.deleteOne();

    res.status(200).json({ success: true, message: "Topic deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
