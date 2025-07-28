import mongoose from 'mongoose';

const reminderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  entityType: {
    type: String,
    required: true,
    enum: ['task', 'habit', 'memory', 'prompt', 'reflection']
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'entityType'
  },
  reminderDate: {
    type: Date,
    required: true
  },
  reminderType: {
    type: String,
    enum: ['one-time', 'recurring'],
    default: 'one-time'
  },
  recurrence: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'custom']
    },
    interval: Number,
    daysOfWeek: [Number],
    endDate: Date
  },
  status: {
    type: String,
    enum: ['active', 'sent', 'cancelled'],
    default: 'active'
  },
  sentAt: Date,
  metadata: {
    title: String,
    message: String
  }
}, {
  timestamps: true
});

reminderSchema.index({ reminderDate: 1, status: 1 });
reminderSchema.index({ userId: 1, entityType: 1, entityId: 1 });

export default mongoose.model('Reminder', reminderSchema);