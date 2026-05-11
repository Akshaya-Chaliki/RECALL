import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { getTopics, createTopic, deleteTopic } from "../controllers/topicController.js";

const router = express.Router();

router.use(protect);

router.route("/").get(getTopics).post(createTopic);
router.route("/:id").delete(deleteTopic);

export default router;
