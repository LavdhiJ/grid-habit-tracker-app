import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError.js';

const { Schema } = mongoose;

const habitSchema = new Schema({
  // Basic Info
  name: { 
    type: String, 
    required: [true, 'Habit name is required'], 
    maxlength: [50, 'Habit name cannot exceed 50 characters'],
    trim: true
  },
  description: { 
    type: String, 
    maxlength: [200, 'Description cannot exceed 200 characters'],
    trim: true
  },
 
  
  // User Association
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: [true, 'User ID is required'],
    index: true
  },
  
  // Frequency Configuration
  frequency: {
    type: { 
      type: String, 
      enum: {
        values: ['daily', 'weekly', 'monthly'],
        message: 'Frequency type must be daily, weekly, or monthly'
      },
      required: [true, 'Frequency type is required']
    },
    target: { 
      type: Number, 
      required: [true, 'Target is required'],
      min: [1, 'Target must be at least 1'],
     
    }
  },
  
  // Reminder Settings
  reminderEnabled: {
    
      type: Boolean, 
      default: true 
    },
    reminderTime: { 
      type: String, 
      default: "09:00",
      validate: {
        validator: function(v) {
          return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: 'Time must be in HH:MM format (24-hour)'
      }
    },
    
  
  
  // Status and Timestamps
  isActive: { 
    type: Boolean, 
    default: true 
  },
  startDate: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
habitSchema.index({ userId: 1, isActive: 1 });
habitSchema.index({ userId: 1, createdAt: -1 });
habitSchema.index({ reminderEnabled: 1, reminderTime: 1 });

// Virtual for status
// Helper method to get next reminder date
habitSchema.methods.getNextReminderDate = function(fromDate = new Date()) {
  if (!this.reminderEnabled) return null;

  const [hours, minutes] = this.reminderTime.split(':').map(Number);
  const nextReminder = new Date(fromDate);
  nextReminder.setHours(hours, minutes, 0, 0);

  // If time has passed today, move to tomorrow
  if (nextReminder <= fromDate) {
    nextReminder.setDate(nextReminder.getDate() + 1);
  }

  return nextReminder;
};

const Habit = mongoose.model('Habit', habitSchema);

export default Habit;