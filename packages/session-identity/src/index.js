/**
 * Session Identity Library
 *
 * Validates explicit identity presence for session operations.
 * Per Article V (Explicit Identity): user_id, exam_session_id, environment_id
 *
 * @module @dojo-exam/session-identity
 */

// UUID v4 regex pattern (RFC 4122)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates a UUID string format.
 * @param {string} value - Value to validate
 * @returns {boolean} True if valid UUID
 */
export function isValidUuid(value) {
  if (!value || typeof value !== 'string') {
    return false;
  }
  return UUID_REGEX.test(value);
}

/**
 * @typedef {Object} SessionIdentity
 * @property {string} user_id - User identifier (UUID)
 * @property {string} exam_session_id - Session identifier (UUID)
 * @property {string|null} environment_id - Environment identifier (UUID, optional)
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether identity is valid
 * @property {SessionIdentity} [identity] - Validated identity (only if valid)
 */

/**
 * @typedef {Object} ValidationError
 * @property {boolean} error - Always true
 * @property {string} code - Error code (INVALID_IDENTITY)
 * @property {string} message - Human-readable error message
 * @property {Object} details - Error details
 * @property {string[]} [details.missing_fields] - List of missing required fields
 * @property {string[]} [details.invalid_fields] - List of fields with invalid format
 */

/**
 * Validates session identity components.
 *
 * @param {Object} input - Identity components
 * @param {string} [input.userId] - User identifier
 * @param {string} [input.sessionId] - Session identifier
 * @param {string} [input.environmentId] - Environment identifier (optional)
 * @returns {ValidationResult|ValidationError}
 */
export function validateIdentity({ userId, sessionId, environmentId }) {
  const missingFields = [];
  const invalidFields = [];

  // Check required fields are present
  if (!userId) {
    missingFields.push('user_id');
  }
  if (!sessionId) {
    missingFields.push('session_id');
  }

  // If required fields are missing, return error
  if (missingFields.length > 0) {
    return {
      error: true,
      code: 'INVALID_IDENTITY',
      message: `Missing required identity component: ${missingFields.join(', ')}`,
      details: {
        missing_fields: missingFields,
      },
    };
  }

  // Validate UUID formats
  if (!isValidUuid(userId)) {
    invalidFields.push('user_id');
  }
  if (!isValidUuid(sessionId)) {
    invalidFields.push('session_id');
  }
  if (environmentId && !isValidUuid(environmentId)) {
    invalidFields.push('environment_id');
  }

  // If any fields have invalid format, return error
  if (invalidFields.length > 0) {
    return {
      error: true,
      code: 'INVALID_IDENTITY',
      message: `Invalid UUID format for: ${invalidFields.join(', ')}`,
      details: {
        invalid_fields: invalidFields,
      },
    };
  }

  // All validations passed
  return {
    valid: true,
    identity: {
      user_id: userId,
      exam_session_id: sessionId,
      environment_id: environmentId || null,
    },
  };
}

/**
 * Creates a canonical session identity object.
 *
 * @param {string} userId - User identifier (UUID)
 * @param {string} sessionId - Session identifier (UUID)
 * @param {string} [environmentId] - Environment identifier (UUID, optional)
 * @returns {SessionIdentity}
 * @throws {Error} If validation fails
 */
export function createIdentity(userId, sessionId, environmentId = null) {
  const result = validateIdentity({ userId, sessionId, environmentId });

  if (result.error) {
    throw new Error(result.message);
  }

  return result.identity;
}
