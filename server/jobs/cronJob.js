import cron from 'node-cron';
import ReminderService from '../services/ReminderService.js';
import Reminder from '../models/reminder.model.js'

export const initializeCronJobs = () => {
  console.log(' Starting reminder cron jobs...');

  // Every minute: check for due reminders
  cron.schedule('* * * * *', async () => {
    console.log(' Checking for due reminders...');
    try {
      await ReminderService.checkAndSendReminders();
    } catch (error) {
      console.error(' Error while sending reminders:', error);
    }
  });

  // Every day at midnight: clean up old reminders
  cron.schedule('0 0 * * *', async () => {
    console.log('🧹 Running reminder cleanup...');
    await CleanupOldReminders();
  });

  console.log('✅ Cron jobs initialized');
};

export const CleanupOldReminders = async () => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await Reminder.deleteMany({
      status: { $in: ['sent', 'cancelled'] },
      updatedAt: { $lt: thirtyDaysAgo }
    });

    console.log(` Cleaned up ${result.deletedCount} old reminders`);
  } catch (error) {
    console.error('Error in reminder cleanup:', error);
  }
};
