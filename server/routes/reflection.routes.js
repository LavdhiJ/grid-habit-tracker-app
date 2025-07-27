// routes/reflection.routes.js
import express from "express";
import {
  createReflection,
  getTodayReflection,
  getReflectionHistory,
  getReflectionStats,
  getReflectionsByDateRange,
  updateReflection,
  deleteReflection
} from "../controllers/reflection.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/", verifyJWT, createReflection);
router.get("/today", verifyJWT, getTodayReflection);
router.get("/history", verifyJWT, getReflectionHistory);
router.get("/stats", verifyJWT, getReflectionStats);
router.get("/range", verifyJWT, getReflectionsByDateRange);
router.put("/:id", verifyJWT, updateReflection);
router.delete("/:id", verifyJWT, deleteReflection);

export default router;