import Habit from '../models/habit.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import ReminderService from '../services/ReminderService.js';
import mongoose from 'mongoose';

class HabitController {
  // Create a new habit
  static createHabit = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const habitData = req.body;

    const habit = new Habit({
      ...habitData,
      userId
    });

    await habit.save();

    // Create reminder if enabled
    if (habit.reminderEnabled) {
      try {
        const nextReminderDate = habit.getNextReminderDate();
        const reminderMessage = `Time for your habit: ${habit.name}!`;

        if (nextReminderDate) {
          await ReminderService.createReminder(
            userId,
            'habit',
            habit._id,
            {
              reminderDate: nextReminderDate,
              reminderType: 'recurring',
              recurrence: { frequency: 'daily', interval: 1 },
              title: `Habit Reminder: ${habit.name}`,
              message: reminderMessage
            }
          );
        }
      } catch (reminderError) {
        console.error('Error creating habit reminder:', reminderError);
      }
    }

    return res
      .status(201)
      .json(new ApiResponse(201, habit, 'Habit created successfully'));
  });

  // Get all habits for a user
  static getHabits = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { frequency, status = 'active', page = 1, limit = 20 } = req.query;

    const filter = { userId };

    if (status === 'active') {
      filter.isActive = true;
    } else if (status === 'inactive') {
      filter.isActive = false;
    }

    if (frequency && ['daily', 'weekly', 'monthly'].includes(frequency)) {
      filter['frequency.type'] = frequency;
    }

    const habits = await Habit.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Habit.countDocuments(filter);

    // Add reminder info
    const reminders = await ReminderService.getUserReminders(userId, 'habit');
    const habitsWithReminders = habits.map(habit => {
      const habitReminder = reminders.find(r => r.entityId.toString() === habit._id.toString());
      return {
        ...habit.toObject(),
        reminder: habitReminder ? {
          id: habitReminder._id,
          reminderDate: habitReminder.reminderDate,
          status: habitReminder.status
        } : null
      };
    });

    const responseData = {
      habits: habitsWithReminders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };

    return res
      .status(200)
      .json(new ApiResponse(200, responseData, 'Habits retrieved successfully'));
  });

  // Get a single habit
  static getHabit = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    const habit = await Habit.findOne({ _id: id, userId });

    if (!habit) {
      throw new ApiError(404, 'Habit not found');
    }

    // Get reminder info
    const reminders = await ReminderService.getUserReminders(userId, 'habit');
    const habitReminder = reminders.find(r => r.entityId.toString() === habit._id.toString());

    const habitWithReminder = {
      ...habit.toObject(),
      reminder: habitReminder ? {
        id: habitReminder._id,
        reminderDate: habitReminder.reminderDate,
        status: habitReminder.status
      } : null
    };

    return res
      .status(200)
      .json(new ApiResponse(200, habitWithReminder, 'Habit retrieved successfully'));
  });

  // Update a habit
  static updateHabit = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const updates = req.body;

    const habit = await Habit.findOneAndUpdate(
      { _id: id, userId },
      updates,
      { new: true, runValidators: true }
    );

    if (!habit) {
      throw new ApiError(404, 'Habit not found');
    }

    // Handle reminder updates if reminder settings changed
    const reminderChanged = (
      updates.reminderEnabled !== undefined ||
      updates.reminderTime !== undefined
    );

    if (reminderChanged) {
      try {
        const reminders = await ReminderService.getUserReminders(userId, 'habit');
        const existingReminder = reminders.find(r => r.entityId.toString() === habit._id.toString());

        if (habit.reminderEnabled) {
          const nextReminderDate = habit.getNextReminderDate();
          const reminderMessage = `Time for your habit: ${habit.name}!`;

          const reminderData = {
            reminderDate: nextReminderDate,
            title: `Habit Reminder: ${habit.name}`,
            message: reminderMessage
          };

          if (existingReminder) {
            await ReminderService.updateReminder(existingReminder._id, reminderData);
          } else {
            await ReminderService.createReminder(userId, 'habit', habit._id, {
              ...reminderData,
              reminderType: 'recurring',
              recurrence: { frequency: 'daily', interval: 1 }
            });
          }
        } else if (existingReminder && existingReminder.status === 'active') {
          await ReminderService.cancelReminder(existingReminder._id);
        }
      } catch (reminderError) {
        console.error('Error updating habit reminder:', reminderError);
      }
    }

    return res
      .status(200)
      .json(new ApiResponse(200, habit, 'Habit updated successfully'));
  });

  // Toggle habit active status
  static toggleHabitStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    const habit = await Habit.findOne({ _id: id, userId });

    if (!habit) {
      throw new ApiError(404, 'Habit not found');
    }

    habit.isActive = !habit.isActive;
    await habit.save();

    // Cancel reminder when deactivated
    if (!habit.isActive) {
      try {
        const reminders = await ReminderService.getUserReminders(userId, 'habit');
        const habitReminder = reminders.find(r => r.entityId.toString() === habit._id.toString());
        if (habitReminder && habitReminder.status === 'active') {
          await ReminderService.cancelReminder(habitReminder._id);
        }
      } catch (error) {
        console.error('Error canceling habit reminder:', error);
      }
    }

    const message = `Habit ${habit.isActive ? 'activated' : 'deactivated'} successfully`;

    return res
      .status(200)
      .json(new ApiResponse(200, habit, message));
  });

  // Delete a habit
  static deleteHabit = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    const habit = await Habit.findOneAndDelete({ _id: id, userId });

    if (!habit) {
      throw new ApiError(404, 'Habit not found');
    }

    // Cancel associated reminders
    try {
      const reminders = await ReminderService.getUserReminders(userId, 'habit');
      const habitReminders = reminders.filter(r => r.entityId.toString() === habit._id.toString());
      for (const reminder of habitReminders) {
        if (reminder.status === 'active') {
          await ReminderService.cancelReminder(reminder._id);
        }
      }
    } catch (error) {
      console.error('Error canceling habit reminders:', error);
    }

    return res
      .status(200)
      .json(new ApiResponse(200, {}, 'Habit deleted successfully'));
  });

  // Get habit statistics
  static getHabitStats = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const stats = await Habit.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } },
          inactive: { $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] } },
          withReminders: { $sum: { $cond: [{ $eq: ['$reminderEnabled', true] }, 1, 0] } },
          daily: { $sum: { $cond: [{ $eq: ['$frequency.type', 'daily'] }, 1, 0] } },
          weekly: { $sum: { $cond: [{ $eq: ['$frequency.type', 'weekly'] }, 1, 0] } },
          monthly: { $sum: { $cond: [{ $eq: ['$frequency.type', 'monthly'] }, 1, 0] } }
        }
      }
    ]);

    const reminderStats = await ReminderService.getReminderStats(userId);

    const responseData = {
      overview: stats[0] || {
        total: 0,
        active: 0,
        inactive: 0,
        withReminders: 0,
        daily: 0,
        weekly: 0,
        monthly: 0
      },
      reminders: reminderStats
    };

    return res
      .status(200)
      .json(new ApiResponse(200, responseData, 'Habit statistics retrieved successfully'));
  });
}

export default HabitController;