# Implementation Plan: Sailor.sh Kubernetes Exam Platform

**Branch**: `002-sailor-exam-platform` | **Date**: 2026-02-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-sailor-exam-platform/spec.md`

## Summary

Build a multi-session isolated Kubernetes exam platform where each user receives a dedicated
CKX/VNC remote desktop, with server-enforced time limits, Stripe payment integration, and
a modern React/TailwindCSS UI. The system extends the existing Express-based app and
facilitator services while fixing the 90% loading bug.

## Technical Context

**Language/Version**: JavaScript (Node.js 20 LTS)
**Primary Dependencies**: Express (backend), React + TailwindCSS (frontend), Stripe (payments), noVNC (VNC client)
**Storage**: PostgreSQL (session state, payments), Redis (session cache, rate limiting)
**Testing**: Vitest (unit/contract), Playwright (E2E), k6 (load testing)
**Target Platform**: AWS (EKS for CKX orchestration, RDS for PostgreSQL, ElastiCache for Redis)
**Project Type**: Web application (existing app + facilitator backend, new React frontend)
**Performance Goals**: 50+ concurrent sessions, session start <60s, VNC connect <10s after ready
**Constraints**: <200ms p95 API response, PCI compliance (Stripe handles card data), server-side time enforcement
**Scale/Scope**: Multi-user concurrent exams, horizontal CKX scaling, AWS deployment

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Requirement | Status | Notes |
|-----------|-------------|--------|-------|
| I. Preserve Existing Infrastructure | Integrate with existing auth, don't replace | ✅ PASS | Extending existing session management, not replacing |
| II. Multi-Session Isolation | One user = one CKX container | ✅ PASS | Session-to-container mapping enforced in orchestrator |
| III. Modern UI/UX | React + TailwindCSS, accessible, responsive | ✅ PASS | New React frontend with TailwindCSS |
| IV. AWS Scalability | Stateless services, external state, auto-scaling | ✅ PASS | PostgreSQL/Redis for state, EKS for CKX scaling |
| V. Non-Breaking Changes | Backward compatible, feature flags, reversible migrations | ✅ PASS | Additive schema changes, feature flags for rollout |
| VI. Security & Payment Compliance | TLS, server-side time, Stripe webhooks, PCI | ✅ PASS | Stripe handles card data, server enforces all limits |

**Gate Status**: ✅ ALL GATES PASS - Proceed to Phase 0

## Project Structure

### Documentation (this feature)

```text
specs/002-sailor-exam-platform/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (API contracts)
│   ├── api-contracts.md
│   └── websocket-contracts.md
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
app/                           # Existing web app (VNC proxy, static files)
├── public/
│   └── js/                    # Existing vanilla JS (to be replaced by React)
├── services/
│   ├── vnc-service.js         # Existing VNC proxy (to be extended)
│   └── session-service.js     # NEW: Session management
└── server.js                  # Existing Express server

facilitator/                   # Existing API service
├── src/
│   ├── controllers/
│   │   ├── sessionController.js    # NEW: Session lifecycle
│   │   ├── paymentController.js    # NEW: Stripe integration
│   │   └── remoteDesktopController.js  # Existing (extend)
│   ├── services/
│   │   ├── sessionService.js       # NEW: Session isolation logic
│   │   ├── timeEnforcementService.js # NEW: Server-side timer
│   │   ├── paymentService.js       # NEW: Stripe integration
│   │   └── ckxOrchestrator.js      # NEW: CKX container management
│   ├── middleware/
│   │   ├── sessionAuth.js          # NEW: Session ownership validation
│   │   └── rateLimiter.js          # NEW: Rate limiting
│   └── models/
│       ├── Session.js              # NEW: Exam session model
│       ├── Payment.js              # NEW: Payment model
│       └── ExamAccess.js           # NEW: User exam access
└── tests/

frontend/                      # NEW: React frontend
├── src/
│   ├── components/
│   │   ├── ExamCatalog/
│   │   ├── ExamSession/
│   │   ├── VNCViewer/
│   │   ├── Timer/
│   │   └── Payment/
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── Dashboard.jsx
│   │   ├── ExamView.jsx
│   │   └── Results.jsx
│   ├── services/
│   │   ├── api.js
│   │   └── websocket.js
│   └── hooks/
│       ├── useSession.js
│       └── useTimer.js
└── tests/

packages/                      # Existing session libraries (from 001 feature)
├── session-identity/
└── session-lifecycle/

migrations/                    # NEW: Database migrations
├── 001_add_exam_sessions.sql
├── 002_add_payments.sql
└── 003_add_exam_access.sql
```

**Structure Decision**: Web application with existing backend (app + facilitator) extended,
plus new React frontend. Packages from 001-multi-session-isolation reused for session
identity and lifecycle management.

## Complexity Tracking

> No constitution violations - all gates pass.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (none) | - | - |

## Implementation Phases (from user input)

### Phase 1: Multi-Session Isolation (P1 - Critical)
- Session management middleware to associate CKX session with user
- Session API validation for user ownership
- Frontend CKX/VNC component for user-specific session
- Error handling for session fetch and VNC load failures
- Integration tests: User A cannot access User B session

### Phase 2: Exam Time Limitation (P1 - Critical)
- Database timer tracking per user session
- Server-side session expiration enforcement
- Frontend countdown timer with CKX/VNC disable after expiration
- Integration tests: Time enforcement with direct API calls

### Phase 3: Payment & Mock Exams (P2)
- Stripe integration for paid exam purchases
- Free mock exam routes with limitations
- Frontend UI for payment and mock exam selection
- Integration tests: Payment flow and access restrictions

### Phase 4: UI/UX Overhaul (P3)
- Redesign landing page, dashboard, and CKX frame
- Responsive design improvements
- Accessibility and cross-browser testing

### Phase 5: Scalability & AWS Infrastructure (P2)
- Containerize CKX instances for horizontal scaling
- Kubernetes deployment for exam sessions
- Logging, monitoring, and alerting
- Load testing with concurrent users

### Phase 6: Bug Fixes (P1 - Critical)
- Fix CKX JSON parsing errors
- Resolve VNC infinite loading issue (90% stuck)
- Stable VNC frame and terminal session tests
