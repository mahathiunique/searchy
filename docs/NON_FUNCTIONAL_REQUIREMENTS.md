# SEARCHY — Non-Functional Requirements

| Field | Value |
| --- | --- |
| Version | 1.0.0 |
| Status | Proposed targets; validate and approve before production commitments |
| Companion | [PRD](./PRD.md), [Functional requirements](./FUNCTIONAL_REQUIREMENTS.md) |

These requirements are measurable acceptance criteria. The initial values below are proposed targets for a small-to-mid-sized agency pilot, not existing service guarantees. Capacity and compliance assumptions must be validated before launch.

## 1. Usability and accessibility

| ID | Requirement |
| --- | --- |
| NFR-US-01 | A first-time recruiter should be able to create a candidate profile and associate it with an assigned REC using guided UI without training or technical setup. Validate with moderated usability testing. |
| NFR-US-02 | Primary workflows must work using keyboard navigation and expose labels, focus, errors, and status to assistive technology; target WCAG 2.2 AA for supported screens. |
| NFR-US-03 | Use plain-language validation and recovery guidance. Error messages must identify the affected action and safe next step without exposing internal stack traces or unauthorized data. |
| NFR-US-04 | Show consistent REC, candidate, submission, interview, and follow-up statuses; provide search, filter, pagination, and meaningful empty/loading/error states. |

## 2. Performance and capacity

| ID | Proposed acceptance target |
| --- | --- |
| NFR-PF-01 | For a pilot dataset and expected load, 95th-percentile response for ordinary reads and writes is ≤ 2 seconds, excluding large exports and asynchronous parsing. |
| NFR-PF-02 | Candidate search and REC list filtering return first page within 2 seconds at p95 for a workspace with 100,000 candidate profiles, subject to load-test validation. |
| NFR-PF-03 | Resume parsing, spreadsheet import, and large exports run asynchronously; UI acknowledges accepted jobs within 2 seconds and shows progress/failure state. |
| NFR-PF-04 | Define per-workspace and per-user upload, query, and request limits. Rate-limit abuse without blocking ordinary recruiter workflows. |
| NFR-PF-05 | Support cursor or bounded pagination; no unbounded candidate, audit, or analytics result scans in interactive requests. |

## 3. Availability, durability, and recovery

| ID | Proposed requirement |
| --- | --- |
| NFR-AV-01 | Pilot availability target: 99.5% monthly, excluding announced maintenance, measured at externally observable application endpoints. Final target requires approval. |
| NFR-AV-02 | Database and object storage backups are automated, encrypted, access-controlled, and restoration-tested at least quarterly before production launch. |
| NFR-AV-03 | Initial proposed recovery objectives: RPO ≤ 24 hours and RTO ≤ 8 hours. Validate with business owners and hosting design. |
| NFR-AV-04 | Background jobs are idempotent or deduplicated, have bounded retries/backoff, and expose terminal failures. Exhausted retries never silently discard the original input. |
| NFR-AV-05 | State-changing APIs use transactions and constraints so retries and concurrent requests cannot create duplicate claims/submissions or partial transitions. |

## 4. Security and privacy

| ID | Requirement |
| --- | --- |
| NFR-SE-01 | Enforce authentication and deny-by-default role authorization at service boundaries and tenant-scoped database access. Every tenant-owned query/write includes authenticated workspace scope. |
| NFR-SE-02 | Automated tests must demonstrate that users cannot access another workspace's candidates, resumes, requirements, submissions, exports, or identifiers through list, detail, search, download, or mutation endpoints. |
| NFR-SE-03 | Use TLS for network traffic and encryption at rest for database, backups, and resume object storage using managed secret/key services where available. |
| NFR-SE-04 | Passwords, tokens, API credentials, and model/provider secrets are never logged or stored in source control; use established hashing and secret-management mechanisms. |
| NFR-SE-05 | Apply CSRF/XSS/SQL-injection protections appropriate to the chosen stack; parameterize SQL; validate and encode untrusted text; rate-limit authentication and sensitive endpoints. |
| NFR-SE-06 | File upload checks include extension and content validation, size limits, safe generated object keys, malware scanning where available, private storage, and authorization on every download. Do not execute or serve uploaded files inline without safe handling. |
| NFR-SE-07 | Audit role changes, exports, support access, candidate ownership changes, submission decisions, and other sensitive actions. Audit records are access-controlled and tamper-resistant; do not duplicate resume contents into logs. |
| NFR-SE-08 | Provide configurable retention/deletion and data-export controls. Production retention, consent, data residency, and legal basis must be reviewed for each launch jurisdiction. |
| NFR-SE-09 | Use synthetic candidate data in development, automated tests, and public demos. Do not copy production candidate data into non-production environments. |
| NFR-SE-10 | Dependency and secret scanning, security-focused code review, and backup restore checks are release gates; establish a vulnerability response process before handling real candidate information. |

## 5. AI quality, transparency, and safety

| ID | Requirement |
| --- | --- |
| NFR-AI-01 | A candidate-facing or hiring decision is never made solely by AI. A human must review extracted fields and matching evidence. |
| NFR-AI-02 | Every matching result identifies algorithm/version and shows criterion-level matched, missing, and unknown evidence; identical inputs and version yield reproducible results for deterministic MVP scoring. |
| NFR-AI-03 | Missing information is marked unknown, not treated as a negative or positive. Confidence is not represented as a probability unless calibrated and validated as such. |
| NFR-AI-04 | Do not use protected characteristics or intentionally derived proxies in matching. Provide documentation of criteria and known limitations; test representative synthetic cases for unexpected ranking behavior. |
| NFR-AI-05 | Core parsing/matching workflows have a manual or non-paid-provider path. Optional external processing requires explicit architecture, privacy, retention, and customer approval. |
| NFR-AI-06 | Track parse correction rate and match usefulness feedback by field/model version; define acceptance thresholds from pilot evidence before claiming accuracy. |

## 6. Scalability and resource management

| ID | Requirement |
| --- | --- |
| NFR-SC-01 | Tenant scale must not require changing product semantics; scale web/API workers, parsing workers, and storage independently where practical. |
| NFR-SC-02 | Bound per-workspace storage, upload size, queued work, and compute concurrency through configurable quotas and backpressure. |
| NFR-SC-03 | Use appropriate database indexes for workspace-scoped search, candidate duplicate keys, REC status/assignee, due tasks, and submission uniqueness; inspect query plans for critical queries. |
| NFR-SC-04 | Avoid synchronous parsing or model calls in user-facing transactions. Keep the upload/request response independent of slow third-party or worker execution. |

## 7. Maintainability and portability

| ID | Requirement |
| --- | --- |
| NFR-MA-01 | Separate core domain logic from storage, parsing, matching, notification, and optional AI providers behind tested interfaces. |
| NFR-MA-02 | Database schema changes are versioned, repeatable, and have a rollback/recovery strategy; destructive migrations require explicit review. |
| NFR-MA-03 | CI runs formatting/linting, type/static checks where applicable, unit/integration tests, and tenant-isolation tests. |
| NFR-MA-04 | Document API contracts, state transitions, scoring definitions, data retention behavior, and operational procedures alongside relevant changes. |
| NFR-MA-05 | Avoid a mandatory paid provider for product-critical functionality; use open formats and export paths to reduce customer lock-in. |

## 8. Observability and operations

| ID | Requirement |
| --- | --- |
| NFR-OP-01 | Emit structured logs, metrics, and traces with request/job correlation IDs; redact credentials, resume contents, and unnecessary personal data. |
| NFR-OP-02 | Monitor request latency/error rate, queue age/failure, storage use, DB saturation, authentication failures, and backup status; alert thresholds are configurable. |
| NFR-OP-03 | Provide health/readiness endpoints and safe operational runbooks for queue retries, restore, incident response, and tenant suspension. |
| NFR-OP-04 | Admin-visible job status identifies accepted, processing, completed, partial, and failed states with retry/manual action where safe. |

## 9. Compatibility and data portability

| ID | Requirement |
| --- | --- |
| NFR-CO-01 | Support current stable versions of major evergreen desktop browsers; publish exact tested browser matrix at implementation time. |
| NFR-CO-02 | Spreadsheet imports provide preview, field mapping, per-row validation, and error report. Exports are bounded, authorized, and auditable. |
| NFR-CO-03 | Provide a documented workspace data export format and preserve stable IDs and timestamps; do not promise format or schema until tested. |

## 10. Release gates and decisions

Before production use with real candidate data, approve: availability/performance capacity, RPO/RTO, file limits, retention/deletion policy, audit retention, supported jurisdictions, external AI processing policy, accessibility test plan, incident response, and support-access policy. Proposed numerical thresholds above are planning baselines, not compliance certification or contractual commitments.

---

*End of SEARCHY Non-Functional Requirements.*
