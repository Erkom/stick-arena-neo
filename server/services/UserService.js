const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db/db');

const JWT_SECRET = process.env.JWT_SECRET || 'stickarena-jwt-secret';
const SALT_ROUNDS = 10;

class UserService {
  // Register a new user
  async register(username, password, email) {
    try {
      // Check if username already exists
      const userCheck = await db.query('SELECT * FROM users WHERE username = $1', [username]);
      if (userCheck.rows.length > 0) {
        return { success: false, message: 'Username already exists' };
      }

      // Check if email already exists
      if (email) {
        const emailCheck = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (emailCheck.rows.length > 0) {
          return { success: false, message: 'Email already exists' };
        }
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

      // Insert the new user
      const result = await db.query(
        'INSERT INTO users (username, password, email) VALUES ($1, $2, $3) RETURNING id, username, email, creds',
        [username, hashedPassword, email]
      );

      // Generate JWT token
      const token = jwt.sign({ userId: result.rows[0].id }, JWT_SECRET, { expiresIn: '7d' });

      return {
        success: true,
        user: result.rows[0],
        token
      };
    } catch (error) {
      console.error('Error registering user:', error);
      return { success: false, message: 'Error registering user' };
    }
  }

  // Login existing user
  async login(username, password) {
    try {
      // Find user by username
      const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
      
      if (result.rows.length === 0) {
        return { success: false, message: 'User not found' };
      }

      const user = result.rows[0];

      // Compare password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        return { success: false, message: 'Invalid password' };
      }

      // Update last login
      await db.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

      // Generate JWT token
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          creds: user.creds
        },
        token
      };
    } catch (error) {
      console.error('Error logging in:', error);
      return { success: false, message: 'Error logging in' };
    }
  }

  // Get user by ID
  async getUserById(userId) {
    try {
      const result = await db.query(
        'SELECT id, username, email, creds, wins, losses, created_at FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return { success: false, message: 'User not found' };
      }

      return {
        success: true,
        user: result.rows[0]
      };
    } catch (error) {
      console.error('Error getting user:', error);
      return { success: false, message: 'Error getting user' };
    }
  }

  // Update user credits (creds)
  async updateCreds(userId, amount) {
    try {
      const result = await db.query(
        'UPDATE users SET creds = creds + $1 WHERE id = $2 RETURNING creds',
        [amount, userId]
      );

      if (result.rows.length === 0) {
        return { success: false, message: 'User not found' };
      }

      return {
        success: true,
        creds: result.rows[0].creds
      };
    } catch (error) {
      console.error('Error updating creds:', error);
      return { success: false, message: 'Error updating creds' };
    }
  }

  // Add cosmetic item to user
  async addItem(userId, itemType, itemId) {
    try {
      // Check if user already has this item
      const itemCheck = await db.query(
        'SELECT * FROM user_items WHERE user_id = $1 AND item_type = $2 AND item_id = $3',
        [userId, itemType, itemId]
      );

      if (itemCheck.rows.length > 0) {
        return { success: false, message: 'User already has this item' };
      }

      // Add the item
      const result = await db.query(
        'INSERT INTO user_items (user_id, item_type, item_id) VALUES ($1, $2, $3) RETURNING id',
        [userId, itemType, itemId]
      );

      return {
        success: true,
        itemId: result.rows[0].id
      };
    } catch (error) {
      console.error('Error adding item:', error);
      return { success: false, message: 'Error adding item' };
    }
  }

  // Get all items for a user
  async getUserItems(userId) {
    try {
      const result = await db.query(
        'SELECT * FROM user_items WHERE user_id = $1',
        [userId]
      );

      return {
        success: true,
        items: result.rows
      };
    } catch (error) {
      console.error('Error getting user items:', error);
      return { success: false, message: 'Error getting user items' };
    }
  }

  // Verify JWT token
  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return { success: true, userId: decoded.userId };
    } catch (error) {
      return { success: false, message: 'Invalid token' };
    }
  }
}

module.exports = new UserService();