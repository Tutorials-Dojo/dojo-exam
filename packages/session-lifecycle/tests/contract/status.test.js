/**
 * Contract Test: Status Query
 *
 * Test: Current state retrieval
 * CLI: session-lifecycle status --session-id <uuid>
 * Expected: exit 0 + JSON { session_id, state, reason, started_at, last_transition_at }
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

describe('session-lifecycle status - query state', () => {
  const sessionId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

  describe.skipIf(skipIfNoDb)('with database', () => {
    it('should return current session state', () => {
      const result = execSync(
        `node ${CLI_PATH} status --session-id ${sessionId}`,
        { encoding: 'utf-8' }
      );

      const output = JSON.parse(result);

      expect(output.session_id).toBe(sessionId);
      expect(output.state).toBeDefined();
      expect(['created', 'initializing', 'ready', 'running', 'terminated', 'failed']).toContain(output.state);
      expect(output.started_at).toBeDefined();
      expect(output.last_transition_at).toBeDefined();
    });

    it('should include reason when state is failed', () => {
      const failedSessionId = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
      const result = execSync(
        `node ${CLI_PATH} status --session-id ${failedSessionId}`,
        { encoding: 'utf-8' }
      );

      const output = JSON.parse(result);

      if (output.state === 'failed') {
        expect(output.reason).toBeDefined();
        expect(output.reason).not.toBeNull();
      }
    });

    it('should return null reason when state is not failed', () => {
      const result = execSync(
        `node ${CLI_PATH} status --session-id ${sessionId}`,
        { encoding: 'utf-8' }
      );

      const output = JSON.parse(result);

      if (output.state !== 'failed') {
        expect(output.reason).toBeNull();
      }
    });
  });

  describe('CLI argument validation', () => {
    it('should exit with code 2 when session-id is missing', () => {
      let exitCode = 0;

      try {
        execSync(
          `node ${CLI_PATH} status`,
          { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
        );
      } catch (error) {
        exitCode = error.status;
      }

      expect(exitCode).toBe(2);
    });

    it('should exit with code 3 when session-id is not a valid UUID', () => {
      let exitCode = 0;
      let stderr = '';

      try {
        execSync(
          `node ${CLI_PATH} status --session-id "not-a-uuid"`,
          { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
        );
      } catch (error) {
        exitCode = error.status;
        stderr = error.stderr;
      }

      expect(exitCode).toBe(3);

      const output = JSON.parse(stderr);
      expect(output.error).toBe(true);
      expect(output.code).toBe('INVALID_IDENTITY');
    });
  });

  describe.skipIf(skipIfNoDb)('with database - not found', () => {
    it('should exit with code 4 when session does not exist', () => {
      let exitCode = 0;
      let stderr = '';
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      try {
        execSync(
          `node ${CLI_PATH} status --session-id ${nonExistentId}`,
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
});
