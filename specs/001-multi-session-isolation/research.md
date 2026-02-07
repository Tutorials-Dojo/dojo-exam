# Research: Multi-Session Exam Isolation

**Feature**: 001-multi-session-isolation
**Date**: 2026-02-07

## Technology Decisions

### Runtime & Language

| Decision | Rationale | Alternatives Considered |
|----------|-----------|------------------------|
| Node.js LTS (JavaScript) | High concurrency via async I/O; Existing CK-X ecosystem compatibility; Wide library availability | Python (slower for I/O-heavy workloads), Go (steeper learning curve), Deno (less mature ecosystem) |

### CLI Framework

| Decision | Rationale | Alternatives Considered |
|----------|-----------|------------------------|
| commander | Mature, well-documented, minimal overhead; Native Node.js argv parsing as fallback | yargs (heavier), native process.argv (too verbose for complex CLIs) |

### Backend Framework

| Decision | Rationale | Alternatives Considered |
|----------|-----------|------------------------|
| Fastify | Faster than Express; Built-in JSON schema validation; First-class async/await support | Express (slower, more middleware churn), Koa (smaller ecosystem) |

### Database

| Decision | Rationale | Alternatives Considered |
|----------|-----------|------------------------|
| PostgreSQL with `pg` client | Transactional integrity for lifecycle state; JSONB for flexible metadata; Battle-tested | SQLite (no concurrent writes), MongoDB (weaker transactions), Redis (not durable enough for source of truth) |

### Container Orchestration

| Decision | Rationale | Alternatives Considered |
|----------|-----------|------------------------|
| Kubernetes (k3d for local dev) | Existing CK-X infrastructure; Native pod isolation; Resource limits per session | Docker Compose (no orchestration), Podman (less Kubernetes-native) |

### WebSocket Library

| Decision | Rationale | Alternatives Considered |
|----------|-----------|------------------------|
| ws | Minimal, standards-compliant, no framework lock-in | socket.io (too opinionated, adds complexity), fastify-websocket (tighter coupling) |

### Terminal Frontend

| Decision | Rationale | Alternatives Considered |
|----------|-----------|------------------------|
| xterm.js | De facto standard for web terminals; Already used in CK-X; High performance | hterm (Chrome-specific), Terminal.js (less maintained) |

### Testing Framework

| Decision | Rationale | Alternatives Considered |
|----------|-----------|------------------------|
| Vitest | Fast, ESM-native, Jest-compatible API; Better performance for large test suites | Jest (slower startup), Mocha/Chai (more configuration), Node test runner (less mature) |

### Logging

| Decision | Rationale | Alternatives Considered |
|----------|-----------|------------------------|
| pino | Fastest structured JSON logger; Low overhead; Native async support | winston (heavier), bunyan (less maintained), console.log (not structured) |

## Architecture Decisions

### Session Identity Model

| Decision | Rationale |
|----------|-----------|
| Composite key: `{user_id, exam_session_id, execution_environment_id}` | Explicit identity at all layers; No ambient context; Failure when any component missing |

### Lifecycle State Machine

| Decision | Rationale |
|----------|-----------|
| States: `created → initializing → ready → running → terminated` (with `failed` as terminal state from any) | Deterministic transitions; Observable at each step; Clear error states |

### Container Isolation Strategy

| Decision | Rationale |
|----------|-----------|
| One Kubernetes Pod per exam session with unique namespace or labels | Complete process isolation; No shared volumes; Resource quotas per pod |

### Database as Source of Truth

| Decision | Rationale |
|----------|-----------|
| All lifecycle state persisted to PostgreSQL before client notification | Backend authority; No frontend inference; Survives process restarts |

### Stateless Orchestrator Pattern

| Decision | Rationale |
|----------|-----------|
| Orchestrator holds no in-memory state; All state in database + Kubernetes | Horizontal scalability; Crash recovery; No sticky sessions required |

## Integration Patterns

### Session Start Flow

```
1. Client sends POST /sessions with {user_id, exam_id}
2. API validates identity via session-identity CLI
3. Orchestrator creates session record (state: created)
4. Orchestrator calls execution-environment CLI to provision pod
5. Lifecycle transitions: created → initializing → ready
6. Client receives session_id + WebSocket URL
7. Client connects to terminal via WebSocket (scoped by session_id)
```

### Session Termination Flow

```
1. Timer expires OR client submits OR admin terminates
2. Orchestrator transitions lifecycle to terminated
3. cleanup-ttl CLI destroys pod
4. Database record updated with termination timestamp
5. WebSocket connections closed with termination message
```

### Access Control Pattern

```
1. Every API/WebSocket request includes session_id + user_id
2. environment-access CLI validates ownership
3. Mismatch → 403 Forbidden (no information leakage)
4. Match → proceed with request
```

## Testing Strategy Details

### Contract Test Approach

- Each library CLI tested via subprocess execution
- Input: command-line arguments
- Output: JSON stdout, exit codes
- Example: `session-lifecycle transition --session-id abc --to ready` → `{"state": "ready", "previous": "initializing"}`

### Integration Test Approach

- Real PostgreSQL instance (via testcontainers or docker-compose)
- Real Kubernetes cluster (k3d for local, kind for CI)
- Real WebSocket connections between test client and backend
- No mocks for session isolation verification

### Failure Injection Scenarios

| Scenario | Test Approach |
|----------|---------------|
| Pod startup failure | Kill pod during initializing state; Verify lifecycle → failed |
| Database unavailable | Stop PostgreSQL; Verify explicit error to client |
| WebSocket disconnect | Close connection; Verify session remains active for reconnection window |
| Unauthorized access | Use different user_id; Verify 403 with no session data |

## Open Questions (Resolved)

| Question | Resolution |
|----------|------------|
| How to handle pod creation timeout? | 60-second timeout with transition to failed state + explicit error message |
| How to detect abandoned sessions? | TTL library sweeps every 5 minutes; Sessions without activity for 2x exam duration are cleaned up |
| How to handle Kubernetes API failures? | Retry with exponential backoff (max 3 attempts); Then fail explicitly |

## References

- [Kubernetes API Node.js Client](https://github.com/kubernetes-client/javascript)
- [xterm.js Documentation](https://xtermjs.org/docs/)
- [pino Logger](https://getpino.io/)
- [Vitest Documentation](https://vitest.dev/)
- [Fastify Documentation](https://www.fastify.io/docs/latest/)
