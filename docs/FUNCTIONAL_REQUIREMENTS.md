# SEARCHY — Functional Requirements

| Field | Value |
| --- | --- |
| Version | 1.0.0 |
| Status | Product proposal; MVP requirements unless marked Future |
| Companion | [PRD](./PRD.md), [User roles](./USER_ROLES.md) |

## 1. Conventions

- **REC** means a recruitment requirement/job opening.
- “Must” is release-blocking for the stated scope. “Should” is expected unless explicitly deferred.
- All records and files are workspace-scoped. The service derives the active workspace and actor from the authenticated membership, not untrusted client-supplied ownership fields.
- All success and failure states must be visible in the interface. Errors must not appear as successful saves.
- Extracted and matched information is assistive; users review and make recruitment decisions.
- Field limits, supported formats, and retention values that need customer policy are configurable and must be approved before production.

## 2. Requirements by module

### FR-01 — Requirement management

| Attribute | Requirement |
| --- | --- |
| Purpose | Capture, assign, track, and close customer hiring needs. |
| Target users | Manager creates/assigns/updates; Recruiter views assigned REC and advances candidates; Admin configures defaults. |
| User actions | Create, save draft, publish, edit/version, assign/unassign, filter/search, import from spreadsheet with preview, export permitted records, pause/close/reopen. |
| Inputs | REC title; client/account label; source/reference; job description; location(s); employment type; min/max experience; required/preferred skills; openings; optional compensation range/currency; priority; target date; status; assigned recruiters; notes. |
| Output | REC detail and work queue, assignment notifications in-app, history, and structured fields for matching/analytics. |
| Validation | Title and description required to publish; min experience ≤ max; openings positive integer; target date valid; assigned members active in same workspace; ranges have valid currency/ordering. Spreadsheet import previews mappings and row errors before commit. |
| Success/error states | Draft saved/published with confirmation and timestamp. Invalid rows/fields identify the specific correction. Concurrent edit returns a conflict and preserves both the latest record and user's unsaved input for review. |
| Dependencies | Workspace membership; JD intelligence; candidate matching; submissions; notifications; analytics; audit. |
| Business rules / edge cases | Closing requires a reason and a review of active claims, drafts, submissions, interviews, and follow-ups. Closure blocks new claims/submissions but preserves active history. Reopen restores work using existing history. Changes to required skills, location, or deadline create a version and flag existing matches as potentially stale. |

### FR-02 — Job description intelligence

| Attribute | Requirement |
| --- | --- |
| Purpose | Turn free-text JDs into reviewable structured criteria. |
| Target users | Managers and authorized recruiters. |
| User actions | Paste JD or use JD text from REC; request extraction; review, edit, accept, or rerun extraction. |
| Inputs | JD text and optional role/title context; output fields include skills, seniority/experience, location, employment type, education/certification where explicitly stated, and required/preferred distinction. |
| Output | Extracted field values with source snippets or evidence, confidence/unknown markers, extraction version, and status. |
| Validation | Do not infer missing values as facts. Required input must contain readable text; sanitize markup and enforce size limits. User edits are validated against REC field rules. |
| Success/error states | Show extracted draft for human approval. Empty/ambiguous extraction is a partial result with “not identified” fields. Provider/model failure is an explicit retryable error with original JD preserved; users can continue manually. |
| Dependencies | REC management; replaceable extraction adapter; audit; matching. |
| Business rules / edge cases | Extraction never overwrites previously approved fields without confirmation. No protected/sensitive trait should be extracted or used for candidate ranking. MVP supports a no-paid-API baseline; external model use, if later approved, must be optional and privacy-reviewed. |

### FR-03 — Candidate database

| Attribute | Requirement |
| --- | --- |
| Purpose | Maintain a searchable, workspace-private source of candidate profiles and activity. |
| Target users | Recruiter creates/updates own profiles; Manager searches/reviews workspace profiles; Admin has only need-based access. |
| User actions | Create, view authorized profile, edit, search/filter, attach resume, archive, review history, request manager help for a duplicate. |
| Inputs | Name; normalized email/phone where available; current/desired role; skills; experience; locations; work history; education/certifications when supplied; source/provenance; consent/contact permission status and date where applicable; owner; notes; resume references. |
| Output | Candidate profile, searchable filters, source/history, duplicate signal, and authorized resume download. |
| Validation | Validate email and phone format without requiring either when absent; normalize values for comparison; constrain text sizes; reject unsupported files at upload boundary. Required fields and consent language are subject to approved policy. |
| Success/error states | Saved profile shows owner/source and next action. Duplicate warning gives permitted options without disclosing inaccessible fields. Save failure preserves entered fields; unauthorized or cross-tenant access returns a non-disclosing denial. |
| Dependencies | Workspace/roles; resume parsing; ownership; submissions; collaboration; audit; retention. |
| Business rules / edge cases | Candidate records are not deleted just because a recruiter leaves. Archive is reversible and does not erase linked submissions or interview history. Exact duplicate candidates are reviewed; merge is manager-controlled, preserves aliases/source/activity, and is reversible only through a documented recovery process. |

### FR-04 — Resume upload and parsing

| Attribute | Requirement |
| --- | --- |
| Purpose | Attach resumes and reduce manual profile entry. |
| Target users | Recruiter, Manager; Admin only for support/configuration. |
| User actions | Upload one resume, view processing status, review extracted fields, edit and confirm, retry failed parsing, or save profile manually. |
| Inputs | PDF/DOCX file; associated candidate or create-new flow; source/provenance and permission status as required by policy. MVP file-size and format limits are deployment-configured. |
| Output | Private stored original, parse job status, extracted draft fields, parser version, and clear manual correction path. |
| Validation | Verify extension and actual file type, size, non-empty content, and malware/suspicious content policy; use generated storage keys; restrict downloads to authorized users; never execute uploaded content. |
| Success/error states | Queued → processing → review-ready → confirmed, or failed with reason and retry/manual option. A duplicate upload is detected by file fingerprint where feasible and linked/warned rather than silently creating another candidate. |
| Dependencies | Candidate database; object storage; background job queue; extraction adapter; workspace authorization; audit. |
| Business rules / edge cases | Parser failure does not lose the original file. Retries are bounded and idempotent. Batch parsing is future scope. Synthetic resumes only in development/demo environments. |

### FR-05 — AI-assisted candidate matching

| Attribute | Requirement |
| --- | --- |
| Purpose | Rank accessible candidates against an open REC and explain the comparison. |
| Target users | Recruiters and Managers. |
| User actions | Run/re-run matching; filter results; inspect matched, missing, and unknown criteria; provide usefulness feedback; open profile if authorized. |
| Inputs | Approved REC criteria and permitted candidate profile/resume fields. MVP scoring uses documented, configurable criterion weights and deterministic text/field comparison. |
| Output | Ordered candidate list, criterion-level evidence, score breakdown, missing/unknown information, algorithm version, and timestamp. |
| Validation | Only open/active RECs; only authorized candidate records; scores are bounded and repeatable for identical inputs/version. Unknown fields are not treated as a match. |
| Success/error states | Results show explanation and “assistive estimate” label. Empty results suggest relaxing criteria; unavailable index/matcher provides explicit retryable error. |
| Dependencies | REC/JD intelligence; candidate database; search/index; ownership; audit; analytics. |
| Business rules / edge cases | No automatic rejection, submission, outreach, or hiring decision. Do not rank using protected characteristics or proxy features intentionally designed to reproduce them. Material REC/profile updates mark prior results stale. Paid model/API is not mandatory; advanced semantic/vector ranking is future scope. |

### FR-06 — Candidate ownership and duplicate prevention

| Attribute | Requirement |
| --- | --- |
| Purpose | Prevent conflicting sourcing work and duplicate records/submissions while preserving privacy. |
| Target users | Recruiters claim/release their work; Managers resolve conflicts and duplicates. |
| User actions | See limited duplicate/claim warning; claim or release candidate for REC; request manager reassignment; manager reviews ownership history, reassigns, resolves duplicate alert, or merges confirmed duplicate. |
| Inputs | Candidate ID, REC ID, requested owner; normalized contact fields and candidate identifiers for duplicate detection; manager reason for override/merge. |
| Output | Claim state/owner, conflict response, duplicate warning, ownership history, and audit event. |
| Validation | Candidate and REC must be in same workspace; REC open; actor has access; claim is unique for the configured ownership scope. Contact matching is normalized and workspace-scoped. |
| Success/error states | Successful claim is confirmed. Concurrent loser gets a conflict message and next step. Duplicate warning supports review; service errors never report a claim as successful. |
| Dependencies | Candidate DB; requirements; DB transaction/unique constraint; roles; audit. |
| Business rules / edge cases | MVP claim exclusivity is per candidate+REC (confirm in PRD). Claim changes use an atomic transaction/constraint, not a UI-only check. Claims do not silently expire. Manager override requires reason. Exact email/phone match is strong duplicate evidence; name similarity is a warning only. |

### FR-07 — CV submission management

| Attribute | Requirement |
| --- | --- |
| Purpose | Track candidate presentation to an internal reviewer/client and prevent duplicate submissions. |
| Target users | Recruiter submits; Manager reviews; Admin only for permitted administration. |
| User actions | Create submission, attach/select approved resume version, add concise notes, submit for review, approve/reject/return with reason, mark sent to client, withdraw, view timeline. |
| Inputs | Candidate, REC, resume snapshot/reference, submission notes, reviewer, status, decision reason, timestamps. |
| Output | Submission record, review queue, candidate/REC timeline, status notification, and metrics event. |
| Validation | Candidate/REC same workspace; REC open for new submissions; candidate claim/access valid; required resume/notes rules enforced; unique active submission per candidate+REC. |
| Success/error states | Confirmation includes status and reviewer. Duplicate is blocked with link to existing authorized submission. Rejection/return requires reason. Retry-safe submission request cannot create duplicates. |
| Dependencies | Candidate/REC/ownership; manager review; interviews; analytics; notifications; audit. |
| Business rules / edge cases | One candidate cannot be submitted twice to the same REC while an existing submission is active. A withdrawn/rejected candidate may be resubmitted only under approved policy; each attempt remains in history. Reviewer cannot approve their own submission. REC closure prevents new submission but not review of an existing one. |

### FR-08 — Interview scheduling

| Attribute | Requirement |
| --- | --- |
| Purpose | Track interview logistics and outcomes in one pipeline. |
| Target users | Recruiter and Manager; authorized interviewer may enter assigned feedback if role policy allows. |
| User actions | Schedule, update, reschedule, cancel, mark complete/no-show, view timeline/calendar list, record internal notes. |
| Inputs | Candidate/submission; interview type; start/end; time zone; location or meeting details; participants; status; notes and reschedule reason. |
| Output | Interview record, current schedule, revision history, in-app reminder tasks, and status updates. |
| Validation | Valid future start/end and duration; explicit timezone; participant fields as required; linked records in same workspace. |
| Success/error states | Confirmed schedule with timezone. Conflicting/stale update returns a conflict. Reschedule failure keeps old confirmed time. Cancel requires confirmation/reason according to policy. |
| Dependencies | Submission/candidate; follow-ups; evaluation; notifications; audit. |
| Business rules / edge cases | Rescheduling preserves prior schedule and actor; related reminders update or cancel; affected users are notified in-app. MVP does not send external calendar invitations or assume calendar integrations. |

### FR-09 — Follow-up management

| Attribute | Requirement |
| --- | --- |
| Purpose | Make the next action and due date visible so candidate and client follow-ups are not missed. |
| Target users | Recruiter owns personal actions; Manager sees team actions and escalations. |
| User actions | Create, edit, complete, snooze, cancel, filter by due date/status/priority, reassign with reason, view linked REC/candidate/submission/interview. |
| Inputs | Title/action; linked entity; owner; due date/timezone; priority; status; notes; completion outcome. |
| Output | Personal/team task queue, due/overdue indicators, in-app reminder, history, analytics event. |
| Validation | Due date and owner required; assignee active in workspace; linked entity authorized; snoozing requires a new future due date. |
| Success/error states | Saved task appears in queue with due state. Reminder delivery failure is surfaced/retryable and does not falsely mark task complete. |
| Dependencies | Workspace users; candidate/REC/submission/interview; in-app notifications; audit; analytics. |
| Business rules / edge cases | Completion records actor/time. Rescheduled interview updates its associated reminder. Deactivated assignee's active tasks appear in manager reassignment queue; no silent reassignment. External email/SMS reminders are future scope. |

### FR-10 — Email draft generation

| Attribute | Requirement |
| --- | --- |
| Purpose | Help recruiters quickly prepare consistent contextual messages without sending on their behalf. |
| Target users | Recruiter and Manager; Admin manages approved templates. |
| User actions | Select template/context, generate or compose draft, edit, save, copy/export text, discard. |
| Inputs | Template; recipient display name/contact if authorized; REC/candidate/interview context; tone/language choices if supported; user-provided notes. |
| Output | Editable draft with subject/body and clear indication of populated fields; no automatic sending. |
| Validation | Required template placeholders must have values or remain visibly unresolved; prevent unintended inclusion of unauthorized/private fields; sanitize rendered content. |
| Success/error states | Draft saved/copied with confirmation. Generation failure offers template-based/manual fallback. Missing context is highlighted, not guessed. |
| Dependencies | Candidate/REC/interview/follow-up; templates; optional text-generation adapter; workspace authorization. |
| Business rules / edge cases | User reviews before use. MVP has no mailbox connection, sending, delivery tracking, or external email API dependency. Sensitive resume data is not inserted unless explicitly selected and permitted. |

### FR-11 — Recruitment analytics

| Attribute | Requirement |
| --- | --- |
| Purpose | Show actionable personal and team workflow health. |
| Target users | Recruiter personal view; Manager team view; Admin usage view. |
| User actions | Filter by permitted date range, team, REC, and stage; open underlying permitted records; export allowed aggregate report. |
| Inputs | Audited workflow events and current REC/submission/interview/task states. |
| Output | Counts and rates: open/aging RECs, submissions, interview conversion, pending/overdue follow-ups, stage aging, workload. Definitions are documented and consistent. |
| Validation | Tenant and role filters applied server-side; denominator and excluded statuses are shown; empty data has clear empty state. |
| Success/error states | Dashboard shows data timestamp and filters. Query/refresh failure is explicit; stale data is labeled. |
| Dependencies | Requirements, submissions, interviews, follow-ups, audit/event data, role policy. |
| Business rules / edge cases | Personal data is not exposed outside role scope. Historical snapshots/definitions must avoid shifting results silently. No recruiter ranking or performance comparison based on unvalidated score proxies in MVP. |

### FR-12 — Technical interview evaluation

| Attribute | Requirement |
| --- | --- |
| Purpose | Record structured, job-related technical interview feedback. |
| Target users | Assigned interviewer/recruiter enters feedback; Manager reviews rubric and aggregate feedback. |
| User actions | Select rubric, score criteria, add evidence/notes, save draft, submit, view authorized history. |
| Inputs | Interview/submission; rubric version; criterion scores and anchors; job-related evidence; optional recommendation; evaluator and timestamp. |
| Output | Versioned scorecard with criterion-level evidence and a summary; no automatic hiring decision. |
| Validation | Score within rubric scale; required evidence for configured criteria; only assigned/authorized evaluators; feedback tied to a completed interview unless draft allowed. |
| Success/error states | Submitted scorecard is timestamped. Invalid/incomplete form identifies fields. Editing a submitted evaluation creates a revision and preserves original. |
| Dependencies | Interview scheduling; REC requirements; roles; audit; analytics. |
| Business rules / edge cases | Rubric is job-relevant, shared consistently for the REC, versioned, and avoids protected characteristics. Conflicting feedback remains visible; averages do not override evidence or human review. Basic configurable rubric in MVP; advanced calibration is future. |

### FR-13 — Multi-recruiter collaboration

| Attribute | Requirement |
| --- | --- |
| Purpose | Support safe handoffs and shared work without losing ownership or context. |
| Target users | Recruiters on shared/assigned work; Managers coordinate team. |
| User actions | Share candidate/REC access, add internal note, request/accept handoff, reassign, revoke share, inspect history. |
| Inputs | Target user/team, record, access scope, optional expiry/reason, note, handoff owner. |
| Output | Visible shared access and ownership state, notification, immutable collaboration history. |
| Validation | Members active in same workspace; requester has permission; no external email address; record scope explicit. |
| Success/error states | Grant/handoff shows recipient and scope. Revoked or unauthorized access fails without revealing inaccessible data. |
| Dependencies | Workspace membership; candidate/REC ownership; notifications; audit. |
| Business rules / edge cases | Sharing access does not implicitly transfer ownership. Handoff is an explicit ownership change retaining prior owner/history. Departure removes access through membership deactivation but leaves record history. |

### FR-14 — Multi-company workspaces and administration

| Attribute | Requirement |
| --- | --- |
| Purpose | Host multiple customer organizations with private data, users, and configuration. |
| Target users | Workspace Admin manages tenant; Platform Super Admin manages platform lifecycle. |
| User actions | Create/select workspace membership, invite/deactivate users, assign roles, configure allowed settings, view audit/usage, provision or suspend tenant through platform operations. |
| Inputs | Workspace identity/settings; member email/role; configuration; lifecycle action and reason; support-access grant if applicable. |
| Output | Isolated workspace, membership state, settings, audit events, aggregate platform health. |
| Validation | Unique membership; valid role; invitations expire; cannot deactivate the last active admin without replacement/recovery plan; lifecycle actions require authorization and confirmation. |
| Success/error states | Clear invite and membership status. Failed invitation/config change is visible and retryable. Cross-tenant request is denied and logged without data disclosure. |
| Dependencies | Authentication/authorization; all tenant-owned modules; database tenant controls; audit; deployment/operations. |
| Business rules / edge cases | A user may belong to multiple workspaces with role-specific context. Super Admin has no routine candidate-data access. Support access must have purpose, approver, expiry, and audit record. Billing, plans, self-service provisioning, and purge automation are future/approval-dependent. |

## 3. Cross-module state and edge-case rules

| Scenario | Required behavior |
| --- | --- |
| Two recruiters claim same candidate for same REC | Atomic transaction/unique active claim: exactly one succeeds; conflict response offers manager escalation. |
| Candidate added twice | Exact normalized email/phone triggers likely duplicate review before save; do not auto-merge. Name similarity alone is a warning. |
| Candidate submitted twice for one REC | Enforce unique active submission with database constraint and idempotent request handling; return existing authorized record. |
| REC closed during active work | Require close reason; block new claims/submissions; present active work for resolution; preserve and continue history. |
| Interview rescheduled | Keep schedule revision and actor; update linked reminders; surface new time in timezone; preserve old time. |
| Recruiter leaves | Disable sessions immediately; queue ownership and active work for manager reassignment; preserve attribution/history. |
| Parser or matcher fails | Preserve source data; show failed/partial state and retry/manual fallback; do not create success-shaped result. |
| Concurrent edits | Use optimistic version checks or equivalent; detect conflict and require user decision rather than silently overwriting. |
| Cross-workspace identifier supplied | Reject at service and data-access layer; response does not confirm whether entity exists elsewhere. |
| Data export requested | Re-check authorization and scope at execution time; audit who exported what and when; provide bounded, expiring download. |

## 4. Global field and state conventions

- Store timestamps in UTC and retain explicit timezone for user-entered interview/due times.
- Use stable internal IDs; do not rely on email/name as a primary identifier.
- Record actor, timestamps, and version for material state changes.
- Keep original resume/JD input distinct from extracted or edited fields.
- Use soft archive/withdrawal states for business records with downstream history; hard deletion follows approved retention and legal policy.
- Status values are explicit state machines; reject invalid transitions with a reason and current status.

---

*End of SEARCHY Functional Requirements.*
