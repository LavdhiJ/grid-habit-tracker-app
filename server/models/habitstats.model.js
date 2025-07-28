import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError.js';

const { Schema } = mongoose;

const habitStatsSchema = new Schema({
  // References
  habitId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Habit', 
    required: [true, 'Habit ID is required'],
    index: true
  },
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: [true, 'User ID is required'],
    index: true
  },
  
  // Completion Data
  date: { 
    type: Date, 
    required: [true, 'Date is required'],
    index: true
  },
  completed: { 
    type: Boolean, 
    default: false,
    index: true
  },
  
  // Additional Metadata
  notes: { 
    type: String, 
    maxlength: [500, 'Notes cannot exceed 500 characters'],
    trim: true
  },
  completedAt: { 
    type: Date 
  },
  
  // For weekly/monthly habits - track progress within period
  progressCount: {
    type: Number,
    default: 0,
    min: [0, 'Progress count cannot be negative']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for better query performance
habitStatsSchema.index({ habitId: 1, date: 1 }, { unique: true });
habitStatsSchema.index({ userId: 1, date: -1 });
habitStatsSchema.index({ habitId: 1, completed: 1, date: -1 });
habitStatsSchema.index({ userId: 1, habitId: 1, date: -1 });

// Virtual for formatted date
habitStatsSchema.virtual('dateString').get(function() {
  return this.date.toISOString().split('T')[0]; // YYYY-MM-DD format
});

// Pre-save middleware
habitStatsSchema.pre('save', function(next) {
  // Set completedAt timestamp when marking as completed
  if (this.completed && !this.completedAt) {
    this.completedAt = new Date();
  }
  
  // Clear completedAt if uncompleted
  if (!this.completed) {
    this.completedAt = undefined;
  }
  
  next();
});

// Static method to mark habit completion
habitStatsSchema.statics.markCompletion = async function(habitId, userId, date, completed = true, notes = '') {
  try {
    if (!mongoose.Types.ObjectId.isValid(habitId)) {
      throw new ApiError(400, 'Invalid habit ID');
    }
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError(400, 'Invalid user ID');
    }

    // Normalize date to start of day
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);

    const updateData = {
      completed,
      notes: notes.trim(),
      userId // Ensure userId is set
    };

    if (completed) {
      updateData.completedAt = new Date();
    }

    const result = await this.findOneAndUpdate(
      { 
        habitId, 
        date: normalizedDate 
      },
      updateData,
      { 
        upsert: true, 
        new: true,
        runValidators: true 
      }
    );

    return result;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error.code === 11000) {
      throw new ApiError(400, 'Completion record already exists for this date');
    }
    throw new ApiError(500, 'Error marking habit completion');
  }
};

// Static method to get completion data for date range
habitStatsSchema.statics.getCompletionData = async function(habitId, startDate, endDate) {
  try {
    if (!mongoose.Types.ObjectId.isValid(habitId)) {
      throw new ApiError(400, 'Invalid habit ID');
    }

    return await this.find({
      habitId,
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }).sort({ date: 1 });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, 'Error fetching completion data');
  }
};

// Static method to get user's all habit completions for a date range
habitStatsSchema.statics.getUserCompletions = async function(userId, startDate, endDate) {
  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError(400, 'Invalid user ID');
    }

    return await this.find({
      userId,
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }).populate('habitId', 'name frequency icon').sort({ date: -1 });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, 'Error fetching user completions');
  }
};

// Static method to get completion stats for a habit
habitStatsSchema.statics.getHabitStats = async function(habitId, timeframe = {}) {
  try {
    if (!mongoose.Types.ObjectId.isValid(habitId)) {
      throw new ApiError(400, 'Invalid habit ID');
    }

    const matchQuery = { habitId };
    
    if (timeframe.startDate && timeframe.endDate) {
      matchQuery.date = {
        $gte: new Date(timeframe.startDate),
        $lte: new Date(timeframe.endDate)
      };
    }

    const stats = await this.aggregate([
      { $match: matchQuery },
      { $sort: { date: 1 } },
      {
        $group: {
          _id: '$habitId',
          totalDays: { $sum: 1 },
          completedDays: { 
            $sum: { $cond: ['$completed', 1, 0] } 
          },
          completions: { $push: '$$ROOT' }
        }
      }
    ]);

    if (stats.length === 0) {
      return {
        totalDays: 0,
        completedDays: 0,
        completionRate: 0,
        completions: []
      };
    }

    const result = stats[0];
    result.completionRate = result.totalDays > 0 
      ? Math.round((result.completedDays / result.totalDays) * 100) 
      : 0;

    return result;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, 'Error calculating habit stats');
  }
};

// Static method to get heatmap data
habitStatsSchema.statics.getHeatmapData = async function(habitId, year) {
  try {
    if (!mongoose.Types.ObjectId.isValid(habitId)) {
      throw new ApiError(400, 'Invalid habit ID');
    }

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    const completions = await this.find({
      habitId,
      completed: true,
      date: { $gte: startDate, $lte: endDate }
    }).select('date').lean();

    // Convert to simple date strings for heatmap
    return completions.map(completion => ({
      date: completion.date.toISOString().split('T')[0],
      count: 1
    }));
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, 'Error generating heatmap data');
  }
};

// Static method to delete all stats for a habit
habitStatsSchema.statics.deleteHabitStats = async function(habitId) {
  try {
    if (!mongoose.Types.ObjectId.isValid(habitId)) {
      throw new ApiError(400, 'Invalid habit ID');
    }

    const result = await this.deleteMany({ habitId });
    return result;
  } catch (error) {
    throw new ApiError(500, 'Error deleting habit stats');
  }
};

// Instance method to toggle completion status
habitStatsSchema.methods.toggleCompletion = async function() {
  this.completed = !this.completed;
  
  if (this.completed) {
    this.completedAt = new Date();
  } else {
    this.completedAt = undefined;
  }
  
  return await this.save();
};

const HabitStats = mongoose.model('HabitStats', habitStatsSchema);

export default HabitStats;