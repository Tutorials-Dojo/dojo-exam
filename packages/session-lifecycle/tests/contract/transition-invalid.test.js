/**
 * Contract Test: Invalid Transition
 *
 * Test: Invalid state transitions are rejected
 * CLI: session-lifecycle transition --session-id <uuid> --to running (when terminated)
 * Expected: exit 6 + JSON { error: true, code: "INVALID_TRANSITION", message, details }
 *
 * @requirements NFR-003, NFR-004
 */
import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI_PATH = join(__dirname, '../../src/cli.js');

// Note: These tests require a running PostgreSQL database
const skipIfNoDb = !process.env.DATABASE_URL;

describe('session-lifecycle transition - invalid transitions', () => {
  const sessionId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

  describe('state machine validation (unit)', () => {
    it('should reject transition from terminated to running', async () => {
      const { isValidTransition } = await import('../../src/state-machine.js');

      const result = isValidTransition('terminated', 'running');

      expect(result).toBe(false);
    });

    it('should reject transition from terminated to created', async () => {
      const { isValidTransition } = await import('../../src/state-machine.js');

      const result = isValidTransition('terminated', 'created');

      expect(result).toBe(false);
    });

    it('should reject transition from failed to running', async () => {
      const { isValidTransition } = await import('../../src/state-machine.js');

      const result = isValidTransition('failed', 'running');

      expect(result).toBe(false);
    });

    it('should reject transition from running to created (backwards)', async () => {
      const { isValidTransition } = await import('../../src/state-machine.js');

      const result = isValidTransition('running', 'created');

      expect(result).toBe(false);
    });

    it('should reject transition from ready to initializing (backwards)', async () => {
      const { isValidTransition } = await import('../../src/state-machine.js');

      const result = isValidTransition('ready', 'initializing');

      expect(result).toBe(false);
    });

    it('should reject transition to same state', async () => {
      const { isValidTransition } = await import('../../src/state-machine.js');

      expect(isValidTransition('created', 'created')).toBe(false);
      expect(isValidTransition('running', 'running')).toBe(false);
    });
  });

  describe.skipIf(skipIfNoDb)('with database - CLI errors', () => {
    it('should exit with code 6 when transition from terminated to running', () => {
      let exitCode = 0;
      let stderr = '';

      try {
        execSync(
          `node ${CLI_PATH} transition --session-id ${sessionId} --to running`,
          { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
        );
      } catch (error) {
        exitCode = error.status;
        stderr = error.stderr;
      }

      expect(exitCode).toBe(6);

      const output = JSON.parse(stderr);
      expect(output.error).toBe(true);
      expect(output.code).toBe('INVALID_TRANSITION');
      expect(output.message).toContain('terminated');
      expect(output.message).toContain('running');
      expect(output.details.current_state).toBe('terminated');
      expect(output.details.requested_state).toBe('running');
      expect(output.details.allowed_transitions).toEqual([]);
    });

    it('should exit with code 4 when session does not exist', () => {
      let exitCode = 0;
      let stderr = '';
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      try {
        execSync(
          `node ${CLI_PATH} transition --session-id ${nonExistentId} --to running`,
          { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
        );
      } catch (error) {
        exitCode = error.status;
        stderr = error.stderr;
      }

      expect(exitCode).toBe(4);

      const output = JSON.parse(stderr);
      expect(output.error).toBe(true);
      expect(output.code).toBe('SESSION_NOT_FOUND');
    });
  });

  describe('CLI argument validation', () => {
    it('should exit with code 2 when session-id is missing', () => {
      let exitCode = 0;
      let stderr = '';

      try {
        execSync(
          `node ${CLI_PATH} transition --to running`,
          { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
        );
      } catch (error) {
        exitCode = error.status;
        stderr = error.stderr;
      }

      expect(exitCode).toBe(2);
    });

    it('should exit with code 2 when target state is missing', () => {
      let exitCode = 0;
      let stderr = '';

      try {
        execSync(
          `node ${CLI_PATH} transition --session-id ${sessionId}`,
          { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
        );
      } catch (error) {
        exitCode = error.status;
        stderr = error.stderr;
      }

      expect(exitCode).toBe(2);
    });

    it('should exit with code 2 when target state is invalid', () => {
      let exitCode = 0;
      let stderr = '';

      try {
        execSync(
          `node ${CLI_PATH} transition --session-id ${sessionId} --to invalid_state`,
          { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
        );
      } catch (error) {
        exitCode = error.status;
        stderr = error.stderr;
      }

      expect(exitCode).toBe(2);
    });
  });
});
