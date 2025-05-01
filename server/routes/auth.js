const express = require('express');
const UserService = require('../services/UserService');
const router = express.Router();

// Middleware to authenticate requests
const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication token required' });
  }

  const result = UserService.verifyToken(token);
  
  if (!result.success) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }

  // Get user data
  const userResult = await UserService.getUserById(result.userId);
  
  if (!userResult.success) {
    return res.status(401).json({ success: false, message: 'User not found' });
  }

  req.user = userResult.user;
  next();
};

// Register endpoint
router.post('/register', async (req, res) => {
  const { username, password, email } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required' });
  }

  const result = await UserService.register(username, password, email);
  
  if (!result.success) {
    return res.status(400).json(result);
  }

  return res.status(201).json(result);
});

// Login endpoint
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required' });
  }

  const result = await UserService.login(username, password);
  
  if (!result.success) {
    return res.status(401).json(result);
  }

  return res.status(200).json(result);
});

// Get current user profile
router.get('/profile', authenticate, async (req, res) => {
  return res.status(200).json({ success: true, user: req.user });
});

// Get user items
router.get('/items', authenticate, async (req, res) => {
  const result = await UserService.getUserItems(req.user.id);
  
  if (!result.success) {
    return res.status(500).json(result);
  }

  return res.status(200).json(result);
});

// Update user credits
router.post('/creds', authenticate, async (req, res) => {
  const { amount } = req.body;
  
  if (!amount || isNaN(amount)) {
    return res.status(400).json({ success: false, message: 'Valid amount is required' });
  }

  const result = await UserService.updateCreds(req.user.id, amount);
  
  if (!result.success) {
    return res.status(500).json(result);
  }

  return res.status(200).json(result);
});

module.exports = router;