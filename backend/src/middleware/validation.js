/**
 * Request Validation Middleware
 * Input validation using Joi schema validation
 * 
 * @author Web Developer Agent
 * @version 1.0.0
 * @date June 23, 2025
 */

const Joi = require('joi')
const { AppError } = require('./errorHandler')

/**
 * Validation schemas for different endpoints
 */
const schemas = {
  // User registration validation
  register: Joi.object({
    email: Joi.string()
      .email({ minDomainSegments: 2, tlds: { allow: ['com', 'net', 'org', 'edu', 'gov', 'mil'] } })
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      }),
    password: Joi.string()
      .min(8)
      .max(128)
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)'))
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.max': 'Password cannot exceed 128 characters',
        'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, and one number',
        'any.required': 'Password is required'
      }),
    confirmPassword: Joi.string()
      .valid(Joi.ref('password'))
      .required()
      .messages({
        'any.only': 'Password confirmation does not match password',
        'any.required': 'Password confirmation is required'
      })
  }),

  // User login validation
  login: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      }),
    password: Joi.string()
      .required()
      .messages({
        'any.required': 'Password is required'
      })
  }),

  // Start new game validation
  startGame: Joi.object({
    difficulty: Joi.string()
      .valid('easy', 'medium', 'hard')
      .default('medium')
      .messages({
        'any.only': 'Difficulty must be one of: easy, medium, hard'
      })
  }),

  // Make game move validation
  gameMove: Joi.object({
    position: Joi.number()
      .integer()
      .min(0)
      .max(8)
      .required()
      .messages({
        'number.base': 'Position must be a number',
        'number.integer': 'Position must be an integer',
        'number.min': 'Position must be between 0 and 8',
        'number.max': 'Position must be between 0 and 8',
        'any.required': 'Position is required'
      })
  }),

  // Update user profile validation
  updateProfile: Joi.object({
    email: Joi.string()
      .email()
      .optional()
      .messages({
        'string.email': 'Please provide a valid email address'
      }),
    currentPassword: Joi.string()
      .when('newPassword', {
        is: Joi.exist(),
        then: Joi.required(),
        otherwise: Joi.optional()
      })
      .messages({
        'any.required': 'Current password is required when changing password'
      }),
    newPassword: Joi.string()
      .min(8)
      .max(128)
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)'))
      .optional()
      .messages({
        'string.min': 'New password must be at least 8 characters long',
        'string.max': 'New password cannot exceed 128 characters',
        'string.pattern.base': 'New password must contain at least one lowercase letter, one uppercase letter, and one number'
      })
  }),

  // Query parameters validation for game history
  gameHistory: Joi.object({
    page: Joi.number()
      .integer()
      .min(1)
      .default(1)
      .messages({
        'number.base': 'Page must be a number',
        'number.integer': 'Page must be an integer',
        'number.min': 'Page must be at least 1'
      }),
    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(10)
      .messages({
        'number.base': 'Limit must be a number',
        'number.integer': 'Limit must be an integer',
        'number.min': 'Limit must be at least 1',
        'number.max': 'Limit cannot exceed 100'
      }),
    difficulty: Joi.string()
      .valid('easy', 'medium', 'hard')
      .optional()
      .messages({
        'any.only': 'Difficulty filter must be one of: easy, medium, hard'
      }),
    result: Joi.string()
      .valid('user_win', 'ai_win', 'draw')
      .optional()
      .messages({
        'any.only': 'Result filter must be one of: user_win, ai_win, draw'
      })
  }),

  // ID parameter validation
  gameId: Joi.object({
    id: Joi.number()
      .integer()
      .positive()
      .required()
      .messages({
        'number.base': 'Game ID must be a number',
        'number.integer': 'Game ID must be an integer',
        'number.positive': 'Game ID must be positive',
        'any.required': 'Game ID is required'
      })
  }),

  userId: Joi.object({
    id: Joi.number()
      .integer()
      .positive()
      .required()
      .messages({
        'number.base': 'User ID must be a number',
        'number.integer': 'User ID must be an integer',
        'number.positive': 'User ID must be positive',
        'any.required': 'User ID is required'
      })
  })
}

/**
 * Create validation middleware for a specific schema
 * @param {string} schemaName - Name of the schema to validate against
 * @param {string} source - Source of data to validate ('body', 'params', 'query')
 * @returns {Function} Express middleware function
 */
function validate(schemaName, source = 'body') {
  return (req, res, next) => {
    const schema = schemas[schemaName]
    
    if (!schema) {
      return next(new AppError(`Validation schema '${schemaName}' not found`, 500))
    }
    
    const dataToValidate = req[source]
    
    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false, // Include all errors
      allowUnknown: false, // Don't allow unknown fields
      stripUnknown: true // Remove unknown fields
    })
    
    if (error) {
      const errorMessages = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }))
      
      return next(new AppError(`Validation failed: ${errorMessages.map(err => err.message).join(', ')}`, 400))
    }
    
    // Replace the original data with validated and sanitized data
    req[source] = value
    
    next()
  }
}

/**
 * Validate multiple sources (body, params, query) in one middleware
 * @param {Object} validationRules - Object with validation rules for each source
 * @returns {Function} Express middleware function
 */
function validateMultiple(validationRules) {
  return (req, res, next) => {
    const errors = []
    
    for (const [source, schemaName] of Object.entries(validationRules)) {
      const schema = schemas[schemaName]
      
      if (!schema) {
        return next(new AppError(`Validation schema '${schemaName}' not found`, 500))
      }
      
      const dataToValidate = req[source]
      const { error, value } = schema.validate(dataToValidate, {
        abortEarly: false,
        allowUnknown: false,
        stripUnknown: true
      })
      
      if (error) {
        const sourceErrors = error.details.map(detail => ({
          source,
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }))
        errors.push(...sourceErrors)
      } else {
        req[source] = value
      }
    }
    
    if (errors.length > 0) {
      const errorMessage = errors.map(err => `${err.source}.${err.field}: ${err.message}`).join(', ')
      return next(new AppError(`Validation failed: ${errorMessage}`, 400))
    }
    
    next()
  }
}

/**
 * Custom validation for game move position
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function validateGameMove(req, res, next) {
  const { position } = req.body
  
  // Basic validation
  if (position === undefined || position === null) {
    return next(new AppError('Position is required', 400))
  }
  
  if (!Number.isInteger(position) || position < 0 || position > 8) {
    return next(new AppError('Position must be an integer between 0 and 8', 400))
  }
  
  next()
}

/**
 * Sanitize string inputs to prevent XSS
 * @param {string} input - String to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeString(input) {
  if (typeof input !== 'string') {
    return input
  }
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 1000) // Limit length
}

/**
 * Sanitization middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function sanitizeInput(req, res, next) {
  // Sanitize body
  if (req.body && typeof req.body === 'object') {
    for (const [key, value] of Object.entries(req.body)) {
      if (typeof value === 'string') {
        req.body[key] = sanitizeString(value)
      }
    }
  }
  
  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === 'string') {
        req.query[key] = sanitizeString(value)
      }
    }
  }
  
  next()
}

/**
 * Combine validation schemas
 * @param {...Object} schemas - Schemas to combine
 * @returns {Object} Combined schema
 */
function combineSchemas(...schemasToCombin) {
  return Joi.object().concat(...schemasToCombin)
}

module.exports = {
  validate,
  validateMultiple,
  validateGameMove,
  sanitizeInput,
  sanitizeString,
  combineSchemas,
  schemas
}