import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { getSkills, createSkill, deleteSkill } from "../controllers/skillController.js";

const router = express.Router();

router.use(protect);

router.route("/").get(getSkills).post(createSkill);
router.route("/:id").delete(deleteSkill);

export default router;
