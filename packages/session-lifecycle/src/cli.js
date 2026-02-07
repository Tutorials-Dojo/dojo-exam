#!/usr/bin/env node
/**
 * Session Lifecycle CLI
 *
 * Manages session lifecycle state transitions.
 *
 * Usage:
 *   session-lifecycle transition --session-id <uuid> --to <state> [--reason <text>]
 *   session-lifecycle status --session-id <uuid>
 *
 * Exit Codes:
 *   0 - Success
 *   2 - Invalid arguments
 *   3 - Validation failure (invalid identity)
 *   4 - Resource not found
 *   6 - State transition error
 *
 * @module @dojo-exam/session-lifecycle/cli
 */

import { Command } from 'commander';
import { transition, getStatus, VALID_STATES } from './index.js';

const program = new Command();

program
  .name('session-lifecycle')
  .description('Session lifecycle management CLI')
  .version('0.1.0')
  .exitOverride(); // Allow us to catch and handle exit

/**
 * Handles the result of a library call.
 * Outputs JSON and exits with appropriate code.
 */
function handleResult(result) {
  if (result.error) {
    process.stderr.write(JSON.stringify(result) + '\n');

    // Determine exit code based on error code
    switch (result.code) {
      case 'INVALID_IDENTITY':
      case 'INVALID_STATE':
        process.exit(3);
        break;
      case 'SESSION_NOT_FOUND':
        process.exit(4);
        break;
      case 'INVALID_TRANSITION':
        process.exit(6);
        break;
      default:
        process.exit(1);
    }
  }

  process.stdout.write(JSON.stringify(result) + '\n');
  process.exit(0);
}

program
  .command('transition')
  .description('Transition session to a new lifecycle state')
  .requiredOption('--session-id <uuid>', 'Session identifier (UUID)')
  .requiredOption('--to <state>', `Target state (${VALID_STATES.join(', ')})`)
  .option('--reason <text>', 'Reason for transition (required for failed state)')
  .action(async (options) => {
    // Validate state is in allowed list
    if (!VALID_STATES.includes(options.to)) {
      const errorOutput = {
        error: true,
        code: 'INVALID_ARGUMENTS',
        message: `Invalid state '${options.to}'. Valid states: ${VALID_STATES.join(', ')}`,
        details: {},
      };
      process.stderr.write(JSON.stringify(errorOutput) + '\n');
      process.exit(2);
    }

    try {
      const result = await transition({
        sessionId: options.sessionId,
        toState: options.to,
        reason: options.reason,
      });
      handleResult(result);
    } catch (error) {
      const errorOutput = {
        error: true,
        code: 'INTERNAL_ERROR',
        message: error.message,
        details: {},
      };
      process.stderr.write(JSON.stringify(errorOutput) + '\n');
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Get current session lifecycle state')
  .requiredOption('--session-id <uuid>', 'Session identifier (UUID)')
  .action(async (options) => {
    try {
      const result = await getStatus({
        sessionId: options.sessionId,
      });
      handleResult(result);
    } catch (error) {
      const errorOutput = {
        error: true,
        code: 'INTERNAL_ERROR',
        message: error.message,
        details: {},
      };
      process.stderr.write(JSON.stringify(errorOutput) + '\n');
      process.exit(1);
    }
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
  await program.parseAsync(process.argv);
} catch (error) {
  // Commander throws with specific codes for missing options
  if (error.code === 'commander.missingMandatoryOptionValue' ||
      error.code === 'commander.missingArgument' ||
      error.code === 'commander.optionMissingArgument') {
    process.exit(2);
  }
  // Unknown command or other commander errors
  if (error.code && error.code.startsWith('commander.')) {
    process.exit(2);
  }
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
