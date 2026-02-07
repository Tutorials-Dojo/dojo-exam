/**
 * Session Lifecycle Library
 *
 * Manages session lifecycle state transitions with PostgreSQL persistence.
 * Enforces deterministic state machine transitions.
 *
 * @module @dojo-exam/session-lifecycle
 */

import pg from 'pg';
import {
  isValidState,
  isValidTransition,
  getAllowedTransitions,
  createTransitionError,
  VALID_STATES,
} from './state-machine.js';

const { Pool } = pg;

// UUID v4 regex pattern (RFC 4122)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates a UUID string format.
 * @param {string} value - Value to validate
 * @returns {boolean} True if valid UUID
 */
function isValidUuid(value) {
  if (!value || typeof value !== 'string') {
    return false;
  }
  return UUID_REGEX.test(value);
}

/**
 * Creates a database connection pool.
 * @returns {Pool}
 */
function createPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
  });
}

/**
 * Session not found error.
 * @param {string} sessionId
 * @returns {Object}
 */
function sessionNotFoundError(sessionId) {
  return {
    error: true,
    code: 'SESSION_NOT_FOUND',
    message: 'Session not found',
    details: {},
  };
}

/**
 * Invalid identity error for session_id validation.
 * @param {string} field
 * @returns {Object}
 */
function invalidIdentityError(field) {
  return {
    error: true,
    code: 'INVALID_IDENTITY',
    message: `Invalid UUID format for: ${field}`,
    details: {
      invalid_fields: [field],
    },
  };
}

/**
 * Transitions a session to a new lifecycle state.
 *
 * @param {Object} options
 * @param {string} options.sessionId - Session identifier (UUID)
 * @param {string} options.toState - Target state
 * @param {string} [options.reason] - Reason for transition (required for 'failed')
 * @param {Pool} [options.pool] - Optional database pool (for testing)
 * @returns {Promise<Object>} Transition result or error
 */
export async function transition({ sessionId, toState, reason, pool }) {
  // Validate session ID format
  if (!isValidUuid(sessionId)) {
    return invalidIdentityError('session_id');
  }

  // Validate target state
  if (!isValidState(toState)) {
    return {
      error: true,
      code: 'INVALID_STATE',
      message: `Invalid state: ${toState}. Valid states: ${VALID_STATES.join(', ')}`,
      details: {
        provided_state: toState,
        valid_states: VALID_STATES,
      },
    };
  }

  const dbPool = pool || createPool();
  const shouldClosePool = !pool;

  try {
    // Get current state
    const selectResult = await dbPool.query(
      'SELECT lifecycle_state, started_at FROM exam_sessions WHERE exam_session_id = $1',
      [sessionId]
    );

    if (selectResult.rows.length === 0) {
      return sessionNotFoundError(sessionId);
    }

    const currentState = selectResult.rows[0].lifecycle_state;

    // Validate transition
    if (!isValidTransition(currentState, toState)) {
      return createTransitionError(currentState, toState);
    }

    // Perform transition
    const transitionedAt = new Date().toISOString();
    const updateFields = ['lifecycle_state = $2', 'lifecycle_reason = $3'];
    const updateValues = [sessionId, toState, reason || null];

    // Set terminated_at if transitioning to terminal state
    if (toState === 'terminated' || toState === 'failed') {
      updateFields.push('terminated_at = $4');
      updateValues.push(transitionedAt);
    }

    // Set ready_at if transitioning to ready
    if (toState === 'ready') {
      updateFields.push('ready_at = $4');
      updateValues.push(transitionedAt);
    }

    await dbPool.query(
      `UPDATE exam_sessions SET ${updateFields.join(', ')} WHERE exam_session_id = $1`,
      updateValues
    );

    return {
      session_id: sessionId,
      previous_state: currentState,
      current_state: toState,
      transitioned_at: transitionedAt,
    };
  } finally {
    if (shouldClosePool) {
      await dbPool.end();
    }
  }
}

/**
 * Gets the current lifecycle state of a session.
 *
 * @param {Object} options
 * @param {string} options.sessionId - Session identifier (UUID)
 * @param {Pool} [options.pool] - Optional database pool (for testing)
 * @returns {Promise<Object>} Status result or error
 */
export async function getStatus({ sessionId, pool }) {
  // Validate session ID format
  if (!isValidUuid(sessionId)) {
    return invalidIdentityError('session_id');
  }

  const dbPool = pool || createPool();
  const shouldClosePool = !pool;

  try {
    const result = await dbPool.query(
      `SELECT
        exam_session_id,
        lifecycle_state,
        lifecycle_reason,
        started_at,
        ready_at,
        terminated_at
      FROM exam_sessions
      WHERE exam_session_id = $1`,
      [sessionId]
    );

    if (result.rows.length === 0) {
      return sessionNotFoundError(sessionId);
    }

    const row = result.rows[0];

    // Determine last_transition_at based on state
    let lastTransitionAt = row.started_at;
    if (row.ready_at) {
      lastTransitionAt = row.ready_at;
    }
    if (row.terminated_at) {
      lastTransitionAt = row.terminated_at;
    }

    return {
      session_id: sessionId,
      state: row.lifecycle_state,
      reason: row.lifecycle_reason || null,
      started_at: row.started_at?.toISOString() || null,
      last_transition_at: lastTransitionAt?.toISOString() || null,
    };
  } finally {
    if (shouldClosePool) {
      await dbPool.end();
    }
  }
}

// Re-export state machine functions for testing
export {
  isValidState,
  isValidTransition,
  getAllowedTransitions,
  VALID_STATES,
} from './state-machine.js';
