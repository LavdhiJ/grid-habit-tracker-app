// models/prompt.model.js
import mongoose from "mongoose";

const promptSchema = new mongoose.Schema({
  text: { 
    type: String, 
    required: true,
    unique: true,
    trim: true,
    minlength: 10,
    maxlength: 500
  },
  category: { 
    type: String,
    lowercase: true,
    trim: true,
    default: 'general',
    index: true
  },
  isActive: { 
    type: Boolean, 
    default: true,
    index: true
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  tags: [{
    type: String,
    lowercase: true,
    trim: true
  }],
  usageCount: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  }
}, { 
  timestamps: true 
});

// Indexes for efficient querying
promptSchema.index({ category: 1, isActive: 1 });
promptSchema.index({ tags: 1 });
promptSchema.index({ difficulty: 1, isActive: 1 });

export default mongoose.model("Prompt", promptSchema);

