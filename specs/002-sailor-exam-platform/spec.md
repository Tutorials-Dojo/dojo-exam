# Feature Specification: Sailor.sh Kubernetes Exam Platform

**Feature Branch**: `002-sailor-exam-platform`
**Created**: 2026-02-07
**Status**: Draft
**Input**: User description: "Multi-session isolation, time limits, payments, UI improvements, scalability, and bug fixes for Kubernetes hands-on exam platform"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Isolated Exam Session (Priority: P1)

A user logs in and starts a Kubernetes hands-on exam. They receive their own dedicated remote desktop environment (CKX/VNC) that is completely isolated from other users. No other user can see, access, or interfere with their session. When they complete or abandon the exam, their environment is cleaned up.

**Why this priority**: Session isolation is the foundation of exam integrity. Without it, users could cheat by accessing others' work, or experience interference. This is a non-negotiable requirement for a certification exam platform.

**Independent Test**: Can be fully tested by having two users start exams simultaneously and verifying neither can access the other's environment. Delivers secure, independent exam-taking experience.

**Acceptance Scenarios**:

1. **Given** User A is authenticated, **When** User A starts an exam, **Then** User A receives a unique remote desktop session accessible only to them
2. **Given** User A and User B both have active exam sessions, **When** User A attempts to access User B's session URL or identifier, **Then** access is denied with an authorization error
3. **Given** User A has an active session, **When** User A's session ends (complete, timeout, or abandon), **Then** the remote desktop environment is terminated and resources released
4. **Given** a VNC connection fails during initialization, **When** the user attempts to start their exam, **Then** an informative error message is displayed with retry option

---

### User Story 2 - Time-Limited Exam Enforcement (Priority: P1)

A user taking a paid full exam has a strict time limit. The remaining time is always visible. When time expires, the exam ends automatically and the remote desktop becomes inaccessible, regardless of what the user does on their end.

**Why this priority**: Time enforcement is critical for exam validity and fairness. It prevents users from gaining unfair advantages and ensures consistent exam conditions.

**Independent Test**: Can be tested by starting a short-duration exam and verifying automatic termination when time expires, even if frontend timer is manipulated.

**Acceptance Scenarios**:

1. **Given** a user starts a timed exam, **When** the exam loads, **Then** a countdown timer showing remaining time is visible in the UI at all times
2. **Given** an exam has 5 minutes remaining, **When** time reaches zero, **Then** the remote desktop session is immediately terminated server-side
3. **Given** a user manipulates the frontend timer, **When** actual server time expires, **Then** the session is terminated regardless of frontend state
4. **Given** an exam has expired, **When** the user attempts to reconnect to their session, **Then** they receive a message indicating time has expired and cannot access the environment

---

### User Story 3 - Payment and Exam Access (Priority: P2)

Users can browse available exams, with some offered as free mock exams (limited features) and others as paid full exams. Users can purchase exam access, and the system handles payment securely. After purchase, users can access their paid exams.

**Why this priority**: Revenue generation is essential for platform sustainability. However, the platform can operate with free mock exams initially while payment integration is completed.

**Independent Test**: Can be tested by completing a purchase flow for a paid exam and verifying exam access is granted upon successful payment.

**Acceptance Scenarios**:

1. **Given** a user views the exam catalog, **When** the page loads, **Then** exams are clearly labeled as "Free Mock" or "Paid Full Exam" with pricing displayed
2. **Given** a user selects a paid exam, **When** they proceed to checkout, **Then** they are presented with a secure payment form
3. **Given** a user completes payment successfully, **When** the transaction is confirmed, **Then** the exam is immediately available in their account
4. **Given** a user has purchased an exam, **When** they access it, **Then** they receive the full-featured experience (full time, all questions, certificate eligible)
5. **Given** a payment fails, **When** the user is notified, **Then** they can retry payment or choose a different payment method

---

### User Story 4 - Free Mock Exam Experience (Priority: P2)

Users can access free mock exams to try the platform before purchasing. Mock exams have limited features compared to paid exams but provide a genuine preview of the exam experience.

**Why this priority**: Free mock exams drive user acquisition and reduce purchase friction by letting users experience the platform quality.

**Independent Test**: Can be tested by a new user accessing a mock exam without payment and experiencing limited but functional exam.

**Acceptance Scenarios**:

1. **Given** an unauthenticated user, **When** they view the exam catalog, **Then** they can see free mock exams are available
2. **Given** an authenticated user, **When** they start a free mock exam, **Then** they receive a remote desktop session with limited duration or question subset
3. **Given** a user completes a mock exam, **When** they finish, **Then** they are shown results and prompted to upgrade to full exam access

---

### User Story 5 - Modern UI Experience (Priority: P3)

Users interact with a modern, visually appealing interface that works well on desktop and tablet devices. The VNC remote desktop and terminal remain usable and responsive within the new design.

**Why this priority**: UI improvements increase user trust and satisfaction but do not block core functionality. Can be incrementally improved.

**Independent Test**: Can be tested through user feedback sessions comparing old and new designs, measuring task completion rates and satisfaction scores.

**Acceptance Scenarios**:

1. **Given** a user visits the platform, **When** the page loads, **Then** the UI appears modern and professional
2. **Given** a user is on a tablet device, **When** they navigate the exam catalog and account pages, **Then** the interface is responsive and usable
3. **Given** a user is in an active exam, **When** they interact with the VNC remote desktop, **Then** the desktop is responsive and the terminal is readable and usable
4. **Given** a user performs common actions (start exam, view results, manage account), **When** they complete these tasks, **Then** the interface provides clear feedback and guidance

---

### User Story 6 - Reliable Session Loading (Priority: P1)

Users no longer experience the "stuck at 90%" loading issue. Session initialization either completes successfully or fails with a clear error message and recovery options.

**Why this priority**: This is a critical bug fix. Users currently cannot use the platform reliably, which blocks all other features.

**Independent Test**: Can be tested by starting 20 exam sessions and verifying 100% either complete loading or show actionable error within 60 seconds.

**Acceptance Scenarios**:

1. **Given** a user starts an exam session, **When** the VNC desktop is initializing, **Then** progress updates are displayed accurately (no false 90% stuck state)
2. **Given** a session initialization takes longer than expected, **When** 60 seconds pass without completion, **Then** an error message with retry option is shown
3. **Given** a JSON parsing error occurs during session request, **When** the error is detected, **Then** the system handles it gracefully and displays user-friendly error message
4. **Given** any session initialization failure, **When** the user clicks retry, **Then** a fresh initialization attempt is made

---

### Edge Cases

- What happens when a user loses network connection mid-exam? System preserves session state for reconnection within time limit.
- What happens when payment webhook is delayed? System uses polling to verify payment status before timing out.
- What happens when a user has multiple browser tabs open? Only one active session per user per exam is allowed.
- How does the system handle concurrent session requests from same user? Second request is rejected with clear message.
- What happens if time expires during active work? Work up to expiration point is preserved for evaluation.
- What happens when CKX container fails to provision? User receives error with support contact and retry option.

## Requirements *(mandatory)*

### Functional Requirements

**Session Isolation**
- **FR-001**: System MUST create a dedicated, isolated remote desktop environment for each exam session
- **FR-002**: System MUST prevent users from accessing any session other than their own
- **FR-003**: System MUST associate each remote desktop session with the authenticated user's identity
- **FR-004**: System MUST terminate and clean up remote desktop environments when sessions end
- **FR-005**: System MUST display the correct session for the currently logged-in user only

**Time Enforcement**
- **FR-006**: System MUST enforce exam time limits server-side, independent of frontend state
- **FR-007**: System MUST display remaining exam time to users continuously during exams
- **FR-008**: System MUST automatically terminate sessions when time expires
- **FR-009**: System MUST prevent access to expired exam sessions

**Payments**
- **FR-010**: System MUST process payments securely through a PCI-compliant payment provider
- **FR-011**: System MUST clearly distinguish between free mock exams and paid full exams
- **FR-012**: System MUST grant exam access immediately upon successful payment confirmation
- **FR-013**: System MUST allow users to upgrade from free to paid exams seamlessly

**UI/UX**
- **FR-014**: System MUST provide a responsive interface for desktop and tablet devices
- **FR-015**: System MUST maintain usability of VNC remote desktop within the interface
- **FR-016**: System MUST provide visual feedback for all user actions

**Reliability**
- **FR-017**: System MUST complete session initialization or provide error within 60 seconds
- **FR-018**: System MUST handle malformed responses gracefully without crashing
- **FR-019**: System MUST provide actionable error messages with recovery options

**Scalability**
- **FR-020**: System MUST support horizontal scaling of remote desktop instances
- **FR-021**: System MUST log all significant events for monitoring and debugging

### Key Entities

- **User**: Authenticated individual who takes exams. Has account, payment history, exam access rights.
- **Exam**: A Kubernetes certification practice test. Has type (mock/full), duration, question set, pricing.
- **Exam Session**: An instance of a user taking an exam. Has start time, duration, status (active/completed/expired/failed), associated remote desktop.
- **Remote Desktop Environment**: An isolated CKX/VNC instance. Has connection details, user assignment, lifecycle state.
- **Payment**: A transaction for exam access. Has amount, status (pending/completed/failed), associated exam and user.
- **Exam Result**: Outcome of a completed exam. Has score, completion time, pass/fail status.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of exam sessions are isolated - no cross-user access possible (verified by security audit)
- **SC-002**: Users can start an exam and access their remote desktop within 60 seconds
- **SC-003**: Time enforcement is accurate to within 5 seconds of actual expiration
- **SC-004**: Payment completion to exam access takes less than 10 seconds
- **SC-005**: Session loading failures (stuck at 90%) reduced from current rate to less than 1%
- **SC-006**: System supports 50+ concurrent exam sessions without performance degradation
- **SC-007**: 90% of users rate the new UI as "good" or "excellent" in satisfaction surveys
- **SC-008**: Mobile/tablet users can complete all non-exam tasks (browsing, payment, results) successfully
- **SC-009**: Zero payment data breaches (PCI compliance maintained)
- **SC-010**: Average session cleanup time is under 30 seconds after session ends

## Assumptions

- Existing authentication system (sign-in/sign-up) will be preserved and used
- Current CKX/VNC technology stack will be retained for remote desktops
- Payment processing will use Stripe (industry standard, PCI compliant)
- Platform will be deployed on AWS infrastructure
- Users taking actual exams will use desktop browsers (tablet support for browsing only)
- Mock exams will have shorter duration (e.g., 30 minutes vs 2 hours) as the primary limitation
