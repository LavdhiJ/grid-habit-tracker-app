// controllers/prompt.controller.js
import Prompt from "../models/prompt.model.js";
import Reflection from "../models/reflection.model.js";
import fallbackPrompts from "../services/promptService.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// GET /api/prompts/daily
export const getDailyPrompt = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  
  // Get user's recent reflections to understand patterns
  const recentReflections = await Reflection.find({ userId })
    .sort({ date: -1 })
    .limit(5);

  // Get active prompts
  const activePrompts = await Prompt.find({ isActive: true });
  
  let selectedPrompt;

  if (activePrompts.length > 0) {
    // Smart selection based on recent mood or random if no pattern
    const recentMoods = recentReflections.map(r => r.mood).filter(m => m !== 'none');
    
    if (recentMoods.length > 0) {
      const dominantMood = recentMoods[0]; // Most recent mood
      const moodBasedPrompts = activePrompts.filter(p => 
        p.category && p.category.toLowerCase().includes(dominantMood.toLowerCase())
      );
      
      if (moodBasedPrompts.length > 0) {
        const randomIndex = Math.floor(Math.random() * moodBasedPrompts.length);
        selectedPrompt = moodBasedPrompts[randomIndex];
      }
    }
    
    // Fallback to random active prompt
    if (!selectedPrompt) {
      const randomIndex = Math.floor(Math.random() * activePrompts.length);
      selectedPrompt = activePrompts[randomIndex];
    }
  } else {
    // Use fallback prompts
    const randomIndex = Math.floor(Math.random() * fallbackPrompts.length);
    selectedPrompt = {
      text: fallbackPrompts[randomIndex],
      category: 'general',
      _id: null
    };
  }

  res.status(200).json(
    new ApiResponse(200, {
      prompt: selectedPrompt.text,
      category: selectedPrompt.category,
      promptId: selectedPrompt._id
    }, "Daily prompt retrieved successfully")
  );
});

// GET /api/prompts/category/:category
export const getPromptsByCategory = asyncHandler(async (req, res) => {
  const { category } = req.params;
  const { limit = 10 } = req.query;

  const prompts = await Prompt.find({ 
    category: category.toLowerCase(),
    isActive: true 
  }).limit(limit);

  res.status(200).json(
    new ApiResponse(200, prompts, `Prompts for category '${category}' retrieved successfully`)
  );
});

// GET /api/prompts/stats
export const getPromptStats = asyncHandler(async (req, res) => {
  const totalPrompts = await Prompt.countDocuments();
  const activePrompts = await Prompt.countDocuments({ isActive: true });
  
  // Category distribution
  const categoryStats = await Prompt.aggregate([
    { $group: { _id: "$category", count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  // Most used prompts (based on reflections that used suggestions)
  const promptUsage = await Reflection.aggregate([
    { $match: { usedSuggestion: true } },
    { $group: { _id: "$suggestedPrompt", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);

  const stats = {
    totalPrompts,
    activePrompts,
    categoryDistribution: categoryStats,
    mostUsedPrompts: promptUsage
  };

  res.status(200).json(
    new ApiResponse(200, stats, "Prompt statistics retrieved successfully")
  );
});

// POST /api/prompts
export const createPrompt = asyncHandler(async (req, res) => {
  const { text, category, isActive = true } = req.body;

  if (!text) {
    throw new ApiError(400, "Prompt text is required");
  }

  const newPrompt = await Prompt.create({
    text,
    category: category?.toLowerCase() || 'general',
    isActive,
    createdBy: req.user._id
  });

  res.status(201).json(
    new ApiResponse(201, newPrompt, "Prompt created successfully")
  );
});

// GET /api/prompts
export const getAllPrompts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, category, isActive } = req.query;
  
  const query = {};
  if (category) query.category = category.toLowerCase();
  if (isActive !== undefined) query.isActive = isActive === 'true';

  const prompts = await Prompt.find(query)
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Prompt.countDocuments(query);

  res.status(200).json(
    new ApiResponse(200, {
      prompts,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    }, "Prompts retrieved successfully")
  );
});

// PUT /api/prompts/:id
export const updatePrompt = asyncHandler(async (req, res) => {
  const { text, category, isActive } = req.body;
  const promptId = req.params.id;

  const prompt = await Prompt.findById(promptId);
  if (!prompt) {
    throw new ApiError(404, "Prompt not found");
  }

  const updateData = {};
  if (text) updateData.text = text;
  if (category) updateData.category = category.toLowerCase();
  if (isActive !== undefined) updateData.isActive = isActive;
  updateData.updatedAt = new Date();

  const updatedPrompt = await Prompt.findByIdAndUpdate(
    promptId,
    updateData,
    { new: true }
  );

  res.status(200).json(
    new ApiResponse(200, updatedPrompt, "Prompt updated successfully")
  );
});

// DELETE /api/prompts/:id
export const deletePrompt = asyncHandler(async (req, res) => {
  const promptId = req.params.id;

  const prompt = await Prompt.findById(promptId);
  if (!prompt) {
    throw new ApiError(404, "Prompt not found");
  }

  await Prompt.findByIdAndDelete(promptId);

  res.status(200).json(
    new ApiResponse(200, {}, "Prompt deleted successfully")
  );
});