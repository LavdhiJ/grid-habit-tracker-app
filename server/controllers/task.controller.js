import Task from "../models/task.model.js";
import { extractDateFromText } from '../utils/parseData.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js'; 
import mongoose from "mongoose";

class TaskController {
  static extractTaskDetails(input) {
    let taskText = input.trim();
    let hasReminder = false;
    let reminderDate = null;

    const extractedDateTime = extractDateFromText(input);

    if (taskText.toLowerCase().includes('remind me') || taskText.toLowerCase().includes('reminder')) {
      hasReminder = true;
      reminderDate = extractedDateTime;
      taskText = taskText.replace(/remind me to|reminder to|remind|reminder/gi, '').trim();
    }

    taskText = taskText
      .replace(/\b(at|on|by|before|after|in|for|today|tomorrow|yesterday)\s+[\w\s:,]*?\b/gi, '')
      .replace(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi, '')
      .replace(/\b(morning|afternoon|evening|night|am|pm)\b/gi, '')
      .replace(/\b\d{1,2}:\d{2}\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    taskText = taskText.replace(/^to\s+/i, '');

    if (taskText.length > 0) {
      taskText = taskText.charAt(0).toUpperCase() + taskText.slice(1);
    }

    if (!taskText || taskText.length < 3) {
      taskText = input.replace(/\b(at|on|by|before|after|in|for)\s+[\w\s:,]*?\b/gi, '').trim();
      taskText = taskText.length > 0 ? taskText.charAt(0).toUpperCase() + taskText.slice(1) : 'New Task';
    }

    return {
      title: taskText,
      due_date: hasReminder ? null : extractedDateTime,
      reminder_date: reminderDate
    };
  }

  static createTask = asyncHandler(async (req, res) => {
    const { input, description } = req.body;
    const userId = req.user.id;

    if (!input || input.trim().length === 0) {
      throw new ApiError(400, 'Task input is required');
    }

    const taskDetails = TaskController.extractTaskDetails(input);

    const task = new Task({
      title: taskDetails.title,
      description: description || null,
      due_date: taskDetails.due_date,
      reminder_date: taskDetails.reminder_date,
      reminder: !!taskDetails.reminder_date,
        reminderSent: false,
      userId
    });

    await task.save();

    return res
      .status(201)
      .json(new ApiResponse(201, task, 'Task created successfully'));
  });

  static getTasks = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { status, date, upcoming = false, overdue = false, page = 1, limit = 20 } = req.query;

    const filter = { userId };

    if (status && ['todo', 'done'].includes(status)) {
      filter.status = status;
    }

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);

      filter.$or = [
        {
          due_date: {
            $gte: startDate,
            $lt: endDate
          }
        },
        {
          reminder_date: {
            $gte: startDate,
            $lt: endDate
          }
        }
      ];
    }

    if (upcoming === 'true') {
      const now = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(now.getDate() + 7);

      filter.$or = [
        { due_date: { $gte: now, $lte: nextWeek } },
        { reminder_date: { $gte: now, $lte: nextWeek } }
      ];
      filter.status = 'todo';
    }

    if (overdue === 'true') {
      const now = new Date();
      filter.$or = [
        { due_date: { $lt: now } },
        { reminder_date: { $lt: now } }
      ];
      filter.status = 'todo';
    }

    const tasks = await Task.find(filter)
      .sort({ due_date: 1, reminder_date: 1, created_at: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Task.countDocuments(filter);

    const responseData = {
      tasks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };

    return res
      .status(200)
      .json(new ApiResponse(200, responseData, 'Tasks retrieved successfully'));
  });

  static getTask = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    const task = await Task.findOne({ _id: id, userId });

    if (!task) {
      throw new ApiError(404, 'Task not found');
    }

    return res
      .status(200)
      .json(new ApiResponse(200, task, 'Task retrieved successfully'));
  });

  static updateTask = asyncHandler(async (req, res) => {
    if (!req.body ||Object.keys(req.body).length === 0) {
    throw new ApiError(400, 'Missing request body');
  }
   console.log('req.body:', req.body);
    const { id } = req.params;
    const userId = req.user.id;
    const updates = req.body;

    if (updates.input) {
      const taskDetails = TaskController.extractTaskDetails(updates.input);
      updates.title = taskDetails.title;
      updates.due_date = taskDetails.due_date;
      updates.reminder_date = taskDetails.reminder_date;
      delete updates.input;
    }
    

    const task = await Task.findOneAndUpdate(
      { _id: id, userId },
      updates,
      { new: true, runValidators: true }
    );

    if (!task) {
      throw new ApiError(404, 'Task not found');
    }

    return res
      .status(200)
      .json(new ApiResponse(200, task, 'Task updated successfully'));
  });

  static toggleTask = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    const task = await Task.findOne({ _id: id, userId });

    if (!task) {
      throw new ApiError(404, 'Task not found');
    }

    if (task.status === 'todo') {
      task.status = 'done';
      task.completed_at = new Date();
    } else {
      task.status = 'todo';
      task.completed_at = null;
    }

    await task.save();

    const message = `Task ${task.status === 'done' ? 'completed' : 'reopened'} successfully`;

    return res.status(200).json(new ApiResponse(200, task, message));
  });

  static deleteTask = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    const task = await Task.findOneAndDelete({ _id: id, userId });

    if (!task) {
      throw new ApiError(404, 'Task not found');
    }

    return res.status(200).json(new ApiResponse(200, {}, 'Task deleted successfully'));
  });

  static getTaskStats = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const now = new Date();

    const stats = await Task.aggregate([
      { $match: {userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'todo'] }, 1, 0] } },
          overdue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $or: [
                        { $lt: ['$due_date', now] },
                        { $lt: ['$reminder_date', now] }
                      ]
                    },
                    { $eq: ['$status', 'todo'] },
                    {
                      $or: [
                        { $ne: ['$due_date', null] },
                        { $ne: ['$reminder_date', null] }
                      ]
                    }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    const responseData = {
      overview: stats[0] || {
        total: 0,
        completed: 0,
        pending: 0,
        overdue: 0
      }
    };

    return res
      .status(200)
      .json(new ApiResponse(200, responseData, 'Task statistics retrieved successfully'));
  });

  static getDueReminders = asyncHandler(async (req, res) => {
    const now = new Date();

    const dueReminders = await Task.find({
      reminder_date: { $lte: now },
      status: 'todo',
    }).populate('userId', 'email name');

    return res
      .status(200)
      .json(new ApiResponse(200, dueReminders, 'Due reminders retrieved successfully'));
  });
}

export default TaskController;
