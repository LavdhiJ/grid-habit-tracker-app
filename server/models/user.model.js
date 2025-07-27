// server/models/user.model.js

import mongoose , {Schema} from 'mongoose';
import bcrypt from 'bcryptjs';
import  jwt from 'jsonwebtoken';

const userSchema = new Schema({
  username: {
    type: String,
    required: [true,'Username is required'],
    minlength :[3 , 'Please enter a username with at least 3 characters'],
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: [true,'Email is required'],
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false
  },
  profileImage: {
    type: String,
    default: null
  },
  preferences: {
    reminderTime: {
      type: String,
      default: '20:00'
    },
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'light'
    },
    language: {
      type: String,
      default: 'en'
    }
  },
  stats: {
    totalHabits: {
      type: Number,
      default: 0
    },
    completedTasks: {
      type: Number,
      default: 0
    },
    longestStreak: {
      type: Number,
      default: 0
    },
    totalReflections: {
      type: Number,
      default: 0
    }
  },
  isVerified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Change your User model methods to match your .env names:

userSchema.methods.generateAccessToken = function() {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username
    },
    process.env.JWT_SECRET, // ✅ Uses JWT_SECRET from your .env
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '1d' // ✅ Uses JWT_EXPIRES_IN from your .env
    }
  );
};

userSchema.methods.generateRefreshToken = function() {
  return jwt.sign(
    {
      _id: this._id
    },
    process.env.JWT_REFRESH_SECRET, // ✅ Uses JWT_REFRESH_SECRET from your .env
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '10d' // ✅ Uses JWT_REFRESH_EXPIRES_IN from your .env
    }
  );
};

export const User = mongoose.model('User', userSchema);
