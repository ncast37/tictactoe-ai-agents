/**
 * TicTacToe Game Engine
 * Core game logic including AI algorithms and game state management
 * 
 * @author Web Developer Agent
 * @version 1.0.0
 * @date June 23, 2025
 */

/**
 * Game constants
 */
const PLAYERS = {
  USER: 'user',
  AI: 'ai'
}

const CELL_VALUES = {
  EMPTY: null,
  USER: 'X',
  AI: 'O'
}

const GAME_RESULTS = {
  IN_PROGRESS: 'in_progress',
  USER_WIN: 'user_win',
  AI_WIN: 'ai_win',
  DRAW: 'draw'
}

const DIFFICULTIES = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard'
}

/**
 * Create initial game state
 * @param {string} difficulty - AI difficulty level
 * @returns {Object} Initial game state
 */
function createInitialGameState(difficulty = DIFFICULTIES.MEDIUM) {
  return {
    board: new Array(9).fill(CELL_VALUES.EMPTY),
    currentPlayer: PLAYERS.USER,
    moves: 0,
    difficulty: difficulty,
    result: GAME_RESULTS.IN_PROGRESS,
    winner: null,
    winningLine: null
  }
}

/**
 * Check if a position is valid for a move
 * @param {Array} board - Current board state
 * @param {number} position - Position to check (0-8)
 * @returns {boolean} True if position is valid
 */
function isValidMove(board, position) {
  return position >= 0 && position <= 8 && board[position] === CELL_VALUES.EMPTY
}

/**
 * Make a move on the board
 * @param {Array} board - Current board state
 * @param {number} position - Position to make move (0-8)
 * @param {string} player - Player making the move
 * @returns {Array} New board state
 */
function makeMove(board, position, player) {
  if (!isValidMove(board, position)) {
    throw new Error(`Invalid move: position ${position} is not available`)
  }
  
  const newBoard = [...board]
  newBoard[position] = player === PLAYERS.USER ? CELL_VALUES.USER : CELL_VALUES.AI
  
  return newBoard
}

/**
 * Check for winning combinations
 * @param {Array} board - Current board state
 * @returns {Object|null} Winner information or null if no winner
 */
function checkWinner(board) {
  const winningCombinations = [
    // Rows
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    // Columns
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    // Diagonals
    [0, 4, 8], [2, 4, 6]
  ]
  
  for (const combination of winningCombinations) {
    const [a, b, c] = combination
    
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return {
        winner: board[a] === CELL_VALUES.USER ? PLAYERS.USER : PLAYERS.AI,
        winningLine: combination
      }
    }
  }
  
  return null
}

/**
 * Check if the game is a draw
 * @param {Array} board - Current board state
 * @returns {boolean} True if game is a draw
 */
function isDraw(board) {
  return board.every(cell => cell !== CELL_VALUES.EMPTY) && !checkWinner(board)
}

/**
 * Get game result based on current board state
 * @param {Array} board - Current board state
 * @returns {string} Game result
 */
function getGameResult(board) {
  const winner = checkWinner(board)
  
  if (winner) {
    return winner.winner === PLAYERS.USER ? GAME_RESULTS.USER_WIN : GAME_RESULTS.AI_WIN
  }
  
  if (isDraw(board)) {
    return GAME_RESULTS.DRAW
  }
  
  return GAME_RESULTS.IN_PROGRESS
}

/**
 * Get available moves on the board
 * @param {Array} board - Current board state
 * @returns {Array} Array of available positions
 */
function getAvailableMoves(board) {
  const availableMoves = []
  
  for (let i = 0; i < board.length; i++) {
    if (board[i] === CELL_VALUES.EMPTY) {
      availableMoves.push(i)
    }
  }
  
  return availableMoves
}

/**
 * AI Algorithm: Easy difficulty - mostly random with basic defensive moves
 * @param {Array} board - Current board state
 * @returns {number} Position for AI move
 */
function getEasyAIMove(board) {
  const availableMoves = getAvailableMoves(board)
  
  if (availableMoves.length === 0) {
    throw new Error('No available moves for AI')
  }
  
  // 20% chance to make a smart defensive move
  if (Math.random() < 0.2) {
    // Check if user can win next turn and block them
    for (const move of availableMoves) {
      const testBoard = makeMove(board, move, PLAYERS.USER)
      if (checkWinner(testBoard)?.winner === PLAYERS.USER) {
        return move // Block the winning move
      }
    }
  }
  
  // Otherwise, make a random move
  const randomIndex = Math.floor(Math.random() * availableMoves.length)
  return availableMoves[randomIndex]
}

/**
 * AI Algorithm: Medium difficulty - minimax with limited depth and occasional mistakes
 * @param {Array} board - Current board state
 * @returns {number} Position for AI move
 */
function getMediumAIMove(board) {
  const availableMoves = getAvailableMoves(board)
  
  if (availableMoves.length === 0) {
    throw new Error('No available moves for AI')
  }
  
  // 15% chance to make a random move (to allow user wins)
  if (Math.random() < 0.15) {
    const randomIndex = Math.floor(Math.random() * availableMoves.length)
    return availableMoves[randomIndex]
  }
  
  // Use minimax with limited depth (3 levels)
  const bestMove = minimax(board, 3, false, -Infinity, Infinity)
  return bestMove.position
}

/**
 * AI Algorithm: Hard difficulty - perfect minimax algorithm
 * @param {Array} board - Current board state
 * @returns {number} Position for AI move
 */
function getHardAIMove(board) {
  const availableMoves = getAvailableMoves(board)
  
  if (availableMoves.length === 0) {
    throw new Error('No available moves for AI')
  }
  
  // Use full minimax algorithm
  const bestMove = minimax(board, 9, false, -Infinity, Infinity)
  return bestMove.position
}

/**
 * Minimax algorithm with alpha-beta pruning
 * @param {Array} board - Current board state
 * @param {number} depth - Search depth
 * @param {boolean} isMaximizing - Whether AI is maximizing or minimizing
 * @param {number} alpha - Alpha value for pruning
 * @param {number} beta - Beta value for pruning
 * @returns {Object} Best move with position and score
 */
function minimax(board, depth, isMaximizing, alpha, beta) {
  const winner = checkWinner(board)
  
  // Terminal states
  if (winner) {
    if (winner.winner === PLAYERS.AI) {
      return { score: 10 - (9 - depth) } // Prefer quicker wins
    } else {
      return { score: -10 + (9 - depth) } // Prefer delayed losses
    }
  }
  
  if (isDraw(board) || depth === 0) {
    return { score: 0 }
  }
  
  const availableMoves = getAvailableMoves(board)
  let bestMove = { position: availableMoves[0], score: isMaximizing ? -Infinity : Infinity }
  
  for (const move of availableMoves) {
    const newBoard = makeMove(board, move, isMaximizing ? PLAYERS.AI : PLAYERS.USER)
    const result = minimax(newBoard, depth - 1, !isMaximizing, alpha, beta)
    
    if (isMaximizing) {
      if (result.score > bestMove.score) {
        bestMove = { position: move, score: result.score }
      }
      alpha = Math.max(alpha, result.score)
    } else {
      if (result.score < bestMove.score) {
        bestMove = { position: move, score: result.score }
      }
      beta = Math.min(beta, result.score)
    }
    
    // Alpha-beta pruning
    if (beta <= alpha) {
      break
    }
  }
  
  return bestMove
}

/**
 * Get AI move based on difficulty level
 * @param {Array} board - Current board state
 * @param {string} difficulty - AI difficulty level
 * @returns {number} Position for AI move
 */
function getAIMove(board, difficulty) {
  switch (difficulty) {
    case DIFFICULTIES.EASY:
      return getEasyAIMove(board)
    case DIFFICULTIES.MEDIUM:
      return getMediumAIMove(board)
    case DIFFICULTIES.HARD:
      return getHardAIMove(board)
    default:
      throw new Error(`Unknown difficulty level: ${difficulty}`)
  }
}

/**
 * Process a user move and return updated game state
 * @param {Object} gameState - Current game state
 * @param {number} position - Position where user wants to move
 * @returns {Object} Updated game state
 */
function processUserMove(gameState, position) {
  if (gameState.result !== GAME_RESULTS.IN_PROGRESS) {
    throw new Error('Game has already ended')
  }
  
  if (gameState.currentPlayer !== PLAYERS.USER) {
    throw new Error('Not user\'s turn')
  }
  
  if (!isValidMove(gameState.board, position)) {
    throw new Error(`Invalid move: position ${position} is not available`)
  }
  
  // Make user move
  const newBoard = makeMove(gameState.board, position, PLAYERS.USER)
  const moves = gameState.moves + 1
  
  // Check game result after user move
  const winner = checkWinner(newBoard)
  let result = GAME_RESULTS.IN_PROGRESS
  let winningLine = null
  
  if (winner) {
    result = GAME_RESULTS.USER_WIN
    winningLine = winner.winningLine
  } else if (isDraw(newBoard)) {
    result = GAME_RESULTS.DRAW
  }
  
  return {
    ...gameState,
    board: newBoard,
    currentPlayer: result === GAME_RESULTS.IN_PROGRESS ? PLAYERS.AI : PLAYERS.USER,
    moves: moves,
    result: result,
    winner: winner?.winner || null,
    winningLine: winningLine
  }
}

/**
 * Process an AI move and return updated game state
 * @param {Object} gameState - Current game state
 * @returns {Object} Updated game state
 */
function processAIMove(gameState) {
  if (gameState.result !== GAME_RESULTS.IN_PROGRESS) {
    throw new Error('Game has already ended')
  }
  
  if (gameState.currentPlayer !== PLAYERS.AI) {
    throw new Error('Not AI\'s turn')
  }
  
  // Get AI move
  const aiPosition = getAIMove(gameState.board, gameState.difficulty)
  
  // Make AI move
  const newBoard = makeMove(gameState.board, aiPosition, PLAYERS.AI)
  const moves = gameState.moves + 1
  
  // Check game result after AI move
  const winner = checkWinner(newBoard)
  let result = GAME_RESULTS.IN_PROGRESS
  let winningLine = null
  
  if (winner) {
    result = GAME_RESULTS.AI_WIN
    winningLine = winner.winningLine
  } else if (isDraw(newBoard)) {
    result = GAME_RESULTS.DRAW
  }
  
  return {
    ...gameState,
    board: newBoard,
    currentPlayer: result === GAME_RESULTS.IN_PROGRESS ? PLAYERS.USER : PLAYERS.AI,
    moves: moves,
    result: result,
    winner: winner?.winner || null,
    winningLine: winningLine,
    lastAIMove: aiPosition
  }
}

/**
 * Complete game turn (user move + AI response if game continues)
 * @param {Object} gameState - Current game state
 * @param {number} userPosition - Position where user wants to move
 * @returns {Object} Updated game state after both moves
 */
function completeTurn(gameState, userPosition) {
  // Process user move
  let updatedState = processUserMove(gameState, userPosition)
  
  // If game is still in progress, make AI move
  if (updatedState.result === GAME_RESULTS.IN_PROGRESS) {
    updatedState = processAIMove(updatedState)
  }
  
  return updatedState
}

/**
 * Get game statistics for a completed game
 * @param {Object} gameState - Final game state
 * @returns {Object} Game statistics
 */
function getGameStats(gameState) {
  return {
    totalMoves: gameState.moves,
    userMoves: Math.ceil(gameState.moves / 2),
    aiMoves: Math.floor(gameState.moves / 2),
    winner: gameState.winner,
    result: gameState.result,
    difficulty: gameState.difficulty,
    winningLine: gameState.winningLine,
    isCompleted: gameState.result !== GAME_RESULTS.IN_PROGRESS
  }
}

/**
 * Validate game state structure
 * @param {Object} gameState - Game state to validate
 * @returns {boolean} True if valid
 */
function validateGameState(gameState) {
  if (!gameState || typeof gameState !== 'object') {
    return false
  }
  
  const requiredFields = ['board', 'currentPlayer', 'moves', 'difficulty', 'result']
  
  for (const field of requiredFields) {
    if (!(field in gameState)) {
      return false
    }
  }
  
  // Validate board
  if (!Array.isArray(gameState.board) || gameState.board.length !== 9) {
    return false
  }
  
  // Validate board values
  for (const cell of gameState.board) {
    if (cell !== null && cell !== CELL_VALUES.USER && cell !== CELL_VALUES.AI) {
      return false
    }
  }
  
  // Validate current player
  if (![PLAYERS.USER, PLAYERS.AI].includes(gameState.currentPlayer)) {
    return false
  }
  
  // Validate difficulty
  if (!Object.values(DIFFICULTIES).includes(gameState.difficulty)) {
    return false
  }
  
  // Validate result
  if (!Object.values(GAME_RESULTS).includes(gameState.result)) {
    return false
  }
  
  return true
}

/**
 * Get human-readable board display (for debugging)
 * @param {Array} board - Game board
 * @returns {string} Formatted board display
 */
function getBoardDisplay(board) {
  const symbols = {
    [CELL_VALUES.EMPTY]: ' ',
    [CELL_VALUES.USER]: 'X',
    [CELL_VALUES.AI]: 'O'
  }
  
  let display = '\n'
  for (let i = 0; i < 9; i += 3) {
    const row = board.slice(i, i + 3)
      .map(cell => symbols[cell] || ' ')
      .join(' | ')
    
    display += ` ${row} \n`
    
    if (i < 6) {
      display += '---|---|---\n'
    }
  }
  
  return display
}

/**
 * Get move history analysis
 * @param {Array} moves - Array of moves made in the game
 * @returns {Object} Move analysis
 */
function analyzeMoveHistory(moves) {
  if (!Array.isArray(moves) || moves.length === 0) {
    return {
      totalMoves: 0,
      averageThinkTime: 0,
      playerMoves: [],
      aiMoves: []
    }
  }
  
  const playerMoves = moves.filter(move => move.player === PLAYERS.USER)
  const aiMoves = moves.filter(move => move.player === PLAYERS.AI)
  
  return {
    totalMoves: moves.length,
    playerMoves: playerMoves.map(move => ({
      position: move.position,
      moveNumber: move.move_number,
      timestamp: move.timestamp
    })),
    aiMoves: aiMoves.map(move => ({
      position: move.position,
      moveNumber: move.move_number,
      timestamp: move.timestamp
    })),
    gameFlow: moves.map(move => ({
      player: move.player,
      position: move.position,
      moveNumber: move.move_number
    }))
  }
}

module.exports = {
  // Constants
  PLAYERS,
  CELL_VALUES,
  GAME_RESULTS,
  DIFFICULTIES,
  
  // Core game functions
  createInitialGameState,
  isValidMove,
  makeMove,
  checkWinner,
  isDraw,
  getGameResult,
  getAvailableMoves,
  
  // AI functions
  getAIMove,
  getEasyAIMove,
  getMediumAIMove,
  getHardAIMove,
  minimax,
  
  // Game flow functions
  processUserMove,
  processAIMove,
  completeTurn,
  
  // Utility functions
  getGameStats,
  validateGameState,
  getBoardDisplay,
  analyzeMoveHistory
}