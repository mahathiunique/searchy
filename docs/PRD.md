# SEARCHY — Product Requirements Document

| Field | Value |
| --- | --- |
| Product | SEARCHY — AI-Powered Recruitment Operations & Talent Intelligence Platform |
| Version | 1.0.0 |
| Status | Product proposal for stakeholder review |
| Initial customer | Recruitment consultancies and staffing agencies |
| Related documents | [User roles](./USER_ROLES.md), [Functional requirements](./FUNCTIONAL_REQUIREMENTS.md), [Non-functional requirements](./NON_FUNCTIONAL_REQUIREMENTS.md), [Roadmap](./PRODUCT_ROADMAP.md), [MVP and future scope](./MVP_VS_FUTURE.md), [System design](./SYSTEM_DESIGN.md), [Database design](./DATABASE_DESIGN.md), [API contracts](./API_CONTRACTS.md), [Security design](./SECURITY_DESIGN.md) |

## 1. Executive summary

SEARCHY is a multi-company workspace for recruitment teams to move a requirement from intake through candidate sourcing, submission, interview, and follow-up. It replaces disconnected spreadsheets and manual tracking with a shared, auditable workflow. Resume parsing and candidate-to-requirement matching assist human decisions; they do not make hiring decisions or automatically reject candidates.

The first release focuses on an approachable recruiter workflow, strong tenant separation, reliable ownership and duplicate controls, and measurable pipeline visibility. Requirements can be entered manually or imported from a spreadsheet. Resumes use synthetic candidate data in development. No recruitment-platform integration is assumed, and no paid API is a mandatory dependency. Email generation produces editable drafts; it does not send email in MVP.

## 2. Problem and opportunity

Consultancy recruiters receive requirements through email and spreadsheets, read JDs manually, search authorized sources, collect resumes, compare candidates, track ownership, submit CVs, coordinate interviews, and chase feedback in separate tools. This creates repeated work, duplicate sourcing, inconsistent handoffs, missed follow-ups, and limited visibility into pipeline health.

SEARCHY provides a single source of operational truth while preserving team ownership and human review. It does not automate or replace access to external sourcing platforms.

## 3. Product vision and objectives

### Vision

Make recruitment operations easy to learn, hard to lose track of, and explainable enough for teams to trust.

### Objectives

1. Manage requirements and extract structured JD criteria.
2. Keep candidate profiles and resume history searchable and deduplicated.
3. Assist candidate matching with explainable evidence and human control.
4. Prevent conflicting candidate ownership and duplicate submissions.
5. Coordinate submissions, interviews, evaluations, follow-ups, and editable email drafts.
6. Give recruiters and managers useful personal/team pipeline analytics.
7. Provide isolated, configurable SaaS workspaces with clear administration and auditability.
8. Demonstrate core engineering through transactional data integrity, search/indexing, background processing, explainable ranking, observability, and security controls.

## 4. Users and primary jobs

| User | Job to be done |
| --- | --- |
| Recruiter | Find a suitable candidate for an assigned REC, keep ownership clear, submit once, and know the next action. |
| Recruitment Manager | Allocate work, resolve conflicts, review submissions, and understand team bottlenecks. |
| Workspace Administrator | Onboard staff and safely configure the organization's tenant. |
| Platform Super Administrator | Operate tenant lifecycle and platform health without routine access to customer candidate content. |

See [USER_ROLES.md](./USER_ROLES.md) for role scope and permissions.

## 5. Product principles

- **Simple by default:** plain language, guided forms, clear statuses, useful empty states, and no reliance on command-line or technical knowledge.
- **Human accountable:** AI extracts and recommends; a person reviews, edits, and decides.
- **Tenant-safe:** customer data is private to its workspace and all access follows the active role.
- **Explainable:** show why a candidate matched and which criteria are missing; never present a score as certainty.
- **Operationally reliable:** preserve history, prevent races with database constraints/transactions, and make failures visible and retryable.
- **Portable and commercially extensible:** isolate parsers, matchers, storage, notifications, and model providers behind replaceable interfaces. Keep a useful baseline that works without paid APIs.
- **Privacy-conscious:** collect only data required for recruitment, limit access, record provenance, and support retention/deletion policy.

## 6. Scope

### MVP

- Workspace-scoped membership and four role types; tenant-safe authorization.
- REC create/edit/assign/close and spreadsheet import/export.
- JD field extraction with review/edit before save.
- Candidate profiles, single resume upload, parsing with manual correction, duplicate warnings.
- Explainable candidate matching and exclusive candidate-to-REC claim.
- Submission workflow with duplicate submission prevention and manager review.
- Interview scheduling records, technical evaluation scorecards, follow-ups, and history.
- Template-based editable email draft generation without sending.
- Recruiter and manager operational dashboards.
- Collaboration and manager handoff.
- Audit events for sensitive operations; synthetic data for development and demos.

See [MVP_VS_FUTURE.md](./MVP_VS_FUTURE.md) for detailed boundaries and deferred features.

### Explicitly not assumed for MVP

- Integrations with Naukri or other sourcing/recruitment platforms.
- Mailbox, calendar, SMS, chat, or external CRM/ATS integration.
- Paid LLM, parsing, embedding, geocoding, or analytics APIs as a required dependency.
- Autonomous candidate ranking decisions, rejection, outreach, or hiring decisions.
- Production use of real candidate data in development/demo fixtures.
- Billing automation, complex plan enforcement, enterprise SSO, or customer self-service provisioning.

## 7. Primary user journeys

### Requirement to first shortlist

Manager creates/imports a REC → reviews extracted JD fields → assigns recruiter(s) → recruiter sees it in a simple work queue → searches or uploads candidates → reviews duplicate warnings → runs matching → inspects evidence → claims a candidate atomically → submits a candidate once.

### Submission to interview outcome

Manager reviews the submission and approves, rejects, or returns it with a reason → recruiter and manager see the updated status → interview is scheduled/rescheduled as a workspace record → interviewer submits a structured scorecard → next follow-up is tracked → pipeline analytics update.

### Candidate conflict resolution

Recruiter sees limited duplicate/claim information → system preserves privacy and does not overwrite ownership → manager reviews ownership history and either reassigns/releases the claim or confirms a duplicate merge → all changes retain attribution.

### Workspace onboarding and departure

Workspace admin invites staff and assigns roles → members work only in the tenant → departing member is deactivated immediately → manager receives active-work reassignment queue → records and history remain intact.

## 8. Success measures

Instrument these measures before setting numerical targets. Baselines and targets require customer discovery and approval.

| Measure | Definition | Why it matters |
| --- | --- | --- |
| Time to first shortlist | REC assignment time to first manager-reviewable candidate submission | Measures reduction in manual coordination delay |
| Requirement coverage | Open RECs with an assigned owner and a recent next action | Detects neglected requirements |
| Duplicate submission rate | Blocked duplicate attempts / all submission attempts | Measures integrity and user friction |
| Ownership conflict rate | Conflicting claim attempts / claim attempts | Measures concurrency and sourcing overlap |
| Follow-up completion | Due follow-ups completed by due date / follow-ups due | Measures missed-chase reduction |
| Parsing correction rate | Parsed fields corrected during review, by field | Measures extraction quality without obscuring errors |
| Match usefulness | Recruiter feedback on shortlisted recommendations and reason codes | Evaluates assistive ranking quality |
| Workflow adoption | Active recruiting users completing an end-to-end REC workflow | Tests usability and product value |
| Tenant isolation tests | Cross-workspace unauthorized access attempts denied | Security release gate |

Metrics must be defined consistently, exclude test/synthetic workspaces when reporting customer performance, and avoid using raw scores to make employment decisions.

## 9. Product requirements by module

The detailed, testable module specifications—including purpose, users, actions, fields, outputs, validation, success/error states, dependencies, and business rules—are in [FUNCTIONAL_REQUIREMENTS.md](./FUNCTIONAL_REQUIREMENTS.md). The modules are:

1. Requirement management
2. Job description intelligence
3. Candidate database
4. Resume upload and parsing
5. AI-assisted candidate matching
6. Candidate ownership and duplicate prevention
7. CV submission management
8. Interview scheduling
9. Follow-up management
10. Email draft generation
11. Recruitment analytics
12. Technical interview evaluation
13. Multi-recruiter collaboration
14. Multi-company workspaces and administration

## 10. Technical product expectations

These are capabilities the product must embody, not decorative educational content:

| Engineering area | Product implementation |
| --- | --- |
| Computer networks | Secure transport, bounded upload handling, request timeouts, rate limits, retry-safe APIs, correlation IDs, and observable queue/service boundaries. |
| Operating systems | Resumable/retryable background parse/import jobs, bounded worker concurrency, cancellation/timeout behavior, and cleanup of temporary files. |
| DBMS / SQL | Normalized tenant-scoped records, foreign keys, useful indexes, constraints for unique submissions and active claims, transactions for state changes, and query/pagination limits. |
| Data structures and algorithms | Indexed candidate filtering, normalized exact-match duplicate lookup, and ranking that combines explicit REC criteria with a documented, bounded scoring algorithm. |
| OOP / modular design | Separate domain services and replaceable parser, matcher, storage, and notification adapters with clear interfaces. |
| System design | Tenant isolation, API/service/database boundaries, background queues, object storage abstraction, observability, and horizontal scaling paths. |
| Cybersecurity | Least privilege, workspace authorization, secure session management, safe file handling, audit events, encryption, and privacy-aware data retention. |
| Cloud computing | Environment-separated deployment, managed-secret handling, configurable object storage/database/queue, automated backup and restoration plan; avoid tying the domain model to one provider. |
| Applied AI / ML | Structured JD/resume extraction and assisted matching with provenance, confidence/criteria evidence, human confirmation, bias-aware limitations, and a no-paid-service baseline. |

Implementation choices and measurable service targets are captured in [NON_FUNCTIONAL_REQUIREMENTS.md](./NON_FUNCTIONAL_REQUIREMENTS.md).

## 11. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Incorrect extracted resume/JD data | Require review and editing; show extraction status and confidence/evidence; support manual entry. |
| Matching creates false confidence or bias | Show criterion-level evidence, document limitations, keep decisions human-led, monitor outcomes, and avoid sensitive/protected attributes in scoring. |
| Candidate PII exposure | Tenant isolation, scoped visibility, secure file access, audit sensitive events, retention controls, synthetic development data. |
| Ownership lock becomes stale | Show owner/status and give managers explicit release/reassignment; do not silently expire ownership. |
| Integration assumptions block launch | MVP works with manual entry/import and editable drafts; connectors remain optional future adapters. |
| Parsing/model provider unavailable | Queue retries with limits, expose actionable failure, preserve original input, allow manual processing. |
| Spreadsheet import damages records | Preview, field mapping, row-level errors, explicit commit, idempotency where possible, and downloadable error report. |

## 12. Assumptions and open decisions

### Working assumptions for this draft

- MVP is a browser-based SaaS focused first on one workspace per customer organization.
- A REC is a recruitment requirement/job opening.
- Spreadsheet import/export is the initial bridge to existing Excel workflows.
- No external platform or paid API is necessary for core workflows.
- Workspace managers make day-to-day approval and ownership decisions.
- Synthetic data is used for all development and public demos.

### Decisions requiring stakeholder approval

1. **MVP customer and rollout:** target agency size, pilot count, and whether initial onboarding is invite-only.
2. **Candidate visibility and ownership:** whether recruiters may search only owned/shared full profiles or all workspace profiles; define whether claims are exclusive per REC or across the whole workspace. Draft assumes exclusive per candidate+REC with limited duplicate lookup.
3. **Candidate data policy:** consent/provenance fields, retention duration, deletion/anonymization rules, and jurisdiction-specific compliance obligations.
4. **Resume parsing and matching baseline:** acceptable local/open-source approach, quality thresholds, languages/file formats, and whether AI processing may use an optional external provider later.
5. **Submission approval policy:** whether manager approval is mandatory, configurable, or bypassable; handling of sole-manager/self-submission cases.
6. **Commercial model:** free/pilot versus paid tiers, seat/storage limits, and whether billing is in MVP (currently deferred).
7. **Reliability targets:** approve availability, performance, RPO/RTO, file-size limits, retention, and audit retention targets in the NFR.
8. **Email and calendar scope:** when to consider authorized mailbox/calendar integrations; MVP only creates editable drafts and interview records.
9. **Super-admin support access and destructive actions:** approval requirements, access windows, retention, and workspace purge policy.
10. **Analytics definitions:** agree on stage transitions and success metrics before customer-facing performance comparisons.

---

*End of SEARCHY Product Requirements Document.*
