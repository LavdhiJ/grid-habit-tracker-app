
// routes/prompt.routes.js
import express from "express";
import {
  getDailyPrompt,
  createPrompt,
  getAllPrompts,
  deletePrompt,
  getPromptsByCategory,
  updatePrompt,
  getPromptStats
} from "../controllers/prompt.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/daily", verifyJWT, getDailyPrompt);
router.get("/category/:category", verifyJWT, getPromptsByCategory);
router.get("/stats", verifyJWT, getPromptStats);
router.post("/", verifyJWT, createPrompt);
router.get("/", verifyJWT, getAllPrompts);
router.put("/:id", verifyJWT, updatePrompt);
router.delete("/:id", verifyJWT, deletePrompt);

export default router;
