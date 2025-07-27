import { User } from '../models/user.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
// Helper function to generate tokens
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // Save refresh token to database
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, 'Something went wrong while generating tokens');
  }
};

export const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;
  
  if (!username || !email || !password) {
    throw new ApiError(400, 'All fields are required');
  }

  // Check if user already exists
  const userExists = await User.findOne({
    $or: [{ username }, { email }]
  });
  
  if (userExists) {
    throw new ApiError(409, 'User with email or username already exists');
  }

  // Create user
  const user = await User.create({
    username: username.toLowerCase(),
    email,
    password
  });

  // Generate tokens
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

  // Get created user without password
  const createdUser = await User.findById(user._id).select('-password -refreshToken');

  const response = new ApiResponse(
    201,
    {
      user: createdUser,
      accessToken,
      refreshToken
    },
    'User registered successfully'
  );

  res.status(201).json(response);
});

export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required');
  }

  // Find user with password field
  const user = await User.findOne({ email }).select("+password");
  
  if (!user) {
    throw new ApiError(401, 'Invalid credentials');
  }

  // Check password
  const isPasswordValid = await user.comparePassword(password);
  
  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid credentials');
  }

  // Generate tokens
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

  // Get user without sensitive data
  const loggedInUser = await User.findById(user._id).select('-password -refreshToken');

  const response = new ApiResponse(
    200,
    {
      user: loggedInUser,
      accessToken,
      refreshToken
    },
    'User logged in successfully'
  );

  res.status(200).json(response);
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  const response = new ApiResponse(
    200,
    { user: req.user },
    'Current user fetched successfully'
  );
  
  res.status(200).json(response);
});  
 // Add this logout function to your existing user controller

export const logoutUser = asyncHandler(async (req, res) => {
  // Remove refresh token from database
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1 // This removes the field from document
      }
    },
    {
      new: true
    }
  );

  // Cookie options for clearing cookies
  const options = {
    httpOnly: true,
    secure: true
   
  };

  const response = new ApiResponse(
    200,
    {},
    'User logged out successfully'
  );

  // Clear cookies and send response
  res
    .status(200)
    .clearCookie('accessToken', options)
    .clearCookie('refreshToken', options)
    .json(response);
});



