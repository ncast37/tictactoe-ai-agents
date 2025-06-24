-- TicTacToe Web Application Database Schema
-- Version: 1.0
-- Date: June 23, 2025
-- Database: PostgreSQL

-- Create database (for reference, run manually)
-- CREATE DATABASE tictactoe_app;

-- Connect to the database
-- \c tictactoe_app;

-- Enable UUID extension for better ID generation (optional enhancement)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table - Core user authentication and profile data
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Additional constraints for data integrity
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

-- Games table - Store game instances and metadata
CREATE TABLE games (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ai_difficulty VARCHAR(20) NOT NULL DEFAULT 'medium',
    game_state JSONB NOT NULL DEFAULT '{"board": [null,null,null,null,null,null,null,null,null], "currentPlayer": "user", "moves": 0}',
    result VARCHAR(20) DEFAULT 'in_progress',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    -- Constraints for data integrity
    CONSTRAINT valid_ai_difficulty CHECK (ai_difficulty IN ('easy', 'medium', 'hard')),
    CONSTRAINT valid_result CHECK (result IN ('user_win', 'ai_win', 'draw', 'in_progress')),
    CONSTRAINT completed_games_have_result CHECK (
        (completed_at IS NULL AND result = 'in_progress') OR 
        (completed_at IS NOT NULL AND result != 'in_progress')
    )
);

-- Game moves table - Detailed move history for analysis and replay
CREATE TABLE game_moves (
    id SERIAL PRIMARY KEY,
    game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    move_number INTEGER NOT NULL,
    position INTEGER NOT NULL,
    player VARCHAR(10) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Constraints for data integrity
    CONSTRAINT valid_position CHECK (position >= 0 AND position <= 8),
    CONSTRAINT valid_player CHECK (player IN ('user', 'ai')),
    CONSTRAINT valid_move_number CHECK (move_number >= 1 AND move_number <= 9),
    -- Ensure move number is unique per game
    UNIQUE(game_id, move_number),
    -- Ensure position is unique per game (no duplicate moves on same spot)
    UNIQUE(game_id, position)
);

-- Indexes for performance optimization
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_games_user_id ON games(user_id);
CREATE INDEX idx_games_created_at ON games(created_at);
CREATE INDEX idx_games_result ON games(result);
CREATE INDEX idx_game_moves_game_id ON game_moves(game_id);
CREATE INDEX idx_game_moves_timestamp ON game_moves(timestamp);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at for users table
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Sample data for development and testing (optional)
-- This will be moved to seeds/development.sql for actual seeding

-- Views for common queries and statistics
CREATE VIEW user_statistics AS
SELECT 
    u.id,
    u.email,
    COUNT(g.id) as total_games,
    COUNT(CASE WHEN g.result = 'user_win' THEN 1 END) as wins,
    COUNT(CASE WHEN g.result = 'ai_win' THEN 1 END) as losses,
    COUNT(CASE WHEN g.result = 'draw' THEN 1 END) as draws,
    ROUND(
        COUNT(CASE WHEN g.result = 'user_win' THEN 1 END) * 100.0 / 
        NULLIF(COUNT(CASE WHEN g.result != 'in_progress' THEN 1 END), 0), 
        2
    ) as win_percentage,
    MAX(g.created_at) as last_game_date
FROM users u
LEFT JOIN games g ON u.id = g.user_id
GROUP BY u.id, u.email;

-- View for game history with move counts
CREATE VIEW game_history AS
SELECT 
    g.id,
    g.user_id,
    u.email,
    g.ai_difficulty,
    g.result,
    g.created_at,
    g.completed_at,
    COUNT(gm.id) as total_moves,
    EXTRACT(EPOCH FROM (g.completed_at - g.created_at)) as duration_seconds
FROM games g
JOIN users u ON g.user_id = u.id
LEFT JOIN game_moves gm ON g.id = gm.game_id
WHERE g.result != 'in_progress'
GROUP BY g.id, g.user_id, u.email, g.ai_difficulty, g.result, g.created_at, g.completed_at
ORDER BY g.created_at DESC;

-- Function to validate game state JSON structure
CREATE OR REPLACE FUNCTION validate_game_state(game_state JSONB)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if required keys exist
    IF NOT (game_state ? 'board' AND game_state ? 'currentPlayer' AND game_state ? 'moves') THEN
        RETURN FALSE;
    END IF;
    
    -- Check board array length
    IF jsonb_array_length(game_state->'board') != 9 THEN
        RETURN FALSE;
    END IF;
    
    -- Check currentPlayer value
    IF NOT (game_state->>'currentPlayer' IN ('user', 'ai')) THEN
        RETURN FALSE;
    END IF;
    
    -- Check moves is a number
    IF NOT (game_state->'moves' ? 0) THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Add constraint to validate game_state JSON structure
ALTER TABLE games ADD CONSTRAINT valid_game_state 
    CHECK (validate_game_state(game_state));

-- Grant permissions (adjust for your specific user)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO tictactoe_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO tictactoe_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO tictactoe_user;

-- Database schema version tracking
CREATE TABLE schema_version (
    version VARCHAR(10) PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

INSERT INTO schema_version (version, description) VALUES 
    ('1.0.0', 'Initial database schema with users, games, and game_moves tables');

-- Comments for documentation
COMMENT ON TABLE users IS 'User accounts and authentication data';
COMMENT ON TABLE games IS 'Game instances with state and metadata';
COMMENT ON TABLE game_moves IS 'Detailed move history for each game';
COMMENT ON VIEW user_statistics IS 'Aggregated user statistics including win/loss ratios';
COMMENT ON VIEW game_history IS 'Game history with move counts and duration metrics';

-- End of schema
