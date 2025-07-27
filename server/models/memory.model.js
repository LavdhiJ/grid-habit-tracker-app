import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError.js'; // Adjust path as needed

const memorySchema = new mongoose.Schema({
  title: {
    type: String,
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters'],
    default: ''
  },
  content: {
    type: String,
    trim: true,
    maxlength: [100000, 'Content cannot be more than 100000 characters'],
    default: ''
  },
  tags: {
    type: [String],
    default: [],
    validate: {
      validator: function (tags) {
        return tags.length <= 20;
      },
      message: 'Cannot have more than 20 tags per note'
    }
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance and search
memorySchema.index({ userId: 1, createdAt: -1 });
memorySchema.index({ userId: 1, tags: 1 });
memorySchema.index({ userId: 1, title: 'text', content: 'text' });

// Virtual field to get formatted date
memorySchema.virtual('date').get(function () {
  return this.createdAt.toISOString().split('T')[0];
});

const Memory = mongoose.model('Memory', memorySchema);
export default Memory;
