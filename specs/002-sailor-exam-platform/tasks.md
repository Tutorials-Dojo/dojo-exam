# Tasks: Sailor.sh Kubernetes Exam Platform

**Input**: Design documents from `/specs/002-sailor-exam-platform/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested - tests omitted per template guidelines.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `facilitator/src/` (existing API service)
- **App**: `app/` (existing VNC proxy service)
- **Frontend**: `frontend/src/` (new React app)
- **Migrations**: `migrations/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, React frontend setup, database migrations

- [ ] T001 Create React frontend project with Vite in frontend/
- [ ] T002 [P] Configure TailwindCSS in frontend/tailwind.config.js
- [ ] T003 [P] Install backend dependencies (stripe, pg) in facilitator/package.json
- [ ] T004 [P] Create migrations directory structure at migrations/
- [ ] T005 Create environment configuration template in facilitator/.env.example

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

- [ ] T006 Create migration 001_add_exam_type.sql adding type, price_cents, stripe_price_id, mock_duration_minutes to exams table
- [ ] T007 Create migration 002_create_exam_sessions.sql with ExamSession table per data-model.md
- [ ] T008 [P] Create migration 003_create_payments.sql with Payment table per data-model.md
- [ ] T009 [P] Create migration 004_create_exam_access.sql with ExamAccess table per data-model.md
- [ ] T010 Create migration 005_add_indexes.sql with performance indexes per data-model.md
- [ ] T011 Create ExamSession model in facilitator/src/models/Session.js
- [ ] T012 [P] Create Payment model in facilitator/src/models/Payment.js
- [ ] T013 [P] Create ExamAccess model in facilitator/src/models/ExamAccess.js
- [ ] T014 Implement session ownership middleware in facilitator/src/middleware/sessionAuth.js
- [ ] T015 [P] Implement rate limiter middleware in facilitator/src/middleware/rateLimiter.js
- [ ] T016 Create API router base in facilitator/src/routes/v1/index.js
- [ ] T017 Setup React Router and base layout in frontend/src/App.jsx
- [ ] T018 [P] Create API client service in frontend/src/services/api.js
- [ ] T019 [P] Create WebSocket client service in frontend/src/services/websocket.js

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 6 - Reliable Session Loading (Priority: P1) 🎯 MVP

**Goal**: Fix the "stuck at 90%" bug - sessions either complete loading or show clear error

**Independent Test**: Start 20 exam sessions and verify 100% either complete loading or show actionable error within 60 seconds

### Implementation for User Story 6

- [ ] T020 [US6] Add timeout handling (60s) to VNC connection in app/services/vnc-service.js
- [ ] T021 [US6] Add structured error responses for VNC failures in app/services/vnc-service.js
- [ ] T022 [US6] Implement JSON parsing error handling in facilitator/src/controllers/remoteDesktopController.js
- [ ] T023 [US6] Add retry mechanism with exponential backoff in frontend/src/services/api.js
- [ ] T024 [US6] Create SessionLoader component with accurate progress in frontend/src/components/ExamSession/SessionLoader.jsx
- [ ] T025 [US6] Add error boundary with retry option in frontend/src/components/ExamSession/ErrorBoundary.jsx
- [ ] T026 [US6] Implement session status polling with timeout in frontend/src/hooks/useSessionStatus.js

**Checkpoint**: Session loading is reliable - no more 90% stuck state

---

## Phase 4: User Story 1 - Isolated Exam Session (Priority: P1)

**Goal**: Each user gets dedicated, isolated CKX/VNC environment with session ownership enforcement

**Independent Test**: Two users start exams simultaneously; verify neither can access the other's environment

### Implementation for User Story 1

- [ ] T027 [US1] Implement CKX orchestrator for container management in facilitator/src/services/ckxOrchestrator.js
- [ ] T028 [US1] Implement session service with isolation logic in facilitator/src/services/sessionService.js
- [ ] T029 [US1] Create session controller with ownership validation in facilitator/src/controllers/sessionController.js
- [ ] T030 [US1] Add POST /sessions endpoint in facilitator/src/routes/v1/sessions.js
- [ ] T031 [P] [US1] Add GET /sessions/:sessionId endpoint in facilitator/src/routes/v1/sessions.js
- [ ] T032 [P] [US1] Add GET /sessions/active endpoint in facilitator/src/routes/v1/sessions.js
- [ ] T033 [P] [US1] Add DELETE /sessions/:sessionId endpoint in facilitator/src/routes/v1/sessions.js
- [ ] T034 [US1] Extend VNC proxy with session-aware routing in app/services/vnc-service.js
- [ ] T035 [US1] Add Redis session cache for VNC URL lookup in facilitator/src/utils/redisClient.js
- [ ] T036 [US1] Create VNCViewer component with noVNC integration in frontend/src/components/VNCViewer/VNCViewer.jsx
- [ ] T037 [P] [US1] Create ExamSession container component in frontend/src/components/ExamSession/ExamSession.jsx
- [ ] T038 [US1] Create useSession hook for session management in frontend/src/hooks/useSession.js
- [ ] T039 [US1] Create ExamView page with VNC embedding in frontend/src/pages/ExamView.jsx
- [ ] T040 [US1] Add session cleanup on termination in facilitator/src/services/sessionService.js

**Checkpoint**: Users have isolated sessions - no cross-user access possible

---

## Phase 5: User Story 2 - Time-Limited Exam Enforcement (Priority: P1)

**Goal**: Server-side time enforcement with accurate frontend display

**Independent Test**: Start short-duration exam; verify auto-termination when time expires even if frontend timer is manipulated

### Implementation for User Story 2

- [ ] T041 [US2] Implement time enforcement service with background worker in facilitator/src/services/timeEnforcementService.js
- [ ] T042 [US2] Add session expiration check to session service in facilitator/src/services/sessionService.js
- [ ] T043 [US2] Add GET /sessions/:sessionId/status endpoint in facilitator/src/routes/v1/sessions.js
- [ ] T044 [US2] Create WebSocket handler for session status updates in facilitator/src/controllers/websocketController.js
- [ ] T045 [US2] Create Timer component with server sync in frontend/src/components/Timer/Timer.jsx
- [ ] T046 [US2] Create useTimer hook with drift correction in frontend/src/hooks/useTimer.js
- [ ] T047 [US2] Add session expiration handling to ExamView page in frontend/src/pages/ExamView.jsx
- [ ] T048 [US2] Create SessionExpired overlay component in frontend/src/components/ExamSession/SessionExpired.jsx
- [ ] T049 [US2] Add time warning notifications (5 min, 1 min) in frontend/src/components/Timer/TimeWarning.jsx

**Checkpoint**: Time limits are enforced server-side - no client bypass possible

---

## Phase 6: User Story 3 - Payment and Exam Access (Priority: P2)

**Goal**: Stripe payment integration for paid exam purchases

**Independent Test**: Complete purchase flow and verify exam access is granted upon successful payment

### Implementation for User Story 3

- [ ] T050 [US3] Implement payment service with Stripe integration in facilitator/src/services/paymentService.js
- [ ] T051 [US3] Create payment controller in facilitator/src/controllers/paymentController.js
- [ ] T052 [US3] Add POST /payments/checkout endpoint in facilitator/src/routes/v1/payments.js
- [ ] T053 [P] [US3] Add POST /payments/webhook endpoint in facilitator/src/routes/v1/payments.js
- [ ] T054 [P] [US3] Add GET /payments endpoint in facilitator/src/routes/v1/payments.js
- [ ] T055 [US3] Implement exam access service in facilitator/src/services/examAccessService.js
- [ ] T056 [US3] Add GET /exams endpoint with pricing in facilitator/src/routes/v1/exams.js
- [ ] T057 [P] [US3] Add GET /exams/:examId endpoint in facilitator/src/routes/v1/exams.js
- [ ] T058 [US3] Create PaymentButton component with Stripe Checkout in frontend/src/components/Payment/PaymentButton.jsx
- [ ] T059 [P] [US3] Create PaymentSuccess page in frontend/src/pages/PaymentSuccess.jsx
- [ ] T060 [US3] Create ExamCatalog component with pricing display in frontend/src/components/ExamCatalog/ExamCatalog.jsx
- [ ] T061 [US3] Create ExamCard component with access status in frontend/src/components/ExamCatalog/ExamCard.jsx

**Checkpoint**: Paid exams work end-to-end via Stripe

---

## Phase 7: User Story 4 - Free Mock Exam Experience (Priority: P2)

**Goal**: Free mock exams available to all authenticated users with limited duration

**Independent Test**: New user can access mock exam without payment

### Implementation for User Story 4

- [ ] T062 [US4] Add mock access auto-grant logic in facilitator/src/services/examAccessService.js
- [ ] T063 [US4] Update session creation to respect mock duration in facilitator/src/services/sessionService.js
- [ ] T064 [US4] Add mock/full badge to ExamCard component in frontend/src/components/ExamCatalog/ExamCard.jsx
- [ ] T065 [US4] Create MockExamBanner component with upgrade prompt in frontend/src/components/ExamSession/MockExamBanner.jsx
- [ ] T066 [US4] Add upgrade flow from mock to full in frontend/src/components/Payment/UpgradePrompt.jsx
- [ ] T067 [US4] Create Results page with upgrade CTA in frontend/src/pages/Results.jsx

**Checkpoint**: Mock exams work for user acquisition

---

## Phase 8: User Story 5 - Modern UI Experience (Priority: P3)

**Goal**: Modern, responsive UI with TailwindCSS

**Independent Test**: User feedback comparing old/new designs; 90% rate as "good" or "excellent"

### Implementation for User Story 5

- [ ] T068 [US5] Create base UI components (Button, Card, Input) in frontend/src/components/ui/
- [ ] T069 [P] [US5] Create Header component with navigation in frontend/src/components/layout/Header.jsx
- [ ] T070 [P] [US5] Create Footer component in frontend/src/components/layout/Footer.jsx
- [ ] T071 [US5] Create Home page with modern hero section in frontend/src/pages/Home.jsx
- [ ] T072 [US5] Create Dashboard page with exam list in frontend/src/pages/Dashboard.jsx
- [ ] T073 [US5] Add responsive breakpoints to all components in frontend/src/
- [ ] T074 [US5] Add loading skeletons for async content in frontend/src/components/ui/Skeleton.jsx
- [ ] T075 [US5] Add toast notifications for user feedback in frontend/src/components/ui/Toast.jsx
- [ ] T076 [US5] Style VNCViewer container for modern appearance in frontend/src/components/VNCViewer/VNCViewer.jsx

**Checkpoint**: UI is modern and responsive

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T077 [P] Add structured logging to all services in facilitator/src/utils/logger.js
- [ ] T078 [P] Create health check endpoint in facilitator/src/routes/health.js
- [ ] T079 Add error tracking integration in facilitator/src/middleware/errorHandler.js
- [ ] T080 [P] Create migration runner script in migrations/run.js
- [ ] T081 [P] Add API documentation (OpenAPI spec) in docs/api.yaml
- [ ] T082 Run quickstart.md validation end-to-end
- [ ] T083 Security audit: verify session isolation
- [ ] T084 Performance test: verify 50+ concurrent sessions

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - can start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 - BLOCKS all user stories
- **Phase 3 (US6 - Bug Fix)**: Depends on Phase 2 - should be first P1 story
- **Phase 4 (US1 - Isolation)**: Depends on Phase 2 - can run parallel with Phase 3
- **Phase 5 (US2 - Time)**: Depends on Phase 4 (needs session infrastructure)
- **Phase 6 (US3 - Payment)**: Depends on Phase 2 - can run parallel with Phases 3-5
- **Phase 7 (US4 - Mock)**: Depends on Phase 6 (needs payment infrastructure)
- **Phase 8 (US5 - UI)**: Depends on Phase 2 - can run parallel with all others
- **Phase 9 (Polish)**: Depends on all desired user stories being complete

### User Story Dependencies

```
Phase 2 (Foundation)
       │
       ├──────────────────┬────────────────────┐
       ▼                  ▼                    ▼
Phase 3 (US6)     Phase 4 (US1)         Phase 6 (US3)
Bug Fix           Isolation              Payment
       │                  │                    │
       │                  ▼                    ▼
       │          Phase 5 (US2)         Phase 7 (US4)
       │          Time Limits           Mock Exams
       │                  │                    │
       └──────────────────┴────────────────────┘
                          │
                          ▼
                  Phase 8 (US5)
                  Modern UI
                          │
                          ▼
                  Phase 9 (Polish)
```

### Parallel Opportunities

Within each phase, tasks marked [P] can run in parallel:

- **Phase 1**: T002, T003, T004 can run in parallel
- **Phase 2**: T008+T009, T012+T013, T015, T018+T019 can run in parallel
- **Phase 4**: T031+T032+T033, T037 can run in parallel
- **Phase 6**: T053+T054, T057, T059 can run in parallel
- **Phase 8**: T069+T070 can run in parallel
- **Phase 9**: T077, T078, T080, T081 can run in parallel

---

## Implementation Strategy

### MVP First (Phase 1-4 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: US6 - Bug Fix (users can actually load sessions)
4. Complete Phase 4: US1 - Isolation (core security requirement)
5. **STOP and VALIDATE**: Test session loading and isolation independently
6. Deploy MVP if ready

### Full Feature Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add US6 (Bug Fix) → Verify no more 90% stuck
3. Add US1 (Isolation) → Verify session security
4. Add US2 (Time Limits) → Verify server enforcement
5. Add US3 (Payment) + US4 (Mock) → Verify monetization
6. Add US5 (UI) → Verify modern experience
7. Run Phase 9 Polish

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- US6 (Bug Fix) prioritized first as it blocks user testing of all other features
