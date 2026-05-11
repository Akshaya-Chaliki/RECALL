import mongoose from "mongoose";

const skillSchema = new mongoose.Schema(
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
    category: {
      type: String,
      trim: true,
      default: "General",
    },
  },
  { timestamps: true }
);

// Compound index: a user cannot have duplicate skill names
skillSchema.index({ user: 1, name: 1 }, { unique: true });

export default mongoose.model("Skill", skillSchema);
