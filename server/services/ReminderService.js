import Reminder from '../models/reminder.model.js';
import Task from '../models/task.model.js';
import Habit from '../models/habit.model.js';
import Reflection from '../models/reflection.model.js';
import SocketService from './SocketService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import mongoose from 'mongoose';

class ReminderService {
  
  // Model mapping for dynamic population
  static modelMap = {
    task: Task,
    habit: Habit,
    reflection: Reflection
  };

  static checkAndSendReminders = asyncHandler(async () => {
    const now = new Date();
    
    // Find all due reminders across all entity types
    const dueReminders = await Reminder.find({
      reminderDate: { $lte: now },
      status: 'active'
    }).populate('userId', 'email name');

    console.log(`Found ${dueReminders.length} due reminders`);

    for (const reminder of dueReminders) {
      await this.processReminder(reminder);
    }
  });

  static processReminder = asyncHandler(async (reminder) => {
    // Get the actual entity (task, habit, etc.)
    const entity = await this.getEntityDetails(reminder);
    
    if (!entity) {
      // Entity was deleted, cancel reminder
      reminder.status = 'cancelled';
      await reminder.save();
      console.log(`Cancelled reminder for deleted ${reminder.entityType}`);
      return;
    }

    // Send notification
    await this.sendReminderNotification(reminder, entity);
    
    // Handle recurrence or mark as sent
    await this.handleReminderCompletion(reminder);
  });

  static getEntityDetails = asyncHandler(async (reminder) => {
    const Model = this.modelMap[reminder.entityType];
    if (!Model) {
      throw new ApiError(400, `Unknown entity type: ${reminder.entityType}`);
    }
    
    const entity = await Model.findById(reminder.entityId);
    return entity;
  });

  static sendReminderNotification = asyncHandler(async (reminder, entity) => {
    const notificationData = {
      id: reminder._id,
      type: 'reminder',
      entityType: reminder.entityType,
      entityId: reminder.entityId,
      title: this.generateTitle(reminder, entity),
      message: this.generateMessage(reminder, entity),
      timestamp: new Date()
    };

    // Send via WebSocket
    const isDelivered = await SocketService.sendToUser(
      reminder.userId._id, 
      'reminder_notification', 
      notificationData
    );

    if (!isDelivered) {
      // Store for offline delivery
      await SocketService.storeOfflineNotification(
        reminder.userId._id, 
        notificationData
      );
    }

    console.log(`🔔 REMINDER: ${notificationData.title} for user ${reminder.userId.name || reminder.userId.email}`);
  });

  static generateTitle(reminder, entity) {
    const entityTypeMap = {
      task: 'Task Reminder',
      habit: 'Habit Reminder',
     
      reflection: 'Reflection Reminder'
    };
    
    return reminder.metadata?.title || 
           `${entityTypeMap[reminder.entityType]}: ${entity.title || entity.name}`;
  }

  static generateMessage(reminder, entity) {
    if (reminder.metadata?.message) {
      return reminder.metadata.message;
    }

    const messageMap = {
      task: `Don't forget to complete: ${entity.title}`,
      habit: `Time for your habit: ${entity.name}`,
      reflection: `Time to reflect on: ${entity.title}`
    };

    return messageMap[reminder.entityType] || `Reminder for ${entity.title || entity.name}`;
  }

  static handleReminderCompletion = asyncHandler(async (reminder) => {
    if (reminder.reminderType === 'recurring') {
      // Calculate next reminder date
      const nextDate = this.calculateNextReminderDate(reminder);
      
      if (nextDate && (!reminder.recurrence?.endDate || nextDate <= reminder.recurrence.endDate)) {
        reminder.reminderDate = nextDate;
        reminder.sentAt = new Date();
        await reminder.save();
        console.log(`Recurring reminder rescheduled for: ${nextDate}`);
      } else {
        reminder.status = 'cancelled';
        await reminder.save();
        console.log('Recurring reminder ended');
      }
    } else {
      // One-time reminder
      reminder.status = 'sent';
      reminder.sentAt = new Date();
      await reminder.save();
    }
  });

  static calculateNextReminderDate(reminder) {
    if (!reminder.recurrence?.frequency) {
      return null;
    }

    const current = new Date(reminder.reminderDate);
    const { frequency, interval = 1 } = reminder.recurrence;

    switch (frequency) {
      case 'daily':
        return new Date(current.setDate(current.getDate() + interval));
      
      case 'weekly':
        return new Date(current.setDate(current.getDate() + (7 * interval)));
      
      case 'monthly':
        return new Date(current.setMonth(current.getMonth() + interval));
      
      default:
        return null;
    }
  }

  // Create reminder for any entity
  static createReminder = asyncHandler(async (userId, entityType, entityId, reminderData) => {
    if (!userId || !entityType || !entityId) {
      throw new ApiError(400, 'User ID, entity type, and entity ID are required');
    }

    if (!reminderData?.reminderDate) {
      throw new ApiError(400, 'Reminder date is required');
    }

    // Validate entity type
    if (!this.modelMap[entityType]) {
      throw new ApiError(400, 'Invalid entity type');
    }

    // Verify entity exists
    const Model = this.modelMap[entityType];
    const entity = await Model.findById(entityId);
    if (!entity) {
      throw new ApiError(404, `${entityType} not found`);
    }

    const reminder = new Reminder({
      userId,
      entityType,
      entityId,
      reminderDate: new Date(reminderData.reminderDate),
      reminderType: reminderData.reminderType || 'one-time',
      recurrence: reminderData.recurrence,
      metadata: {
        title: reminderData.title,
        message: reminderData.message
      }
    });

    const savedReminder = await reminder.save();
    return savedReminder;
  });

  // Get all reminders for a user
  static getUserReminders = asyncHandler(async (userId, entityType = null) => {
    if (!userId) {
      throw new ApiError(400, 'User ID is required');
    }

    const query = { userId };
    if (entityType) {
      if (!this.modelMap[entityType]) {
        throw new ApiError(400, 'Invalid entity type');
      }
      query.entityType = entityType;
    }
    
    const reminders = await Reminder.find(query)
      .populate('userId', 'name email')
      .sort({ reminderDate: 1 });

    return reminders;
  });

  // Cancel reminder
  static cancelReminder = asyncHandler(async (reminderId) => {
    if (!reminderId) {
      throw new ApiError(400, 'Reminder ID is required');
    }

    const reminder = await Reminder.findByIdAndUpdate(
      reminderId, 
      { status: 'cancelled' }, 
      { new: true }
    );

    if (!reminder) {
      throw new ApiError(404, 'Reminder not found');
    }

    return reminder;
  });

  // Get reminder statistics for a user
  static getReminderStats = asyncHandler(async (userId) => {
    if (!userId) {
      throw new ApiError(400, 'User ID is required');
    }

    const stats = await Reminder.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          oneTime: { $sum: { $cond: [{ $eq: ['$reminderType', 'one-time'] }, 1, 0] } },
          recurring: { $sum: { $cond: [{ $eq: ['$reminderType', 'recurring'] }, 1, 0] } }
        }
      }
    ]);

    return stats[0] || {
      total: 0,
      active: 0,
      sent: 0,
      cancelled: 0,
      oneTime: 0,
      recurring: 0
    };
  });
  // Add this method to your existing ReminderService class

  // Update reminder
  static updateReminder = asyncHandler(async (reminderId, updateData) => {
    if (!reminderId) {
      throw new ApiError(400, 'Reminder ID is required');
    }

    const updateFields = {};
    
    if (updateData.reminderDate) {
      updateFields.reminderDate = new Date(updateData.reminderDate);
    }
    
    if (updateData.reminderType) {
      updateFields.reminderType = updateData.reminderType;
    }
    
    if (updateData.recurrence) {
      updateFields.recurrence = updateData.recurrence;
    }
    
    if (updateData.title || updateData.message) {
      updateFields.metadata = {};
      if (updateData.title) updateFields.metadata.title = updateData.title;
      if (updateData.message) updateFields.metadata.message = updateData.message;
    }

    const reminder = await Reminder.findByIdAndUpdate(
      reminderId,
      updateFields,
      { new: true, runValidators: true }
    );

    if (!reminder) {
      throw new ApiError(404, 'Reminder not found');
    }

    return reminder;
  });
}

export default ReminderService;