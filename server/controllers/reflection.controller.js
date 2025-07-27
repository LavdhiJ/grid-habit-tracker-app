
// controllers/reflection.controller.js
import Reflection from "../models/reflection.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// POST /api/reflections
export const createReflection = asyncHandler(async (req, res) => {
  const { text, suggestedPrompt, usedSuggestion, mood, tags } = req.body;

  if (!text) {
    throw new ApiError(400, "Reflection text is required");
  }

  const today = new Date().setHours(0, 0, 0, 0);
  const existing = await Reflection.findOne({
    userId: req.user._id,
    date: today
  });

  if (existing) {
    throw new ApiError(400, "Reflection already submitted for today");
  }

  const reflection = await Reflection.create({
    userId: req.user._id,
    text,
    suggestedPrompt,
    usedSuggestion: usedSuggestion || false,
    mood: mood || "none",
    tags: tags || [],
    wordCount: text.split(' ').length,
    characterCount: text.length
  });

  res.status(201).json(
    new ApiResponse(201, reflection, "Reflection created successfully")
  );
});

// GET /api/reflections/today
export const getTodayReflection = asyncHandler(async (req, res) => {
  const today = new Date().setHours(0, 0, 0, 0);
  const reflection = await Reflection.findOne({
    userId: req.user._id,
    date: today
  });

  if (!reflection) {
    throw new ApiError(404, "No reflection found for today");
  }

  res.status(200).json(
    new ApiResponse(200, reflection, "Today's reflection retrieved successfully")
  );
});

// GET /api/reflections/history
export const getReflectionHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, mood, sortBy = 'date' } = req.query;
  
  const query = { userId: req.user._id };
  if (mood && mood !== 'all') {
    query.mood = mood;
  }

  const reflections = await Reflection.find(query)
    .sort({ [sortBy]: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .select('-__v');

  const total = await Reflection.countDocuments(query);

  res.status(200).json(
    new ApiResponse(200, {
      reflections,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    }, "Reflection history retrieved successfully")
  );
});

// GET /api/reflections/stats
export const getReflectionStats = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  
  // Total reflections count
  const totalReflections = await Reflection.countDocuments({ userId });
  
  // Current streak calculation
  const reflections = await Reflection.find({ userId }).sort({ date: -1 });
  let currentStreak = 0;
  let checkDate = new Date();
  checkDate.setHours(0, 0, 0, 0);
  
  for (const reflection of reflections) {
    const reflectionDate = new Date(reflection.date);
    if (reflectionDate.getTime() === checkDate.getTime()) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // Mood distribution
  const moodStats = await Reflection.aggregate([
    { $match: { userId } },
    { $group: { _id: "$mood", count: { $sum: 1 } } }
  ]);

  // Average word count
  const wordCountStats = await Reflection.aggregate([
    { $match: { userId } },
    { $group: { _id: null, avgWordCount: { $avg: "$wordCount" } } }
  ]);

  // Monthly reflection count
  const monthlyStats = await Reflection.aggregate([
    { $match: { userId } },
    {
      $group: {
        _id: {
          year: { $year: "$date" },
          month: { $month: "$date" }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { "_id.year": -1, "_id.month": -1 } },
    { $limit: 12 }
  ]);

  const stats = {
    totalReflections,
    currentStreak,
    moodDistribution: moodStats,
    averageWordCount: wordCountStats[0]?.avgWordCount || 0,
    monthlyStats
  };

  res.status(200).json(
    new ApiResponse(200, stats, "Reflection statistics retrieved successfully")
  );
});

// GET /api/reflections/range
export const getReflectionsByDateRange = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  
  if (!startDate || !endDate) {
    throw new ApiError(400, "Start date and end date are required");
  }

  const reflections = await Reflection.find({
    userId: req.user._id,
    date: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  }).sort({ date: -1 });

  res.status(200).json(
    new ApiResponse(200, reflections, "Reflections retrieved successfully")
  );
});

// PUT /api/reflections/:id
export const updateReflection = asyncHandler(async (req, res) => {
  const { text, mood, tags } = req.body;
  const reflectionId = req.params.id;

  const reflection = await Reflection.findOne({
    _id: reflectionId,
    userId: req.user._id
  });

  if (!reflection) {
    throw new ApiError(404, "Reflection not found");
  }

  const updateData = {};
  if (text) {
    updateData.text = text;
    updateData.wordCount = text.split(' ').length;
    updateData.characterCount = text.length;
  }
  if (mood) updateData.mood = mood;
  if (tags) updateData.tags = tags;
  updateData.updatedAt = new Date();

  const updatedReflection = await Reflection.findByIdAndUpdate(
    reflectionId,
    updateData,
    { new: true }
  );

  res.status(200).json(
    new ApiResponse(200, updatedReflection, "Reflection updated successfully")
  );
});

// DELETE /api/reflections/:id
export const deleteReflection = asyncHandler(async (req, res) => {
  const reflectionId = req.params.id;

  const reflection = await Reflection.findOne({
    _id: reflectionId,
    userId: req.user._id
  });

  if (!reflection) {
    throw new ApiError(404, "Reflection not found");
  }

  await Reflection.findByIdAndDelete(reflectionId);

  res.status(200).json(
    new ApiResponse(200, {}, "Reflection deleted successfully")
  );
});