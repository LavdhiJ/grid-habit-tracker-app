// models/reflection.model.js
import mongoose from "mongoose";

const reflectionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  text: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 5000
  },
  date: {
    type: Date,
    default: () => new Date().setHours(0, 0, 0, 0),
    index: true
  },
  suggestedPrompt: {
    type: String,
    default: null
  },
  promptId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Prompt",
    default: null
  },
  usedSuggestion: {
    type: Boolean,
    default: false
  },
  mood: {
    type: String,
    enum: ["happy", "neutral", "sad", "stressed", "excited", "angry", "calm", "grateful", "anxious", "content", "none"],
    default: "none",
    index: true
  },
  tags: [{
    type: String,
    lowercase: true,
    trim: true
  }],
  wordCount: {
    type: Number,
    default: 0
  },
  characterCount: {
    type: Number,
    default: 0
  },
  isPrivate: {
    type: Boolean,
    default: true
  },
  
}, { 
  timestamps: true 
});

// Compound index for unique daily reflections per user
reflectionSchema.index({ userId: 1, date: 1 }, { unique: true });

// Index for efficient querying
reflectionSchema.index({ userId: 1, createdAt: -1 });
reflectionSchema.index({ userId: 1, mood: 1 });
reflectionSchema.index({ tags: 1 });

// Pre-save middleware to calculate word and character count
reflectionSchema.pre('save', function(next) {
  if (this.isModified('text')) {
    this.wordCount = this.text.split(/\s+/).filter(word => word.length > 0).length;
    this.characterCount = this.text.length;
  }
  next();
});

export default mongoose.model("Reflection", reflectionSchema);