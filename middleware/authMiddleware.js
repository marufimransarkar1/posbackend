import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import mongoose from 'mongoose'; // Added to validate ID format

export const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      
      // 1. Verify Token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 2. Safety Check: Ensure the ID in the token is a valid ObjectId
      // This prevents the "BSONError" if a malformed token is sent
      if (!mongoose.Types.ObjectId.isValid(decoded.id)) {
        res.status(401);
        throw new Error('Invalid user ID format in token');
      }

      // 3. Find User
      req.user = await User.findById(decoded.id).select('-password');

      // 4. Validate User Existence and Status
      if (!req.user) {
        res.status(401);
        throw new Error('User no longer exists');
      }

      if (req.user.isActive === false) {
        res.status(401);
        throw new Error('User account is deactivated');
      }

      next();
    } catch (error) {
      // Pass the specific error message if it's one of our thrown errors
      res.status(401);
      throw new Error(error.message || 'Token invalid or expired');
    }
  } else {
    // Handling the "No token" case outside the try/catch for clarity
    res.status(401);
    throw new Error('No token provided, authorization denied');
  }
});

export const authorize = (...roles) => (req, res, next) => {
  // Always check if req.user exists first (it should if protect ran)
  if (!req.user || !roles.includes(req.user.role)) {
    res.status(403);
    throw new Error(`Access denied: Role '${req.user?.role || 'unknown'}' is not authorized`);
  }
  next();
};