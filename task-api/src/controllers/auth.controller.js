import asyncHandler from 'express-async-handler';
import * as authService from '../services/auth.service.js';

export const register = asyncHandler(async (req, res) => {
  const { user, token } = await authService.register(req.body);
  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: { user, token },
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { user, token } = await authService.login(email, password);
  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: { user, token },
  });
});

export const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: req.user,
  });
});
