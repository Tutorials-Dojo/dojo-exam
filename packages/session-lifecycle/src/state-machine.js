/**
 * Session Lifecycle State Machine
 *
 * Defines allowed lifecycle states and valid transitions.
 *
 * States:
 *   created      - Session record created, environment not yet provisioned
 *   initializing - Environment provisioning in progress
 *   ready        - Environment ready, waiting for candidate interaction
 *   running      - Candidate actively using the environment
 *   terminated   - Session completed normally
 *   failed       - Session failed due to error
 *
 * State Transitions:
 *   created      -> initializing | failed
 *   initializing -> ready | failed
 *   ready        -> running | terminated | failed
 *   running      -> terminated | failed
 *   terminated   -> (terminal state)
 *   failed       -> (terminal state)
 *
 * @module @dojo-exam/session-lifecycle/state-machine
 */

/**
 * Valid lifecycle states
 */
export const STATES = Object.freeze({
  CREATED: 'created',
  INITIALIZING: 'initializing',
  READY: 'ready',
  RUNNING: 'running',
  TERMINATED: 'terminated',
  FAILED: 'failed',
});

/**
 * All valid state values
 */
export const VALID_STATES = Object.freeze(Object.values(STATES));

/**
 * Terminal states (no transitions allowed)
 */
export const TERMINAL_STATES = Object.freeze([STATES.TERMINATED, STATES.FAILED]);

/**
 * State transition map
 * Key: current state
 * Value: array of allowed target states
 */
export const TRANSITIONS = Object.freeze({
  [STATES.CREATED]: [STATES.INITIALIZING, STATES.FAILED],
  [STATES.INITIALIZING]: [STATES.READY, STATES.FAILED],
  [STATES.READY]: [STATES.RUNNING, STATES.TERMINATED, STATES.FAILED],
  [STATES.RUNNING]: [STATES.TERMINATED, STATES.FAILED],
  [STATES.TERMINATED]: [],
  [STATES.FAILED]: [],
});

/**
 * Checks if a state value is valid.
 *
 * @param {string} state - State to check
 * @returns {boolean} True if valid state
 */
export function isValidState(state) {
  return VALID_STATES.includes(state);
}

/**
 * Gets allowed transitions from a given state.
 *
 * @param {string} currentState - Current state
 * @returns {string[]} Array of allowed target states
 */
export function getAllowedTransitions(currentState) {
  return TRANSITIONS[currentState] || [];
}

/**
 * Checks if a transition is valid.
 *
 * @param {string} fromState - Current state
 * @param {string} toState - Target state
 * @returns {boolean} True if transition is allowed
 */
export function isValidTransition(fromState, toState) {
  const allowed = getAllowedTransitions(fromState);
  return allowed.includes(toState);
}

/**
 * Checks if a state is terminal (no further transitions).
 *
 * @param {string} state - State to check
 * @returns {boolean} True if terminal state
 */
export function isTerminalState(state) {
  return TERMINAL_STATES.includes(state);
}

/**
 * Creates a transition validation error.
 *
 * @param {string} currentState - Current state
 * @param {string} requestedState - Requested target state
 * @returns {Object} Error object
 */
export function createTransitionError(currentState, requestedState) {
  return {
    error: true,
    code: 'INVALID_TRANSITION',
    message: `Cannot transition from '${currentState}' to '${requestedState}'`,
    details: {
      current_state: currentState,
      requested_state: requestedState,
      allowed_transitions: getAllowedTransitions(currentState),
    },
  };
}
