<!--
  SYNC IMPACT REPORT
  ==================
  Version change: (new) → 1.0.0

  Modified principles: N/A (initial ratification)

  Added sections:
  - Core Principles (6 articles)
  - Technology Stack
  - Security & Performance
  - Governance

  Removed sections: N/A

  Templates requiring updates:
  - .specify/templates/plan-template.md ✅ (aligned - Constitution Check section exists)
  - .specify/templates/spec-template.md ✅ (no updates needed)
  - .specify/templates/tasks-template.md ✅ (aligned - security hardening phase exists)

  Follow-up TODOs: None
-->

# Sailor.sh Constitution

## Core Principles

### I. Preserve Existing Infrastructure

All new features MUST maintain compatibility with existing authentication and session systems.

- New code MUST integrate with the existing Signin/Signup authentication system
- Existing session management infrastructure MUST NOT be replaced or bypassed
- Database schema changes MUST be additive; existing tables MUST NOT be altered destructively
- All API contracts with existing frontend components MUST remain backward-compatible

**Rationale**: The authentication and session systems are battle-tested in production. Replacing
them introduces risk without corresponding value. Build upon what works.

### II. Multi-Session Isolation

Each user MUST have an independent, isolated CKX/VNC remote desktop session.

- One user session MUST equal one CKX container instance
- Sessions MUST NOT share containers, volumes, or network namespaces
- Users MUST NOT be able to access, view, or interfere with other users' sessions
- Session cleanup MUST be deterministic—no orphaned containers or zombie processes
- Session state MUST be tracked in PostgreSQL as the single source of truth

**Rationale**: Exam integrity requires absolute isolation. Any shared state creates attack
vectors for cheating, data leakage, or cross-user interference.

### III. Modern UI/UX

The user interface MUST be modern, sleek, and eye-catching while maintaining usability.

- Frontend MUST use React with TailwindCSS for consistent, responsive design
- UI components MUST be accessible (WCAG 2.1 AA compliance minimum)
- Visual feedback MUST be immediate—no infinite loading states without timeout/error handling
- Design MUST prioritize clarity over decoration; usability MUST NOT be sacrificed for aesthetics
- Mobile responsiveness MUST be considered for non-exam browsing (exam itself may require desktop)

**Rationale**: First impressions matter for conversion. A polished UI signals professionalism
and builds trust, but confused users abandon the product.

### IV. AWS Scalability

All new features MUST be compatible with AWS deployment and horizontal scaling.

- Services MUST be stateless where possible; state MUST be externalized to PostgreSQL or Redis
- Container orchestration MUST support scaling CKX instances dynamically based on demand
- No local file storage for user data—MUST use S3 or equivalent object storage
- Database connections MUST use connection pooling to handle concurrent load
- Infrastructure MUST support auto-scaling policies without code changes

**Rationale**: Exam demand is spiky (certification release dates, end-of-month deadlines).
The system must scale elastically without manual intervention.

### V. Non-Breaking Changes

All new features MUST NOT introduce breaking changes to the existing exam flow.

- Existing exam creation, taking, and evaluation workflows MUST remain functional
- API versioning MUST be used if breaking changes are unavoidable
- Database migrations MUST be reversible (up and down migrations required)
- Feature flags MUST be used for gradual rollout of significant changes
- Rollback procedures MUST be documented before deployment

**Rationale**: Users depend on the platform for certification preparation. Broken exam flows
mean lost trust, refund requests, and reputation damage.

### VI. Security & Payment Compliance

All security-sensitive operations MUST follow industry best practices.

- Remote desktop sessions MUST be encrypted in transit (TLS/WSS)
- Session tokens MUST expire and MUST NOT be reusable across sessions
- Time-limited exams MUST enforce limits server-side; client-side timers are display-only
- All payment transactions MUST use Stripe with proper webhook verification
- PCI compliance requirements MUST be followed—no raw card data handling
- All security events MUST be logged with sufficient detail for audit

**Rationale**: Security breaches destroy businesses. Payment compliance is legally required.
There are no shortcuts.

## Technology Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Backend | Node.js + Express | Existing infrastructure |
| Frontend | React + TailwindCSS | Modern UI requirement |
| Remote Desktop | CKX (VNC) | Kubernetes hands-on environment |
| Database | PostgreSQL | Session state source of truth |
| Payments | Stripe | PCI-compliant payment processing |
| Deployment | AWS | Scalable cloud infrastructure |
| Authentication | Existing system | Signin/Signup preserved |

## Security & Performance

### Security Requirements

- All API endpoints MUST require authentication except public landing pages
- Session isolation MUST be verified with integration tests
- Rate limiting MUST be implemented on authentication and payment endpoints
- CORS MUST be configured to allow only trusted origins
- SQL injection and XSS protections MUST be active on all inputs

### Performance Requirements

- Exam session creation MUST complete in under 60 seconds
- VNC connection establishment MUST complete in under 10 seconds after session ready
- API response times MUST be under 200ms p95 for non-streaming endpoints
- System MUST support 50+ concurrent exam sessions without degradation

## Governance

This constitution supersedes all other development practices for the Sailor.sh project.

**Amendment Process**:
1. Propose amendment with written rationale
2. Document impact on existing features and infrastructure
3. Provide migration plan if breaking changes involved
4. Obtain maintainer approval
5. Update constitution version following semantic versioning

**Versioning Policy**:
- MAJOR: Backward-incompatible principle removal or fundamental architectural change
- MINOR: New principle added or existing principle materially expanded
- PATCH: Clarifications, wording improvements, non-semantic refinements

**Compliance Review**:
- Every feature plan MUST include Constitution Check section
- PRs MUST reference relevant principles when introducing new patterns
- Security-sensitive changes MUST have explicit security review

**Version**: 1.0.0 | **Ratified**: 2026-02-07 | **Last Amended**: 2026-02-07