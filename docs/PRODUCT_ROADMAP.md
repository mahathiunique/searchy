# SEARCHY — Product Roadmap

| Field | Value |
| --- | --- |
| Version | 1.0.0 |
| Status | Proposed sequencing; dates depend on approval and discovery |
| Companion | [PRD](./PRD.md), [MVP and future scope](./MVP_VS_FUTURE.md) |

This roadmap is capability- and outcome-based rather than date-committed. Each phase should be validated with recruitment agencies before expanding scope. No phase assumes access to Naukri or any other recruitment platform.

## Phase 0 — Discovery and product decisions

**Outcome:** establish a launchable workflow, legal/data policy, and pilot baseline.

- Interview recruiters, managers, and workspace administrators.
- Confirm MVP customer profile, team size, operating workflow, terminology, and approval process.
- Decide candidate visibility/claim scope, consent/provenance, data retention, and deletion policy.
- Validate spreadsheet formats and synthetic resume/JD examples.
- Approve usability, accessibility, service, and privacy/security acceptance targets.

**Exit criteria:** approved product decisions list; prioritized MVP backlog; pilot success measures; synthetic test corpus; architecture/security review plan.

## Phase 1 — Secure operational foundation

**Outcome:** teams can safely operate in separate workspaces.

- Authentication, workspace membership, role-based access, tenant boundaries, admin invite/deactivate.
- Core candidate and REC data model, audit trail, search and filtering.
- Manual REC/candidate entry, spreadsheet preview/import/export.
- Basic dashboards and in-app task/notification center.
- Deployment, logging/metrics, backups, restore validation, security tests.

**Exit criteria:** critical cross-tenant isolation tests pass; create/assign/close REC and candidate lifecycle work end-to-end; data recovery verified; usability test shows recruiters can complete core forms.

## Phase 2 — MVP recruitment workflow

**Outcome:** one REC can move through candidate submission, interview, and follow-up without spreadsheets as the system of record.

- Resume upload, asynchronous parse and human correction; manual fallback.
- JD extraction with review and editing.
- Explainable criteria-based matching; atomic claim and duplicate warning.
- Submission review, duplicate submission prevention, status history.
- Interview scheduling records, structured technical evaluation, follow-up queue.
- Editable template-based email drafts (copy/export only).
- Manager team view, conversion/workflow analytics, collaboration/handoff.

**Exit criteria:** pilot users complete agreed workflows; no unresolved critical data integrity/security defects; parser failure and concurrent-claim behavior verified; matching usefulness and correction rate reviewed with users.

## Phase 3 — Pilot hardening and commercial readiness

**Outcome:** reliable, supportable multi-tenant product ready for a broader paid pilot.

- Tune search, performance, quotas, worker concurrency, and operational alerts from actual pilot load.
- Complete accessibility review, security assessment, incident and support procedures.
- Improve data export/deletion and audit controls based on approved policy.
- Improve parser/matcher adapters and quality monitoring without introducing a mandatory paid dependency.
- Define onboarding, workspace usage, customer success, and packaging requirements.

**Exit criteria:** approved NFR targets met in load/restore tests; privacy/legal review complete for launch jurisdictions; support and recovery drills completed; packaging decisions approved.

## Phase 4 — Extensible enterprise capabilities (future)

**Outcome:** expand customer reach and reduce manual handoffs only where authorized and demanded.

Candidate capabilities, subject to customer approval and compliance/security review:

- Optional authorized email/calendar integrations.
- Optional authorized recruitment-source connectors (no connector is implied or promised).
- Enterprise SSO, advanced security policy, delegated administration, and configurable approval chains.
- Advanced semantic/vector matching, multilingual extraction, model evaluation and customer-controlled provider choices.
- Advanced analytics, configurable reporting, benchmark cohorts only with privacy-safe aggregation.
- Customer-specific fields, workflow automation, API/webhooks, and data import migration tooling.
- Billing, plan/seat/storage management, and self-service onboarding.

**Exit criteria:** each connector has explicit authorization, vendor/contract review, least-privilege scopes, data-flow documentation, revocation behavior, and a non-integrated fallback.

## Sequencing constraints

1. Build tenant authorization and data model before broad feature work.
2. Build candidate/REC status history before analytics.
3. Build ownership integrity before match-result claiming and submission.
4. Build async job observability before bulk parsing/import.
5. Establish privacy and data retention decisions before any production candidate data.
6. Treat dates, staffing estimates, pricing, and integrations as unapproved until separately agreed.

---

*End of SEARCHY Product Roadmap.*
