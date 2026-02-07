/**
 * Contract Test: Identity Valid
 *
 * Test: Valid identity returns JSON with validated identity
 * CLI: session-identity validate --user-id <uuid> --session-id <uuid>
 * Expected: exit 0 + JSON { valid: true, identity: { user_id, exam_session_id, environment_id } }
 *
 * @requirements FR-001, NFR-001
 */
import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI_PATH = join(__dirname, '../../src/cli.js');

describe('session-identity validate - success cases', () => {
  const validUserId = '550e8400-e29b-41d4-a716-446655440000';
  const validSessionId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
  const validEnvironmentId = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

  it('should return valid identity when user-id and session-id are provided', () => {
    const result = execSync(
      `node ${CLI_PATH} validate --user-id ${validUserId} --session-id ${validSessionId}`,
      { encoding: 'utf-8' }
    );

    const output = JSON.parse(result);

    expect(output.valid).toBe(true);
    expect(output.identity.user_id).toBe(validUserId);
    expect(output.identity.exam_session_id).toBe(validSessionId);
    expect(output.identity.environment_id).toBeNull();
  });

  it('should return valid identity with all three fields when environment-id is also provided', () => {
    const result = execSync(
      `node ${CLI_PATH} validate --user-id ${validUserId} --session-id ${validSessionId} --environment-id ${validEnvironmentId}`,
      { encoding: 'utf-8' }
    );

    const output = JSON.parse(result);

    expect(output.valid).toBe(true);
    expect(output.identity.user_id).toBe(validUserId);
    expect(output.identity.exam_session_id).toBe(validSessionId);
    expect(output.identity.environment_id).toBe(validEnvironmentId);
  });

  it('should output valid JSON to stdout', () => {
    const result = execSync(
      `node ${CLI_PATH} validate --user-id ${validUserId} --session-id ${validSessionId}`,
      { encoding: 'utf-8' }
    );

    // Should not throw when parsing
    expect(() => JSON.parse(result)).not.toThrow();
  });
});
