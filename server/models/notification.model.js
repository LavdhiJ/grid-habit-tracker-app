import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['reminder', 'system', 'achievement'],
    default: 'reminder'
  },
  entityType: {
    type: String,
    enum: ['task', 'habit', 'memory', 'prompt', 'reflection']
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
 
  read: {
    type: Boolean,
    default: false
  },
  delivered: {
    type: Boolean,
    default: false
  },
  deliveredAt: Date
}, {
  timestamps: true
});

notificationSchema.index({ userId: 1, read: 1 });
notificationSchema.index({ userId: 1, delivered: 1 });

export default mongoose.model('Notification', notificationSchema);