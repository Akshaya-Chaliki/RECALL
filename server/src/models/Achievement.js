import mongoose from "mongoose";

/**
 * Achievement Schema — Gamification Layer (Phase 2)
 *
 * Tracks user badges and milestones earned through consistent
 * learning behavior. Not yet integrated into controllers;
 * this is structural scaffolding for the gamification roadmap.
 *
 * Future integration points:
 *   - quizController.processResults → award streak/accuracy badges
 *   - dashboardController → display unlocked achievements
 */
const achievementSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    category: {
      type: String,
      enum: ["streak", "accuracy", "mastery", "explorer", "milestone"],
      default: "milestone",
    },
    icon: {
      type: String,
      default: "trophy",
    },
    points: {
      type: Number,
      default: 10,
      min: 0,
    },
    unlockedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// A user cannot unlock the same achievement twice
achievementSchema.index({ user: 1, name: 1 }, { unique: true });

export default mongoose.model("Achievement", achievementSchema);
