import Skill from "../models/Skill.js";
import Topic from "../models/Topic.js";
import MemoryState from "../models/MemoryState.js";
import Assessment from "../models/Assessment.js";

/**
 * @desc    Get all skills for the authenticated user
 * @route   GET /api/skills
 * @access  Private
 */
export const getSkills = async (req, res) => {
  try {
    const skills = await Skill.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: skills });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Create a new skill
 * @route   POST /api/skills
 * @access  Private
 */
export const createSkill = async (req, res) => {
  try {
    const { name, category } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: "Skill name is required" });
    }

    const existing = await Skill.findOne({ user: req.user.id, name: { $regex: new RegExp(`^${name}$`, "i") } });
    if (existing) {
      return res.status(400).json({ success: false, message: "Skill already exists" });
    }

    const skill = await Skill.create({
      user: req.user.id,
      name,
      category: category || "General",
    });

    res.status(201).json({ success: true, data: skill });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Delete a skill and all its topics
 * @route   DELETE /api/skills/:id
 * @access  Private
 */
export const deleteSkill = async (req, res) => {
  try {
    const skill = await Skill.findOne({ _id: req.params.id, user: req.user.id });

    if (!skill) {
      return res.status(404).json({ success: false, message: "Skill not found" });
    }

    // Cascade delete: topics, memory states, assessments
    const topics = await Topic.find({ skill: skill._id });
    const topicIds = topics.map(t => t._id);

    await Assessment.deleteMany({ topic: { $in: topicIds } });
    await MemoryState.deleteMany({ topic: { $in: topicIds } });
    await Topic.deleteMany({ skill: skill._id });
    await skill.deleteOne();

    res.status(200).json({ success: true, message: "Skill and all associated data deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
