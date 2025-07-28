import HabitStats from '../models/habitstats.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';

// Mark completion for a habit on a date
export const markHabitCompletion = async (req, res, next) => {
  try {
    const { habitId, date, completed, notes } = req.body;
    const userId = req.user._id;

    const result = await HabitStats.markCompletion(habitId, userId, date, completed, notes);
    res.status(200).json(new ApiResponse(200, result, 'Habit marked'));
  } catch (error) {
    next(error);
  }
};

// Get habit completion data (for charts/stats)
export const getHabitCompletionData = async (req, res, next) => {
  try {
    const { habitId } = req.params;
    const { startDate, endDate } = req.query;

    const data = await HabitStats.getCompletionData(habitId, startDate, endDate);
    res.status(200).json(new ApiResponse(200, data));
  } catch (error) {
    next(error);
  }
};

// Get user all completions (for dashboard)
export const getUserCompletions = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.user._id;

    const data = await HabitStats.getUserCompletions(userId, startDate, endDate);
    res.status(200).json(new ApiResponse(200, data));
  } catch (error) {
    next(error);
  }
};

// Get habit stats (completion %, total/completed days, etc.)
export const getHabitStats = async (req, res, next) => {
  try {
    const { habitId } = req.params;
    const { startDate, endDate } = req.query;

    const stats = await HabitStats.getHabitStats(habitId, { startDate, endDate });
    res.status(200).json(new ApiResponse(200, stats));
  } catch (error) {
    next(error);
  }
};

// Heatmap data (for year view)
export const getHabitHeatmapData = async (req, res, next) => {
  try {
    const { habitId } = req.params;
    const { year } = req.query;

    const data = await HabitStats.getHeatmapData(habitId, year);
    res.status(200).json(new ApiResponse(200, data));
  } catch (error) {
    next(error);
  }
};

// Delete all stats for a habit
export const deleteHabitStats = async (req, res, next) => {
  try {
    const { habitId } = req.params;
    const result = await HabitStats.deleteHabitStats(habitId);

    res.status(200).json(new ApiResponse(200, result, 'Habit stats deleted'));
  } catch (error) {
    next(error);
  }
};

// Toggle individual record completion
export const toggleHabitCompletion = async (req, res, next) => {
  try {
    const { statId } = req.params;
    const stat = await HabitStats.findById(statId);
    if (!stat) throw new ApiError(404, 'Completion record not found');

    const updated = await stat.toggleCompletion();
    res.status(200).json(new ApiResponse(200, updated, 'Completion status toggled'));
  } catch (error) {
    next(error);
  }
};
