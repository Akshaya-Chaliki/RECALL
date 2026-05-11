import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getFlashcards,
  entryTest,
  submitEntryTest,
  getQuestions,
  processResults,
} from "../controllers/quizController.js";

const router = express.Router();

router.use(protect);

// Entry test flow (Test-Before-Add)
router.post("/entry-test", entryTest);
router.post("/entry-test/submit", submitEntryTest);

// Regular quiz flow
router.get("/:topicId/questions", getQuestions);
router.post("/:topicId/results", processResults);

// Flashcards
router.get("/:topicId/flashcards", getFlashcards);

export default router;
