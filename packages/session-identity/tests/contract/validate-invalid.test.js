/**
 * Contract Test: Identity Invalid UUID
 *
 * Test: Invalid UUID format returns error with exit code 3
 * CLI: session-identity validate --user-id "not-uuid" --session-id <uuid>
 * Expected: exit 3 + JSON { error: true, code: "INVALID_IDENTITY", message, details }
 *
 * @requirements FR-001, NFR-001
 */
import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI_PATH = join(__dirname, '../../src/cli.js');

describe('session-identity validate - invalid UUID cases', () => {
  const validUserId = '550e8400-e29b-41d4-a716-446655440000';
  const validSessionId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

  it('should exit with code 3 when user-id is not a valid UUID', () => {
    let exitCode = 0;
    let stderr = '';

    try {
      execSync(
        `node ${CLI_PATH} validate --user-id "not-a-uuid" --session-id ${validSessionId}`,
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
    expect(output.details.invalid_fields).toContain('user_id');
  });

  it('should exit with code 3 when session-id is not a valid UUID', () => {
    let exitCode = 0;
    let stderr = '';

    try {
      execSync(
        `node ${CLI_PATH} validate --user-id ${validUserId} --session-id "invalid-session"`,
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
    expect(output.details.invalid_fields).toContain('session_id');
  });

  it('should exit with code 3 when environment-id is provided but not a valid UUID', () => {
    let exitCode = 0;
    let stderr = '';

    try {
      execSync(
        `node ${CLI_PATH} validate --user-id ${validUserId} --session-id ${validSessionId} --environment-id "bad-env"`,
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
    expect(output.details.invalid_fields).toContain('environment_id');
  });

  it('should reject empty string as user-id', () => {
    let exitCode = 0;
    let stderr = '';

    try {
      execSync(
        `node ${CLI_PATH} validate --user-id "" --session-id ${validSessionId}`,
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

  it('should reject UUID-like strings with wrong format', () => {
    let exitCode = 0;
    let stderr = '';

    // Missing one character
    try {
      execSync(
        `node ${CLI_PATH} validate --user-id "550e8400-e29b-41d4-a716-44665544000" --session-id ${validSessionId}`,
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
