import mongoose from "mongoose";

const assessmentSchema = new mongoose.Schema(
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
    score: {
      type: Number,
      required: true,
    },
    answers: {
      type: Array,
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.model("Assessment", assessmentSchema);
