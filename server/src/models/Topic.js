import mongoose from "mongoose";

const topicSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    skill: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Skill",
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
      trim: true,
      default: "General",
    },
  },
  { timestamps: true }
);

// Compound index: a user cannot have duplicate topic names
topicSchema.index({ user: 1, name: 1 }, { unique: true });

export default mongoose.model("Topic", topicSchema);
