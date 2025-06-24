/**
 * Database Connection and Utilities
 * PostgreSQL connection management with connection pooling
 * 
 * @author Web Developer Agent
 * @version 1.0.0
 * @date June 23, 2025
 */

const { Pool } = require('pg')
const fs = require('fs').promises
const path = require('path')

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'tictactoe_app',
  max: process.env.DB_POOL_MAX || 20, // Maximum number of clients in the pool
  idleTimeoutMillis: process.env.DB_IDLE_TIMEOUT || 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: process.env.DB_CONNECTION_TIMEOUT || 2000, // Return an error after 2 seconds if connection could not be established
}

// Create connection pool
let pool = null

/**
 * Initialize database connection pool
 */
function initializePool() {
  if (!pool) {
    pool = new Pool(dbConfig)
    
    // Handle pool errors
    pool.on('error', (err, client) => {
      console.error('Unexpected error on idle client', err)
      process.exit(-1)
    })
    
    // Log pool connection events in development
    if (process.env.NODE_ENV === 'development') {
      pool.on('connect', () => {
        console.log('? New database client connected')
      })
      
      pool.on('remove', () => {
        console.log('? Database client removed from pool')
      })
    }
  }
  
  return pool
}

/**
 * Get database connection pool
 * @returns {Pool} PostgreSQL connection pool
 */
function getPool() {
  if (!pool) {
    pool = initializePool()
  }
  return pool
}

/**
 * Test database connection
 * @returns {Promise<boolean>} True if connection successful
 */
async function testConnection() {
  try {
    const pool = getPool()
    const client = await pool.connect()
    
    // Test query
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version')
    const { current_time, pg_version } = result.rows[0]
    
    console.log(`? Database time: ${current_time}`)
    console.log(`??  PostgreSQL version: ${pg_version.split(' ')[0]}`)
    
    client.release()
    return true
    
  } catch (error) {
    console.error('? Database connection failed:', error.message)
    throw error
  }
}

/**
 * Execute a database query with error handling
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Query result
 */
async function query(text, params = []) {
  const start = Date.now()
  
  try {
    const pool = getPool()
    const result = await pool.query(text, params)
    
    const duration = Date.now() - start
    
    // Log slow queries in development (> 100ms)
    if (process.env.NODE_ENV === 'development' && duration > 100) {
      console.log(`? Slow query executed in ${duration}ms:`, text)
    }
    
    return result
    
  } catch (error) {
    console.error('? Database query error:', {
      error: error.message,
      query: text,
      params: params
    })
    throw error
  }
}

/**
 * Execute a transaction with multiple queries
 * @param {Function} callback - Function containing queries to execute
 * @returns {Promise<any>} Transaction result
 */
async function transaction(callback) {
  const pool = getPool()
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
    
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('? Transaction rolled back:', error.message)
    throw error
    
  } finally {
    client.release()
  }
}

/**
 * Check if a table exists in the database
 * @param {string} tableName - Name of the table to check
 * @returns {Promise<boolean>} True if table exists
 */
async function tableExists(tableName) {
  try {
    const result = await query(
      `SELECT EXISTS (
         SELECT FROM information_schema.tables 
         WHERE table_schema = 'public' 
         AND table_name = $1
       )`,
      [tableName]
    )
    
    return result.rows[0].exists
    
  } catch (error) {
    console.error(`? Error checking table existence for ${tableName}:`, error.message)
    return false
  }
}

/**
 * Run database migrations
 * @returns {Promise<void>}
 */
async function runMigrations() {
  try {
    console.log('? Running database migrations...')
    
    // Check if schema_version table exists
    const schemaTableExists = await tableExists('schema_version')
    
    if (!schemaTableExists) {
      console.log('? Creating database schema...')
      
      // Read and execute schema file
      const schemaPath = path.join(__dirname, '../../database/schema.sql')
      const schemaSQL = await fs.readFile(schemaPath, 'utf-8')
      
      // Split by semicolon and execute each statement
      const statements = schemaSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
      
      for (const statement of statements) {
        if (statement.trim()) {
          await query(statement)
        }
      }
      
      console.log('? Database schema created successfully')
    } else {
      console.log('? Database schema already exists')
    }
    
    // Check current schema version
    const versionResult = await query('SELECT version FROM schema_version ORDER BY applied_at DESC LIMIT 1')
    const currentVersion = versionResult.rows[0]?.version || 'Unknown'
    
    console.log(`? Current schema version: ${currentVersion}`)
    
  } catch (error) {
    console.error('? Migration failed:', error.message)
    throw error
  }
}

/**
 * Seed database with test data (development only)
 * @returns {Promise<void>}
 */
async function seedDatabase() {
  if (process.env.NODE_ENV !== 'development') {
    console.log('? Seeding skipped - not in development environment')
    return
  }
  
  try {
    console.log('? Seeding database with test data...')
    
    // Check if users already exist
    const userCount = await query('SELECT COUNT(*) FROM users')
    
    if (parseInt(userCount.rows[0].count) > 0) {
      console.log('? Database already contains data, skipping seed')
      return
    }
    
    // Create test users
    const bcrypt = require('bcrypt')
    const hashedPassword = await bcrypt.hash('testpass123', 12)
    
    await query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2), ($3, $4)',
      ['test@example.com', hashedPassword, 'demo@example.com', hashedPassword]
    )
    
    console.log('? Test users created')
    console.log('   ? test@example.com / testpass123')
    console.log('   ? demo@example.com / testpass123')
    
  } catch (error) {
    console.error('? Database seeding failed:', error.message)
    throw error
  }
}

/**
 * Get database statistics
 * @returns {Promise<Object>} Database statistics
 */
async function getDatabaseStats() {
  try {
    const stats = {}
    
    // Get table row counts
    const tables = ['users', 'games', 'game_moves']
    
    for (const table of tables) {
      try {
        const result = await query(`SELECT COUNT(*) FROM ${table}`)
        stats[table] = parseInt(result.rows[0].count)
      } catch (error) {
        stats[table] = 'N/A (table may not exist)'
      }
    }
    
    // Get connection pool stats
    stats.connectionPool = {
      total: pool?.totalCount || 0,
      idle: pool?.idleCount || 0,
      waiting: pool?.waitingCount || 0
    }
    
    return stats
    
  } catch (error) {
    console.error('? Error getting database stats:', error.message)
    return { error: error.message }
  }
}

/**
 * Close database connections gracefully
 * @returns {Promise<void>}
 */
async function closeConnections() {
  if (pool) {
    console.log('? Closing database connections...')
    await pool.end()
    pool = null
    console.log('? Database connections closed')
  }
}

module.exports = {
  query,
  transaction,
  testConnection,
  getPool,
  tableExists,
  runMigrations,
  seedDatabase,
  getDatabaseStats,
  closeConnections
}