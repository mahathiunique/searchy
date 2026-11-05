# SEARCHY — API Contracts

| Field | Value |
| --- | --- |
| Version | 1.0.0 |
| Status | Proposed contract for Supabase PostgREST/Auth/Storage |
| API style | Supabase SDK over HTTPS; PostgreSQL RPC for atomic business operations |

## 1. API conventions

No separate application server is introduced initially. The frontend uses the Supabase client with the signed-in user's access token. Table resources use `/rest/v1/<table>`; database functions use `/rest/v1/rpc/<function>`; Auth uses `/auth/v1/*`; private files use `/storage/v1/object/*`.

- `organization_id` is required as a filter/context for tenant operations, but never trusted alone. RLS validates membership and scope.
- UUID identifiers are opaque. Bodies must not contain authoritative actor/role values; the database uses `auth.uid()`.
- List APIs use a bounded page size (default 25, max 100), stable sort, and keyset pagination for large datasets.
- Mutations use `Prefer: return=representation` where appropriate. Critical retries use an idempotency key.
- Use UTC ISO-8601 timestamps. Interview/follow-up inputs also include an IANA timezone.
- Supabase returns standard PostgREST errors. The UI maps constraint/function failures to the stable error envelope below and must not expose SQL internals.
- Supabase Auth/Storage native contracts remain authoritative for their operations; this document specifies product-level payloads and behavior.

### Product error envelope

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "This candidate is already reserved for this requirement.",
    "request_id": "d85f5ccb-2cab-4aeb-8e74-1b1d27e16828",
    "details": { "entity": "candidate_ownership" }
  }
}
```

`details` must not disclose unauthorized candidate or tenant data. Core codes: `VALIDATION_ERROR` (400), `UNAUTHENTICATED` (401), `FORBIDDEN` (403), non-disclosing `NOT_FOUND` (404), `CONFLICT` (409), `RATE_LIMITED` (429), `PROCESSING_FAILED` (retryable/terminal job response), `INTERNAL` (500).

## 2. Authentication

Authentication is handled through Supabase Auth SDK; no custom password endpoint.

| Operation | Supabase endpoint / SDK | Request | Success |
| --- | --- | --- | --- |
| Sign up | `POST /auth/v1/signup` | `{ "email": "...", "password": "..." }` (confirmation behavior configured per deployment) | User/session or confirmation-required response |
| Sign in | `POST /auth/v1/token?grant_type=password` | `{ "email": "...", "password": "..." }` | Access/refresh token and user |
| Refresh | `POST /auth/v1/token?grant_type=refresh_token` | `{ "refresh_token": "..." }` | Rotated session tokens |
| Sign out | `POST /auth/v1/logout` | Authenticated request | `204` |
| Current user | `GET /auth/v1/user` | Access token | Authenticated identity |
| Organization memberships | `GET /rest/v1/organization_members?select=...` | JWT; self-filtered by RLS | Active memberships and role; no role is accepted from browser input |

Invitation, password reset, and MFA use the Auth SDK flows configured in Supabase. Workspace role assignment is a separately authorized database operation and must not be encoded as trusted client-editable user metadata.

## 3. Shared resource contracts

### Requirements

| Operation | Contract |
| --- | --- |
| List/detail | `GET /rest/v1/requirements?organization_id=eq.<uuid>&select=...&order=updated_at.desc&limit=25`; RLS returns only assigned/team-visible rows. Detail uses `id=eq.<uuid>`. |
| Create | `POST /rest/v1/requirements`; body `{organization_id,client_id,title,description,status?,locations?,min_experience_years?,max_experience_years?,openings?,priority?,target_date?}`. `created_by` defaults to `auth.uid()`; role/status validated in DB. |
| Update | `PATCH /rest/v1/requirements?id=eq.<uuid>&organization_id=eq.<uuid>`; editable fields plus optional `updated_at` version precondition. Close/reopen should use a transition RPC with close reason. |
| Assign | Proposed operation: upsert `requirement_assignments` with `{organization_id,requirement_id,user_id}`; `assigned_by` defaults to `auth.uid()`. Manager authorization and active same-workspace membership required. Re-activate an existing pair by clearing `unassigned_at`; the RPC wrapper is not yet in the migrations. |

Create/publish requires title, description, valid experience/salary ranges, positive openings, same-tenant client, and active same-tenant assignees. Closed requirements reject new reservations/submissions. Conflict uses 409; invalid fields use 400.

### Candidates

| Operation | Contract |
| --- | --- |
| Search | `GET /rest/v1/candidates?organization_id=eq.<uuid>&archived_at=is.null&select=...&limit=25`; permitted fields and rows are RLS-scoped. Search uses approved indexed filters, not arbitrary SQL. |
| Detail | `GET /rest/v1/candidates?id=eq.<uuid>&organization_id=eq.<uuid>&select=...`; unauthorized and cross-tenant IDs return no row/404. |
| Create | `POST /rest/v1/candidates`; `{organization_id,full_name,normalized_email?,phone?,current_title?,total_experience_years?,locations?,source?,consent_status?}`. Check exact normalized email before insert; unique conflict maps to duplicate review workflow. |
| Update/archive | `PATCH /rest/v1/candidates?id=eq.<uuid>&organization_id=eq.<uuid>`; allowed fields only; archive sets `archived_at`, never cascades historical activity. |
| Skills | Insert/delete `candidate_skills` rows; skill and candidate organization must match. |

### Resume upload

1. Generate a resume UUID and tenant/candidate-scoped path `<organization-uuid>/<candidate-uuid>/<resume-uuid>`. Insert a `resumes` metadata row using `POST /rest/v1/resumes`; `uploaded_by` defaults to `auth.uid()`, and RLS checks candidate access.
2. Upload bytes to private Storage bucket `searchy-resumes` using authenticated upload or short-lived signed upload authorization. Storage policy requires a matching metadata row/path.
3. A trusted completion operation verifies the object and enqueues a processing job, returning `{resume_id,processing_status:"queued",job_id}`. This completion/queue operation is not yet in the migrations.
4. Poll `GET /rest/v1/resumes?id=eq.<uuid>&select=id,processing_status,created_at` under RLS.

Validate byte limit, file type and content in the trusted processing boundary. Originals are immutable; do not use Storage upsert to overwrite an existing resume. Failed upload completion is retryable; duplicate idempotency key returns the existing authorized operation. Unsupported type/size is 400, unauthorized candidate is 404/403, storage failure is retryable 5xx. `POST /rest/v1/rpc/confirm_resume_parse` accepts `{p_organization_id,p_resume_id,p_extracted_data}` for an authorized human review of uploaded, failed, or review-ready extraction; extraction must be an object ≤256 KiB. It records `review_ready`; raw SQL updates to resume status/extraction are not granted.

### Candidate matching

`POST /rest/v1/rpc/run_candidate_matching`:

```json
{
  "p_organization_id": "a9b5b268-5c0e-4381-9e0a-1e1dc315782a",
  "p_requirement_id": "36eb87f1-a72e-4e50-8fdc-f410793248c1",
  "p_limit": 50
}
```

Returns `{run_id,status,algorithm_version,created_at}`; if matching is asynchronous, client polls the matching run and results. Results include `candidate_id`, bounded score, rank, matched/missing/unknown criteria, and evidence. Only authorized candidates are included. Invalid/closed REC is 400/409; unauthorized REC is 404; stale run is marked and should be rerun. Scores are advisory only.

### Candidate ownership

`POST /rest/v1/rpc/reserve_candidate`:

```json
{
  "p_organization_id": "a9b5b268-5c0e-4381-9e0a-1e1dc315782a",
  "p_candidate_id": "11a873f1-5ad9-4484-a43c-f8fc2f63fdfd",
  "p_requirement_id": "36eb87f1-a72e-4e50-8fdc-f410793248c1"
}
```

Actor and default 7-day lease are derived server-side. Returns `{ownership_id,candidate_id,requirement_id,recruiter_id,expires_at,status:"active"}`. Exactly one claim per candidate+REC can be active. A conflict is 409 and may return only the permitted claim status/owner detail.

Other operations: `renew_candidate_reservation(p_organization_id,p_ownership_id)`, `release_candidate_reservation(p_organization_id,p_ownership_id,p_reason)`, and manager-only `reassign_candidate_reservation(p_organization_id,p_ownership_id,p_new_recruiter_id,p_reason)`. All append history/audit in the same transaction. Expired claim is reclaimed atomically; different RECs are independent.

### Submissions

`POST /rest/v1/submissions` with `{organization_id,candidate_id,requirement_id,cover_note?}`; `submitted_by` defaults to `auth.uid()`. Returns `{id,status:"pending_review",submitted_at}`. RLS requires candidate access, an open REC, and an active candidate/REC reservation for recruiters; manager submissions are permitted. The database serializes submission creation against concurrent REC closure. Unique `(organization,candidate,requirement)` blocks duplicate submission for the REC/client. Duplicate maps to 409 and can return existing submission only if caller has access.

Manager review updates the authorized row with `PATCH /rest/v1/submissions?id=eq.<uuid>&organization_id=eq.<uuid>` and `{status,decision_reason}`. The database transition trigger permits only defined state changes, requires a reason on return/rejection, and blocks self-approval. A recruiter may withdraw only their own submission. Every row transition is audited; invalid transitions return a constraint error mapped to 409.

### Interviews and evaluations

| Operation | Contract |
| --- | --- |
| Schedule | `POST /rest/v1/interviews`; `{organization_id,submission_id,interview_type,starts_at,ends_at,timezone,location_or_link?,participants?}`; validates same-tenant submission and `ends_at > starts_at`. |
| Reschedule | `PATCH /rest/v1/interviews?id=eq.<uuid>&organization_id=eq.<uuid>`; `{starts_at,ends_at,timezone,reschedule_reason}`; the trigger writes old/new schedule, actor, and reason to `interview_schedule_history`. |
| Cancel/complete | Authorized `PATCH` to `status` and reason; DB trigger allows only `scheduled → completed/cancelled/no_show` and requires a cancellation reason. |
| Evaluation | `POST /rest/v1/interview_evaluations`; `{organization_id,interview_id,evaluator_id?}`; evaluator comes from JWT, not body. |
| Evaluation scores | Upsert `interview_evaluation_scores` `{organization_id,evaluation_id,question_id,score,evidence?}`; score must fit rubric and the rubric must match the REC; only drafts are editable. |
| Revise submitted evaluation | `POST /rest/v1/rpc/create_evaluation_revision` with `{p_organization_id,p_evaluation_id}`; manager only. Returns a new empty draft `{evaluation_id,version,status:"draft"}` while the submitted version and scores remain immutable. |

Schedule timestamps require timezone context; external calendar/email is not sent in MVP. Evaluation evidence is job-related and human-reviewed.

### Follow-ups

`POST /rest/v1/followups`:

```json
{
  "organization_id": "a9b5b268-5c0e-4381-9e0a-1e1dc315782a",
  "owner_id": "43e55499-b4d3-4f90-bd7a-8caf9cf4488e",
  "candidate_id": "11a873f1-5ad9-4484-a43c-f8fc2f63fdfd",
  "title": "Confirm interview availability",
  "due_at": "2026-11-08T10:00:00Z",
  "priority": "normal"
}
```

Exactly one linked entity is required (candidate, requirement, submission, or interview). New follow-ups must be `open`; clients cannot set `completed_at`. An authorized owner may complete or cancel an open follow-up, and the database manages `completed_at`. Only a manager may reopen a completed or cancelled item. Snooze must set a future due time. Deactivated owner causes a manager reassignment queue item, not silent auto-reassignment.

### Analytics

Bounded aggregate queries or a future security-invoker view provide stage counts, REC aging, and follow-up completion. Every query is RLS-scoped and date-bounded. Personal and team views differ by role. No cross-tenant candidate-level analytics.

## 4. Validation and error mapping

| Condition | HTTP / code | Behavior |
| --- | --- | --- |
| Missing/invalid field or invalid state transition | 400 `VALIDATION_ERROR` or 409 `CONFLICT` | Field-safe message; preserve input |
| No valid Supabase session | 401 `UNAUTHENTICATED` | Re-authenticate |
| Active member lacks role/action | 403 `FORBIDDEN` | Do not reveal protected data |
| Record absent or belongs to another org | 404 `NOT_FOUND` | Non-disclosing |
| Unique claim/submission conflict or stale edit | 409 `CONFLICT` | Offer existing authorized record/reload path |
| Rate/size limit exceeded | 429 `RATE_LIMITED` or 413 | Retry after limit or choose smaller file |
| Temporary Storage/worker failure | 503/retryable `PROCESSING_FAILED` | Keep job visible and source file recoverable |
| Unhandled server fault | 500 `INTERNAL` | Return request ID; no stack or SQL details |

Supabase may encode errors in its native body and status codes. The frontend adapter normalizes these to the UI envelope; do not claim a custom wire envelope unless an Edge Function/API proxy is actually deployed.

## 5. Migration implementation status

The SQL migrations currently create the schema, RLS policies, private Storage bucket/policies, audit guards, requirement/submission/interview/evaluation/follow-up state checks, and callable RPCs: `reserve_candidate`, `renew_candidate_reservation`, `release_candidate_reservation`, `reassign_candidate_reservation`, `confirm_resume_parse`, and `create_evaluation_revision`. Inserts through authenticated table access are restricted to initial lifecycle states; later transitions are checked in the database. New submissions require an open REC, with row locking to serialize against concurrent closure. Resume upload completion/job enqueue, email/template generation, matching execution, invitation lifecycle, assignment wrappers, and aggregate analytics views are product API contracts to implement when the corresponding UI/worker feature is built; they are not falsely presented as deployed endpoints.

## 6. Not part of MVP API

No Naukri/recruitment-platform endpoints, external email sending, calendar sync, paid AI-provider contract, public client API, or FastAPI endpoint is assumed. These require explicit product and security approval.

---

*See [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) and [SECURITY_DESIGN.md](./SECURITY_DESIGN.md).*
