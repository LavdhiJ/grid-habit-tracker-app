import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    // Get token from cookies or Authorization header
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
    
    if (!token) {
      throw new ApiError(401, "Unauthorized request");
    }
    
    // Verify the token
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user from token
    const user = await User.findById(decodedToken?._id).select("-password -refreshToken");
    
    if (!user) {
      throw new ApiError(401, "Invalid access token");
    }
    
    // Add user to request object
    req.user = user;
    next();
    
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token");
  }
}); 
