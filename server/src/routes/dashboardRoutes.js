import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { getTopicRetention } from "../controllers/dashboardController.js";

const router = express.Router();

router.use(protect);

router.get("/:topicId/retention", getTopicRetention);

export default router;
