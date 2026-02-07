#!/usr/bin/env node
/**
 * Session Identity CLI
 *
 * Validates explicit identity presence for session operations.
 *
 * Usage:
 *   session-identity validate --user-id <uuid> --session-id <uuid> [--environment-id <uuid>]
 *
 * Exit Codes:
 *   0 - Success
 *   2 - Invalid arguments
 *   3 - Validation failure (missing/invalid identity)
 *
 * @module @dojo-exam/session-identity/cli
 */

import { Command } from 'commander';
import { validateIdentity } from './index.js';

const program = new Command();

program
  .name('session-identity')
  .description('Session identity validation CLI')
  .version('0.1.0');

program
  .command('validate')
  .description('Validate session identity components')
  .option('--user-id <uuid>', 'User identifier (UUID)')
  .option('--session-id <uuid>', 'Session identifier (UUID)')
  .option('--environment-id <uuid>', 'Environment identifier (UUID)')
  .action((options) => {
    // Let the validateIdentity function handle missing fields
    // This allows us to return proper JSON error with exit code 3
    const result = validateIdentity({
      userId: options.userId,
      sessionId: options.sessionId,
      environmentId: options.environmentId,
    });

    if (result.error) {
      // Output error to stderr
      process.stderr.write(JSON.stringify(result) + '\n');
      process.exit(3);
    }

    // Output success to stdout
    process.stdout.write(JSON.stringify(result) + '\n');
    process.exit(0);
  });

// Handle missing required options
program.configureOutput({
  outputError: (str, write) => {
    const errorOutput = {
      error: true,
      code: 'INVALID_ARGUMENTS',
      message: str.trim(),
      details: {},
    };
    process.stderr.write(JSON.stringify(errorOutput) + '\n');
  },
});

// Parse with custom error handling
try {
  program.parse(process.argv);
} catch (error) {
  const errorOutput = {
    error: true,
    code: 'INVALID_ARGUMENTS',
    message: error.message,
    details: {},
  };
  process.stderr.write(JSON.stringify(errorOutput) + '\n');
  process.exit(2);
}

// If no command specified, show help
if (process.argv.length <= 2) {
  program.help();
}
