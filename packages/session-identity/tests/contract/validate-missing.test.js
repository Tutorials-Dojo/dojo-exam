/**
 * Contract Test: Identity Missing Field
 *
 * Test: Missing user_id returns error with exit code 3
 * CLI: session-identity validate --session-id <uuid>
 * Expected: exit 3 + JSON { error: true, code: "INVALID_IDENTITY", message, details: { missing_fields } }
 *
 * @requirements FR-001, NFR-001, NFR-002
 */
import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI_PATH = join(__dirname, '../../src/cli.js');

describe('session-identity validate - missing field cases', () => {
  const validSessionId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
  const validUserId = '550e8400-e29b-41d4-a716-446655440000';

  it('should exit with code 3 when user-id is missing', () => {
    let exitCode = 0;
    let stderr = '';

    try {
      execSync(
        `node ${CLI_PATH} validate --session-id ${validSessionId}`,
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
    expect(output.message).toContain('user_id');
    expect(output.details.missing_fields).toContain('user_id');
  });

  it('should exit with code 3 when session-id is missing', () => {
    let exitCode = 0;
    let stderr = '';

    try {
      execSync(
        `node ${CLI_PATH} validate --user-id ${validUserId}`,
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
    expect(output.message).toContain('session_id');
    expect(output.details.missing_fields).toContain('session_id');
  });

  it('should exit with code 3 when both user-id and session-id are missing', () => {
    let exitCode = 0;
    let stderr = '';

    try {
      execSync(
        `node ${CLI_PATH} validate`,
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
    expect(output.details.missing_fields).toContain('user_id');
    expect(output.details.missing_fields).toContain('session_id');
  });

  it('should not leak any session information on error', () => {
    let stderr = '';

    try {
      execSync(
        `node ${CLI_PATH} validate --session-id ${validSessionId}`,
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
      );
    } catch (error) {
      stderr = error.stderr;
    }

    const output = JSON.parse(stderr);
    // Should only contain error fields, not any session details
    expect(output).not.toHaveProperty('session');
    expect(output).not.toHaveProperty('identity');
    expect(Object.keys(output)).toEqual(['error', 'code', 'message', 'details']);
  });
});
