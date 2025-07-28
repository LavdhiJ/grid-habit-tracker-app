import { Router } from 'express';
import ReminderService from '../services/ReminderService.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

const router = Router();

// Apply auth middleware to all routes
router.use(verifyJWT);

// Create a new reminder
router.post("/create", asyncHandler(async (req, res) => {
  const { entityType, entityId, reminderDate, reminderType, recurrence, title, message, priority } = req.body;
  
  if (!entityType || !entityId || !reminderDate) {
    throw new ApiError(400, "Entity type, entity ID, and reminder date are required");
  }
  
  const reminderData = {
    reminderDate: new Date(reminderDate),
    reminderType,
    recurrence,
    title,
    message,
    priority
  };
  
  const reminder = await ReminderService.createReminder(
    req.user._id,
    entityType,
    entityId,
    reminderData
  );
  
  return res.status(201).json(
    new ApiResponse(201, reminder, "Reminder created successfully")
  );
}));

// Get user's reminders
router.get("/", asyncHandler(async (req, res) => {
  const { entityType } = req.query;
  
  const reminders = await ReminderService.getUserReminders(
    req.user._id,
    entityType
  );
  
  return res.status(200).json(
    new ApiResponse(200, reminders, "Reminders fetched successfully")
  );
}));

// Cancel a reminder
router.patch("/:reminderId/cancel", asyncHandler(async (req, res) => {
  const { reminderId } = req.params;
  
  const reminder = await ReminderService.cancelReminder(reminderId);
  
  if (!reminder) {
    throw new ApiError(404, "Reminder not found");
  }
  
  return res.status(200).json(
    new ApiResponse(200, reminder, "Reminder cancelled successfully")
  );
}));

// Snooze a reminder
router.patch("/:reminderId/snooze", asyncHandler(async (req, res) => {
  const { reminderId } = req.params;
  const { snoozeMinutes = 15 } = req.body;
  
  const reminder = await ReminderService.snoozeReminder(reminderId, snoozeMinutes);
  
  if (!reminder) {
    throw new ApiError(404, "Reminder not found");
  }
  
  return res.status(200).json(
    new ApiResponse(200, reminder, `Reminder snoozed for ${snoozeMinutes} minutes`)
  );
}));

export default router;