import cron from 'node-cron';
import ReminderService from '../services/ReminderService.js';

export const initializeCronJobs = () => {
  console.log('🕐 Initializing cron jobs...');

  // Check for reminders every minute
  cron.schedule('* * * * *', async () => {
    await ReminderService.checkAndSendReminders();
  });

  // Optional: Daily cleanup of old completed tasks
  cron.schedule('0 2 * * *', async () => {
    console.log('🧹 Running daily cleanup...');
    // Add cleanup logic here
  });

  console.log('✅ Cron jobs initialized');
};