// services/ReminderService.js
import Task from "../models/task.model.js";

class ReminderService {
  static async checkAndSendReminders() {
    try {
      const now = new Date();
      
      // Find due reminders - you may want to add 'reminder_sent' field
      const dueReminders = await Task.find({
        reminder_date: { $lte: now },
        status: 'todo'
        // reminder_sent: false  // Add this field to avoid duplicate reminders
      }).populate('userId', 'email name');

      console.log(`Found ${dueReminders.length} due reminders`);

      for (const task of dueReminders) {
        await this.sendReminderNotification(task);
        
        // Mark as sent - you'll need to add this field to schema
        // task.reminder_sent = true;
        // await task.save();
      }
    } catch (error) {
      console.error('Error checking reminders:', error);
    }
  }

  static async sendReminderNotification(task) {
    console.log(`🔔 REMINDER: ${task.title} for user ${task.userId.name || task.userId.email}`);
    // TODO: Add actual notification sending
  }
}

export default ReminderService;