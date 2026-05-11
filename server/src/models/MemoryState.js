import mongoose from "mongoose";

const memoryStateSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    topic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Topic",
      required: true,
    },
    initialMemoryStrength: {
      type: Number,
      default: 100,
    },
    halfLife: {
      type: Number,
      default: 24, // hours
    },
    lastCalculated: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// One memory state per user-topic pair
memoryStateSchema.index({ user: 1, topic: 1 }, { unique: true });

export default mongoose.model("MemoryState", memoryStateSchema);
