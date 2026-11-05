# SEARCHY — MVP Features vs Future Features

| Field | Value |
| --- | --- |
| Version | 1.0.0 |
| Status | Proposed scope for approval |

## MVP

| Capability | MVP inclusion | Boundary |
| --- | --- | --- |
| Multi-company workspaces | Yes | Workspace membership, four roles, tenant isolation, platform lifecycle operations; not self-service billing/plan management. |
| Requirement management | Yes | Manual entry, assignment, lifecycle, history, spreadsheet preview/import/export. No mailbox ingestion. |
| JD intelligence | Yes | Extract structured fields, show evidence/unknowns, require review; manual fallback and no paid provider requirement. |
| Candidate database | Yes | Workspace-scoped profile/search, source/provenance, ownership, archive, duplicate warning. |
| Resume upload/parsing | Yes | Single-file upload with async parse and manual correction. Synthetic data in dev/demo. |
| Candidate matching | Yes | Explainable, criteria-based ranking; no automatic reject, hiring, or outreach. |
| Ownership/duplicate prevention | Yes | Atomic claim per candidate+REC, duplicate warning, manager handoff/merge with history. |
| CV submissions | Yes | Submission queue, manager review, duplicate prevention, status and decision history. |
| Interview scheduling | Yes | Internal schedule records, timezone, reschedule history, no external calendar invite. |
| Follow-ups | Yes | Owner, due date, status, in-app reminder/task list, reassignment queue. |
| Email drafts | Yes | Editable template/context draft, copy/export only; no send integration. |
| Analytics | Yes | Personal/team pipeline and task metrics with documented definitions. |
| Technical evaluation | Yes | Basic job-related rubric/scorecard, versioned feedback, human review. |
| Collaboration | Yes | Explicit access sharing, internal notes, manager handoff/reassignment and history. |
| Security/operations | Yes | Workspace authorization, audit trail, upload controls, backups, observability, synthetic development fixtures. |

## Future / approval-dependent

| Capability | Why deferred / condition |
| --- | --- |
| Recruitment platform connectors, including Naukri | No connector is assumed. Requires explicit authorization, supported API/vendor approval, customer demand, scope and data-flow review. |
| Mailbox sending/sync and email tracking | Requires provider selection, OAuth/scopes, privacy review, and explicit permission. |
| Calendar synchronization and external invitations | Requires provider selection and conflict/notification behavior; MVP schedules internal records only. |
| Bulk resume upload and advanced parsing | Add after single-upload reliability, queue monitoring, and per-file error recovery are validated. |
| Mandatory commercial LLM, parsing, vector, or enrichment API | Excluded. Optional providers may be evaluated only with a no-paid baseline and privacy review. |
| Advanced semantic/vector/multilingual matching | Requires quality/bias evaluation, explainability, user validation, and deployment economics. |
| Automated outreach, candidate rejection, or hiring decisions | Not planned without separate product, legal, ethical, and customer approval; human control remains required. |
| Custom workflow builder and complex approval chains | Start with defined REC/submission workflows; expand based on observed variation. |
| Enterprise SSO, SCIM, advanced audit retention | Requires validated enterprise demand and security/compliance review. |
| Billing, subscription tiers, self-service provisioning | Commercial model and packaging are undecided; do not block pilot operations. |
| Advanced reporting, performance comparisons, cross-customer benchmarks | Need stable definitions and safeguards against misleading or privacy-invasive comparisons. |
| Customer APIs, webhooks, and migration toolkit | Prioritize after core data model and partner/customer use cases are validated. |

## MVP release checklist

- [ ] Stakeholders approve customer, candidate visibility/claim, privacy/retention, approval, and reliability decisions in [PRD.md](./PRD.md).
- [ ] Roles and access checks match [USER_ROLES.md](./USER_ROLES.md).
- [ ] Functional acceptance criteria are tested for all MVP modules in [FUNCTIONAL_REQUIREMENTS.md](./FUNCTIONAL_REQUIREMENTS.md).
- [ ] Proposed production targets and security release gates are approved in [NON_FUNCTIONAL_REQUIREMENTS.md](./NON_FUNCTIONAL_REQUIREMENTS.md).
- [ ] No mandatory dependency on an external recruitment platform or paid API.
- [ ] Synthetic candidate data is used for development and demos.

---

*End of SEARCHY MVP vs Future Features.*
