import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: null,
  },
  due_date: {
    type: Date,
    default: null,
  },
  reminder: {
  type: Boolean,
  default: false,
},
reminderSent: {
  type: Boolean,
  default: false,
},

  reminder_date: {
    type: Date,
    default: null,
  },
  status: {
    type: String,
    enum: ['todo', 'done'],
    default: 'todo',
  },
  completed_at: {
    type: Date,
    default: null,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  created_at: {
    type: Date,
    default: () => new Date(),
  },
  updated_at: {
    type: Date,
    default: () => new Date(),
  },
});

taskSchema.pre('save', function (next) {
  this.updated_at = new Date();
  next();
});

const Task = mongoose.model('Task', taskSchema);
export default Task;
