/**
 * Contract Test: Valid Transition
 *
 * Test: Valid state transitions succeed
 * CLI: session-lifecycle transition --session-id <uuid> --to <state>
 * Expected: exit 0 + JSON { session_id, previous_state, current_state, transitioned_at }
 *
 * States: created -> initializing -> ready -> running -> terminated
 *
 * @requirements NFR-003, NFR-004
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI_PATH = join(__dirname, '../../src/cli.js');

// Note: These tests require a running PostgreSQL database
// Skip if DATABASE_URL is not set
const skipIfNoDb = !process.env.DATABASE_URL;

describe('session-lifecycle transition - valid transitions', () => {
  const sessionId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

  describe.skipIf(skipIfNoDb)('with database', () => {
    it('should transition from created to initializing', () => {
      const result = execSync(
        `node ${CLI_PATH} transition --session-id ${sessionId} --to initializing`,
        { encoding: 'utf-8' }
      );

      const output = JSON.parse(result);

      expect(output.session_id).toBe(sessionId);
      expect(output.previous_state).toBe('created');
      expect(output.current_state).toBe('initializing');
      expect(output.transitioned_at).toBeDefined();
    });

    it('should transition from initializing to ready', () => {
      const result = execSync(
        `node ${CLI_PATH} transition --session-id ${sessionId} --to ready`,
        { encoding: 'utf-8' }
      );

      const output = JSON.parse(result);

      expect(output.previous_state).toBe('initializing');
      expect(output.current_state).toBe('ready');
    });

    it('should transition from ready to running', () => {
      const result = execSync(
        `node ${CLI_PATH} transition --session-id ${sessionId} --to running`,
        { encoding: 'utf-8' }
      );

      const output = JSON.parse(result);

      expect(output.previous_state).toBe('ready');
      expect(output.current_state).toBe('running');
    });

    it('should transition from running to terminated', () => {
      const result = execSync(
        `node ${CLI_PATH} transition --session-id ${sessionId} --to terminated`,
        { encoding: 'utf-8' }
      );

      const output = JSON.parse(result);

      expect(output.previous_state).toBe('running');
      expect(output.current_state).toBe('terminated');
    });

    it('should transition from any state to failed with reason', () => {
      const newSessionId = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
      const result = execSync(
        `node ${CLI_PATH} transition --session-id ${newSessionId} --to failed --reason "Pod creation timeout"`,
        { encoding: 'utf-8' }
      );

      const output = JSON.parse(result);

      expect(output.current_state).toBe('failed');
    });
  });

  describe('state machine validation (unit)', () => {
    it('should define allowed transitions for created state', async () => {
      const { getAllowedTransitions } = await import('../../src/state-machine.js');

      const allowed = getAllowedTransitions('created');

      expect(allowed).toContain('initializing');
      expect(allowed).toContain('failed');
      expect(allowed).not.toContain('running');
      expect(allowed).not.toContain('terminated');
    });

    it('should define allowed transitions for initializing state', async () => {
      const { getAllowedTransitions } = await import('../../src/state-machine.js');

      const allowed = getAllowedTransitions('initializing');

      expect(allowed).toContain('ready');
      expect(allowed).toContain('failed');
      expect(allowed).not.toContain('created');
      expect(allowed).not.toContain('running');
    });

    it('should define allowed transitions for ready state', async () => {
      const { getAllowedTransitions } = await import('../../src/state-machine.js');

      const allowed = getAllowedTransitions('ready');

      expect(allowed).toContain('running');
      expect(allowed).toContain('terminated');
      expect(allowed).toContain('failed');
    });

    it('should define allowed transitions for running state', async () => {
      const { getAllowedTransitions } = await import('../../src/state-machine.js');

      const allowed = getAllowedTransitions('running');

      expect(allowed).toContain('terminated');
      expect(allowed).toContain('failed');
      expect(allowed).not.toContain('ready');
      expect(allowed).not.toContain('initializing');
    });

    it('should define no transitions for terminated state (terminal)', async () => {
      const { getAllowedTransitions } = await import('../../src/state-machine.js');

      const allowed = getAllowedTransitions('terminated');

      expect(allowed).toEqual([]);
    });

    it('should define no transitions for failed state (terminal)', async () => {
      const { getAllowedTransitions } = await import('../../src/state-machine.js');

      const allowed = getAllowedTransitions('failed');

      expect(allowed).toEqual([]);
    });
  });
});
