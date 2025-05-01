const { Pool } = require('pg');

// Create a new pool of PostgreSQL connections
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'stickarena',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

// Initialize the database with required tables
const initDatabase = async () => {
  try {
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        creds INTEGER DEFAULT 0,
        wins INTEGER DEFAULT 0,
        losses INTEGER DEFAULT 0,
        last_login TIMESTAMP
      )
    `);

    // Create user_items table for cosmetics (spinners, pets)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_items (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        item_type VARCHAR(20) NOT NULL, -- 'spinner' or 'pet'
        item_id VARCHAR(50) NOT NULL,
        equipped BOOLEAN DEFAULT FALSE,
        acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create game_sessions table to track matches
    await pool.query(`
      CREATE TABLE IF NOT EXISTS game_sessions (
        id SERIAL PRIMARY KEY,
        room_name VARCHAR(100),
        game_mode VARCHAR(50),
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ended_at TIMESTAMP,
        winner_id INTEGER REFERENCES users(id)
      )
    `);

    // Create player_sessions to track player participation in games
    await pool.query(`
      CREATE TABLE IF NOT EXISTS player_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        game_id INTEGER REFERENCES game_sessions(id),
        kills INTEGER DEFAULT 0,
        deaths INTEGER DEFAULT 0,
        score INTEGER DEFAULT 0,
        team VARCHAR(20)
      )
    `);

    console.log('Database initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    return false;
  }
};

// Helper function to query the database
const query = (text, params) => pool.query(text, params);

module.exports = {
  query,
  initDatabase,
  pool
};