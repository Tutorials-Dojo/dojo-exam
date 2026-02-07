# Feature Specification: Multi-Session Exam Isolation

**Feature Branch**: `001-multi-session-isolation`
**Created**: 2026-02-07
**Status**: Draft
**Input**: User description: "Multi-session exam environment with isolation"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Start an Exam Session (Priority: P1)

As an exam candidate, I want to start an exam and immediately receive my own
isolated execution environment so that I can begin working on exam tasks
without waiting or interference.

**Why this priority**: This is the foundational capability. Without the ability
to start an isolated session, no other functionality can be used.

**Independent Test**: Can be fully tested by a single candidate starting an
exam and verifying they receive a working execution environment with terminal
access.

**Acceptance Scenarios**:

1. **Given** a candidate has selected an exam, **When** they click "Start Exam",
   **Then** a new exam session is created and the candidate sees their execution
   environment within the expected readiness time.

2. **Given** a candidate starts an exam, **When** the session is created,
   **Then** the session is uniquely identified by user_id, exam_session_id, and
   execution_environment_id.

3. **Given** a candidate starts an exam, **When** the execution environment is
   not yet ready, **Then** the candidate sees accurate progress status (not an
   indefinite loading state).

---

### User Story 2 - Interact with Execution Environment (Priority: P1)

As an exam candidate, I want to use the terminal and/or desktop in my execution
environment so that I can complete exam tasks interactively.

**Why this priority**: This is equally critical as starting a session. The
candidate must be able to interact with their environment to complete the exam.

**Independent Test**: Can be tested by a candidate executing commands in the
terminal and verifying output reflects only their session state.

**Acceptance Scenarios**:

1. **Given** a candidate has an active exam session, **When** they type commands
   in the terminal, **Then** the output reflects the state of their session only.

2. **Given** a candidate is working in their execution environment, **When** they
   create files or run processes, **Then** those resources exist only within
   their session.

3. **Given** a candidate is using the execution environment, **When** another
   candidate performs actions in their own session, **Then** the first candidate's
   environment is unaffected.

---

### User Story 3 - View Session Status (Priority: P2)

As an exam candidate, I want to see the current status of my exam session so
that I know whether my session is active, how much time remains, and if any
issues have occurred.

**Why this priority**: Status visibility is important for user experience but
not strictly required for basic exam functionality.

**Independent Test**: Can be tested by checking that session status accurately
reflects backend state at each lifecycle stage.

**Acceptance Scenarios**:

1. **Given** a candidate has an active session, **When** they check session
   status, **Then** they see the current lifecycle state as verified by the
   backend.

2. **Given** a session encounters an error, **When** the candidate views status,
   **Then** they see a clear error message explaining the failure.

3. **Given** the backend cannot determine session status, **When** the candidate
   views status, **Then** they see an explicit failure message (not a stalled
   loading indicator).

---

### User Story 4 - End Exam Session (Priority: P2)

As an exam candidate, I want my exam session to terminate properly when the exam
ends so that resources are released and I can no longer access the environment.

**Why this priority**: Proper session termination is important for resource
management and security, but the core exam-taking experience has higher priority.

**Independent Test**: Can be tested by ending a session and verifying the
execution environment becomes inaccessible and resources are released.

**Acceptance Scenarios**:

1. **Given** an active exam session, **When** the exam time expires or the
   candidate submits, **Then** the session is terminated and the execution
   environment is no longer accessible.

2. **Given** a terminated session, **When** the candidate attempts to access the
   execution environment, **Then** access is denied with a clear message.

3. **Given** a session terminates, **When** resources are released, **Then** no
   session state persists beyond the exam lifecycle.

---

### User Story 5 - Concurrent Exam Sessions (Priority: P3)

As the exam platform, I want to support multiple candidates taking exams
simultaneously so that the system scales to real-world usage.

**Why this priority**: Concurrency is required for production use but is an
enhancement over single-user functionality.

**Independent Test**: Can be tested by running multiple simultaneous exam
sessions and verifying no cross-session interference or performance degradation.

**Acceptance Scenarios**:

1. **Given** multiple candidates start exams at the same time, **When** sessions
   are created, **Then** each candidate receives their own fully isolated
   execution environment.

2. **Given** many concurrent exam sessions, **When** candidates interact with
   their environments, **Then** no candidate can observe or affect another
   candidate's session.

3. **Given** the system is under concurrent load, **When** new sessions are
   created, **Then** system performance does not degrade for existing sessions.

---

### Edge Cases

- What happens when session creation fails? Candidate receives a clear error
  message with actionable guidance. System does not enter an indefinite loading
  state.

- What happens when a candidate attempts to access another candidate's session?
  Access is denied. No information about the other session is leaked.

- What happens when the backend becomes unavailable during an active session?
  The failure is surfaced explicitly to the candidate. Silent failures or
  stalled progress indicators are forbidden.

- What happens when a session times out while the candidate is actively working?
  The session terminates according to lifecycle rules. The candidate sees a
  clear termination message.

- What happens when a candidate's network connection drops during a session?
  When reconnected, the candidate can resume if the session is still active.
  If the session has terminated, they are informed clearly.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST create a new exam session when a candidate starts an
  exam, uniquely associating the session with that candidate.

- **FR-002**: System MUST provide the candidate access only to their own
  execution environment; access to other candidates' environments is forbidden.

- **FR-003**: System MUST ensure that actions performed within one exam session
  do not affect any other session (complete isolation).

- **FR-004**: System MUST scope all state created during a session exclusively
  to that session; no cross-session state sharing.

- **FR-005**: System MUST allow the candidate to interact with the execution
  environment (terminal and/or desktop) throughout the session duration.

- **FR-006**: System MUST ensure input and output reflect only the state of
  the candidate's own session.

- **FR-007**: System MUST expose the current status of the exam session to
  the candidate, with status transitions reflecting backend-verified state.

- **FR-008**: System MUST terminate the exam session when the exam ends
  (time expiry or submission).

- **FR-009**: System MUST make the execution environment inaccessible after
  session termination.

- **FR-010**: System MUST release session resources after termination.

- **FR-011**: System MUST deny access and leak no information when a candidate
  attempts to access a session that is not theirs.

- **FR-012**: System MUST display a clear error message when session
  initialization fails; indefinite loading states are forbidden.

- **FR-013**: System MUST surface backend unavailability explicitly; silent
  failures or stalled progress indicators are forbidden.

### Non-Functional Requirements

- **NFR-001**: Every exam session MUST be explicitly associated with a single
  candidate via user_id, exam_session_id, and execution_environment_id.

- **NFR-002**: Session behavior MUST never rely on inferred or implicit identity.

- **NFR-003**: Exam sessions MUST progress through clearly defined lifecycle
  states; ambiguous or undefined states are forbidden.

- **NFR-004**: Session creation, readiness, failure, and termination MUST be
  externally observable.

- **NFR-005**: The platform MUST be able to report why a session is unavailable
  or failed.

- **NFR-006**: Multiple exam sessions MUST be able to exist concurrently without
  degradation or interference.

### Key Entities

- **Exam Candidate**: A user taking an exam. Identified by a unique user_id.
  Can have only one active exam session at a time.

- **Exam Session**: A time-bounded, isolated environment in which a single
  candidate completes an exam. Identified by exam_session_id. Has a defined
  lifecycle (created → ready → active → terminated). Associated with exactly
  one candidate and one execution environment.

- **Execution Environment**: The interactive environment (terminal and/or
  desktop) presented to the candidate during an exam session. Identified by
  execution_environment_id. Fully isolated from other execution environments.
  Provides terminal access and optionally desktop access.

- **Session Lifecycle**: The progression of an exam session through defined
  states: created, ready, active, terminated. Each state transition is
  backend-verified and observable.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Candidates can start an exam and access their execution
  environment within 60 seconds of initiating the start action.

- **SC-002**: 100% of session actions are isolated; no cross-session data
  leakage or interference detected under concurrent load testing.

- **SC-003**: System supports at least 50 concurrent exam sessions without
  performance degradation (session creation time remains under 60 seconds).

- **SC-004**: Session status is always accurate within 5 seconds of backend
  state change; no stale or misleading status is displayed.

- **SC-005**: When session creation fails, candidates receive a clear error
  within 10 seconds; no candidate experiences an indefinite loading state.

- **SC-006**: Unauthorized session access attempts are denied with zero
  information leakage about other sessions; 100% enforcement rate.

- **SC-007**: After session termination, the execution environment is
  inaccessible within 30 seconds and resources are released within 5 minutes.

## Assumptions

- The system will use containerized execution environments (e.g., Docker)
  for isolation, consistent with the existing CK-X Simulator architecture.

- Candidates are already authenticated before starting an exam; this feature
  does not cover authentication itself.

- Session duration limits are defined by the exam configuration and enforced
  by the platform.

- Network connectivity is required for session interaction; offline mode is
  not supported.

## Explicit Non-Goals

- The system does not support shared sessions (multiple candidates in one
  session).

- The system does not allow session reuse across candidates.

- The system does not persist execution environment state beyond the exam
  lifecycle unless explicitly specified.

- The system does not provide session pause/resume functionality (out of scope
  for this feature).
