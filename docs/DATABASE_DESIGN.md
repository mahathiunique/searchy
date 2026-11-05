# SEARCHY — PostgreSQL Database Design

| Field | Value |
| --- | --- |
| Version | 1.0.0 |
| Status | Proposed schema; implemented by `database/migrations/` |
| Database | Supabase PostgreSQL |

## 1. Design decisions

- `organizations` is the tenant root. Every tenant-owned row stores `organization_id`.
- Supabase `auth.users` is the identity source; SEARCHY does not create a duplicate `users` table. `organization_members` provides the organization's role and membership state.
- Tenant-scoped composite foreign keys `(organization_id, entity_id)` prevent references crossing organizations.
- UUID primary keys are generated with `gen_random_uuid()`. Timestamps use `timestamptz` in UTC.
- Operational status columns use checked text values for easy evolution; state changes still follow explicit transitions in RPC/service logic.
- Candidate reservations are exclusive per `(organization, candidate, requirement)` and expire after a proposed seven-day lease. Different requirements may have independent owners.
- A requirement has one client. Therefore unique `(organization, candidate, requirement)` submissions prevent duplicates for the same client and REC.
- Business records are archived/withdrawn/released rather than hard-deleted when they have downstream history. Retention and permanent deletion require an approved policy.
- All tables exposed through Supabase Data API have RLS. See [SECURITY_DESIGN.md](./SECURITY_DESIGN.md).

## 2. Relationships and cardinalities

| Relationship | Cardinality |
| --- | --- |
| Organization — organization member | 1 to many; one membership per `(organization_id,user_id)` |
| Auth user — organization member | 1 to many; one user may belong to multiple organizations with different roles |
| Organization — client / requirement / candidate | 1 to many |
| Client — requirement | 1 to many; each requirement belongs to one client |
| Requirement — assigned recruiter | many to many through `requirement_assignments` |
| Candidate — resume | 1 to many; original file versions remain separately traceable |
| Candidate — skill | many to many through `candidate_skills` |
| Requirement — skill | many to many through `requirement_skills`, with required/preferred flag |
| Candidate — requirement ownership | 1 to many over time; at most one active recruiter per candidate+requirement |
| Ownership — ownership history | 1 to many |
| Candidate — recruiter share | 1 to many; explicit, revocable and optionally expiring |
| Candidate — requirement submission | 1 to many across requirements, unique once per REC |
| Submission — interview | 1 to many |
| Interview — evaluation | 1 to many evaluators; one evaluation per evaluator/interview |
| Evaluation — question score | 1 to many; one score per question |
| User — follow-up / notification / communication | 1 to many |
| Organization — processing job / audit event | 1 to many |
| Matching run — candidate result | 1 to many; one result per candidate/run |

See [ER_DIAGRAM.md](./ER_DIAGRAM.md) for the visual model.

## 3. Shared conventions and constraints

Every `organization_id` is `uuid NOT NULL REFERENCES organizations(id)`. Tenant-aware relationships use composite foreign keys, for example:

```sql
FOREIGN KEY (organization_id, candidate_id)
  REFERENCES public.candidates (organization_id, id)
```

Each referenced table has `UNIQUE (organization_id, id)` to support this constraint. The organization membership role is one of `recruiter`, `manager`, or `workspace_admin`; membership state is `invited`, `active`, or `deactivated`. A platform super administrator is not a workspace membership.

`created_at` defaults to `now()` and `updated_at` is maintained by a trigger where mutable records need it. Soft-deleted/archived records are excluded from active-list indexes but remain addressable for historical foreign keys. All sensitive modifications are auditable.

## 4. Table definitions

Notation: **NN** = `NOT NULL`; **PK** = primary key; **FK** = foreign key; **UQ** = unique. Defaults and checks are listed. Unless stated otherwise, primary IDs default to `gen_random_uuid()` and `created_at` defaults to `now()`.

### 4.1 Tenant, users, requirements

| Table | Columns (type; nullability; default; constraints) | Indexes |
| --- | --- | --- |
| `organizations` | `id uuid PK`; `name text NN`; `slug text NN UQ`; `status text NN DEFAULT 'active' CHECK active/suspended/deleted`; `timezone text NN DEFAULT 'UTC'`; `settings jsonb NN DEFAULT '{}'`; `created_by uuid FK auth.users(id)`; `created_at timestamptz NN DEFAULT now()`; `updated_at timestamptz NN DEFAULT now()`; `deleted_at timestamptz NULL` | unique `slug`; `status` |
| `organization_members` | `organization_id uuid NN FK organizations`; `user_id uuid NN FK auth.users`; `role text NN CHECK recruiter/manager/workspace_admin`; `status text NN DEFAULT 'invited' CHECK invited/active/deactivated`; `invited_by uuid NULL FK auth.users`; `invited_at timestamptz NN DEFAULT now()`; `activated_at timestamptz NULL`; `deactivated_at timestamptz NULL`; `created_at timestamptz NN DEFAULT now()`; `updated_at timestamptz NN DEFAULT now()`; `PK(organization_id,user_id)` | `(user_id,status)`; `(organization_id,role,status)` |
| `clients` | `id uuid PK`; `organization_id uuid NN`; `name text NN`; `external_reference text NULL`; `status text NN DEFAULT 'active' CHECK active/archived`; `created_by uuid NN`; `created_at`, `updated_at timestamptz NN`; `deleted_at timestamptz NULL`; `UQ(organization_id,id)`; `FK(organization_id,created_by) → organization_members` | `(organization_id,status,name)`; partial unique `(organization_id,lower(name)) WHERE deleted_at IS NULL` |
| `requirements` | `id uuid PK`; `organization_id uuid NN`; `client_id uuid NN`; `title text NN`; `description text NN`; `status text NN DEFAULT 'draft' CHECK draft/open/paused/closed`; `location text[] NN DEFAULT '{}'`; `employment_type text NULL`; `min_experience_years numeric(5,2) NULL`; `max_experience_years numeric(5,2) NULL`; `openings integer NN DEFAULT 1 CHECK >0`; `salary_min numeric(12,2) NULL`; `salary_max numeric(12,2) NULL`; `salary_currency char(3) NULL`; `priority text NN DEFAULT 'normal' CHECK low/normal/high/urgent`; `target_date date NULL`; `close_reason text NULL`; `created_by uuid NN`; `created_at`, `updated_at timestamptz NN`; `deleted_at timestamptz NULL`; `UQ(organization_id,id)`; composite client and creator FKs; checks min≤max and salary_min≤salary_max | `(organization_id,status,target_date)`; `(organization_id,client_id)`; GIN `location` |
| `requirement_assignments` | `organization_id uuid NN`; `requirement_id uuid NN`; `user_id uuid NN`; `assigned_by uuid NN`; `assigned_at timestamptz NN DEFAULT now()`; `unassigned_at timestamptz NULL`; `PK(organization_id,requirement_id,user_id)`; composite FKs to requirement and membership for both users | partial `(organization_id,user_id,requirement_id) WHERE unassigned_at IS NULL` |

### 4.2 Candidate records, resumes, skills

| Table | Columns (type; nullability; default; constraints) | Indexes |
| --- | --- | --- |
| `candidates` | `id uuid PK`; `organization_id uuid NN`; `full_name text NN`; `normalized_email text NULL`; `phone text NULL`; `current_title text NULL`; `total_experience_years numeric(5,2) NULL CHECK ≥0`; `locations text[] NN DEFAULT '{}'`; `source text NULL`; `consent_status text NULL CHECK unknown/granted/withdrawn/not_required`; `consent_recorded_at timestamptz NULL`; `created_by uuid NN`; `created_at`, `updated_at timestamptz NN`; `archived_at timestamptz NULL`; `UQ(organization_id,id)`; composite creator FK | partial unique `(organization_id,normalized_email) WHERE normalized_email IS NOT NULL AND archived_at IS NULL`; `(organization_id,archived_at,created_at)`; GIN `locations`; trigram/full-text indexes added only after extension and query plan review |
| `resumes` | `id uuid PK`; `organization_id uuid NN`; `candidate_id uuid NN`; `storage_path text NN`; `original_filename text NN`; `content_type text NN`; `size_bytes bigint NN CHECK >0`; `sha256 text NULL`; `processing_status text NN DEFAULT 'uploaded' CHECK uploaded/queued/processing/review_ready/failed/deleted`; `extracted_data jsonb NN DEFAULT '{}'`; `parser_version text NULL`; `uploaded_by uuid NN`; `created_at timestamptz NN`; `updated_at timestamptz NN`; `deleted_at timestamptz NULL`; `UQ(organization_id,id)`; UQ `storage_path`; composite candidate/uploader FKs | `(organization_id,candidate_id,created_at DESC)`; `(organization_id,processing_status,created_at)`; partial unique `(organization_id,sha256) WHERE sha256 IS NOT NULL AND deleted_at IS NULL` |
| `skills` | `id uuid PK`; `organization_id uuid NN`; `name text NN`; `normalized_name text NN`; `created_at timestamptz NN`; `UQ(organization_id,id)`; `UQ(organization_id,normalized_name)` | unique normalized name |
| `candidate_skills` | `organization_id uuid NN`; `candidate_id uuid NN`; `skill_id uuid NN`; `proficiency text NULL`; `years_experience numeric(5,2) NULL CHECK ≥0`; `source text NN DEFAULT 'manual'`; `created_at timestamptz NN`; `PK(organization_id,candidate_id,skill_id)`; composite FKs | `(organization_id,skill_id,candidate_id)` |
| `requirement_skills` | `organization_id uuid NN`; `requirement_id uuid NN`; `skill_id uuid NN`; `importance text NN CHECK required/preferred`; `weight numeric(5,2) NN DEFAULT 1 CHECK >0`; `created_at timestamptz NN`; `PK(organization_id,requirement_id,skill_id)`; composite FKs | `(organization_id,skill_id,importance)` |

### 4.3 Ownership, collaboration, and submissions

| Table | Columns (type; nullability; default; constraints) | Indexes |
| --- | --- | --- |
| `candidate_ownership` | `id uuid PK`; `organization_id uuid NN`; `candidate_id uuid NN`; `requirement_id uuid NN`; `recruiter_id uuid NN`; `status text NN DEFAULT 'active' CHECK active/released/expired/reassigned`; `reserved_at timestamptz NN DEFAULT now()`; `expires_at timestamptz NN`; `released_at timestamptz NULL`; `released_by uuid NULL`; `release_reason text NULL`; `created_at timestamptz NN`; `updated_at timestamptz NN`; `UQ(organization_id,id)`; composite candidate/REC/owner/releaser FKs; `CHECK(expires_at > reserved_at)`; `CHECK((status='active')=(released_at IS NULL))` | unique active `(organization_id,candidate_id,requirement_id) WHERE status='active' AND released_at IS NULL`; `(organization_id,recruiter_id,status,expires_at)` |
| `ownership_history` | `id uuid PK`; `organization_id uuid NN`; `ownership_id uuid NN`; `candidate_id uuid NN`; `requirement_id uuid NN`; `actor_id uuid NULL`; `previous_recruiter_id uuid NULL`; `new_recruiter_id uuid NULL`; `action text NN CHECK reserved/renewed/released/expired/reassigned`; `reason text NULL`; `occurred_at timestamptz NN DEFAULT now()`; composite FKs; actor/member references remain nullable for deleted identities | `(organization_id,candidate_id,occurred_at DESC)`; `(organization_id,ownership_id,occurred_at)` |
| `candidate_shares` | `id uuid PK`; `organization_id uuid NN`; `candidate_id uuid NN`; `shared_with uuid NN`; `shared_by uuid NN`; `scope text NN CHECK profile/resume`; `expires_at timestamptz NULL`; `revoked_at timestamptz NULL`; `created_at timestamptz NN`; composite FKs; `UQ(organization_id,id)` | partial `(organization_id,shared_with,candidate_id) WHERE revoked_at IS NULL` |
| `candidate_access_grants` | `id uuid PK`; `organization_id uuid NN`; `candidate_id uuid NN`; `granted_to uuid NN`; `granted_by uuid NN`; `purpose text NN`; `expires_at timestamptz NN`; `revoked_at timestamptz NULL`; `created_at timestamptz NN`; composite FKs | `(organization_id,granted_to,expires_at) WHERE revoked_at IS NULL` |
| `submissions` | `id uuid PK`; `organization_id uuid NN`; `candidate_id uuid NN`; `requirement_id uuid NN`; `submitted_by uuid NN`; `status text NN DEFAULT 'pending_review' CHECK pending_review/returned/approved/sent_to_client/interviewing/offered/joined/rejected/withdrawn`; `cover_note text NULL`; `decision_reason text NULL`; `submitted_at timestamptz NN DEFAULT now()`; `updated_at timestamptz NN DEFAULT now()`; `UQ(organization_id,id)`; `UQ(organization_id,candidate_id,requirement_id)`; composite candidate/REC/member FKs | `(organization_id,requirement_id,status,submitted_at DESC)`; `(organization_id,candidate_id,submitted_at DESC)` |

### 4.4 Interviews, evaluation, and tasks

| Table | Columns (type; nullability; default; constraints) | Indexes |
| --- | --- | --- |
| `interviews` | `id uuid PK`; `organization_id uuid NN`; `submission_id uuid NN`; `interview_type text NN CHECK phone/video/in_person/technical/other`; `status text NN DEFAULT 'scheduled' CHECK scheduled/completed/cancelled/no_show`; `starts_at timestamptz NN`; `ends_at timestamptz NN`; `timezone text NN`; `location_or_link text NULL`; `participants jsonb NN DEFAULT '[]'`; `reschedule_reason text NULL`; `created_by uuid NN`; `created_at`, `updated_at timestamptz NN`; `UQ(organization_id,id)`; composite submission/creator FKs; `CHECK(ends_at>starts_at)` | `(organization_id,starts_at,status)`; `(organization_id,submission_id,starts_at)` |
| `interview_schedule_history` | `id uuid PK`; `organization_id uuid NN`; `interview_id uuid NN`; `actor_id uuid NULL`; old/new starts, ends `timestamptz NN`; old/new `timezone text NN`; `reason text NN`; `changed_at timestamptz NN DEFAULT now()`; composite interview/actor FKs | `(organization_id,interview_id,changed_at DESC)` |
| `interview_questions` | `id uuid PK`; `organization_id uuid NN`; `requirement_id uuid NULL`; `question text NN`; `criterion text NN`; `min_score integer NN DEFAULT 1`; `max_score integer NN DEFAULT 5`; `anchors jsonb NN DEFAULT '{}'`; `version integer NN DEFAULT 1`; `active boolean NN DEFAULT true`; `created_by uuid NN`; `created_at timestamptz NN`; composite REC/member FKs; `CHECK(max_score>min_score)` | `(organization_id,requirement_id,active)` |
| `interview_evaluations` | `id uuid PK`; `organization_id uuid NN`; `interview_id uuid NN`; `evaluator_id uuid NN DEFAULT auth.uid()`; `version integer NN DEFAULT 1 CHECK >0`; `status text NN DEFAULT 'draft' CHECK draft/submitted`; `recommendation text NULL CHECK strong_yes/yes/mixed/no/strong_no`; `summary text NULL`; `submitted_at timestamptz NULL`; `created_at`, `updated_at timestamptz NN`; `UQ(organization_id,id)`; `UQ(organization_id,interview_id,evaluator_id,version)`; composite FKs | `(organization_id,interview_id,status)`; partial unique `(organization_id,interview_id,evaluator_id) WHERE status='draft'`; `(organization_id,evaluator_id,submitted_at DESC)` |
| `interview_evaluation_scores` | `organization_id uuid NN`; `evaluation_id uuid NN`; `question_id uuid NN`; `score integer NN`; `evidence text NULL`; `created_at timestamptz NN`; `PK(organization_id,evaluation_id,question_id)`; composite FKs | `(organization_id,question_id)` |
| `followups` | `id uuid PK`; `organization_id uuid NN`; `owner_id uuid NN`; `created_by uuid NN`; nullable `candidate_id`, `requirement_id`, `submission_id`, `interview_id uuid`; `title text NN`; `description text NULL`; `due_at timestamptz NN`; `priority text NN DEFAULT 'normal' CHECK low/normal/high`; `status text NN DEFAULT 'open' CHECK open/completed/cancelled`; `completed_at timestamptz NULL`; `created_at`, `updated_at timestamptz NN`; composite FKs; check exactly one linked entity is non-null | `(organization_id,owner_id,status,due_at)`; partial `(organization_id,due_at) WHERE status='open'` |

### 4.5 Communication, processing, analytics, audit

| Table | Columns (type; nullability; default; constraints) | Indexes |
| --- | --- | --- |
| `communications` | `id uuid PK`; `organization_id uuid NN`; `created_by uuid NN`; `candidate_id uuid NULL`; `requirement_id uuid NULL`; `submission_id uuid NULL`; `kind text NN CHECK email_draft/note`; `status text NN DEFAULT 'draft' CHECK draft/copied/archived`; `recipient text NULL`; `subject text NULL`; `body text NN`; `template_key text NULL`; `created_at`, `updated_at timestamptz NN`; composite FKs; no sending fields are used in MVP | `(organization_id,created_by,updated_at DESC)`; `(organization_id,candidate_id,updated_at DESC)` |
| `notifications` | `id uuid PK`; `organization_id uuid NN`; `recipient_id uuid NN`; `kind text NN`; `title text NN`; `body text NULL`; `entity_type text NULL`; `entity_id uuid NULL`; `read_at timestamptz NULL`; `created_at timestamptz NN`; composite recipient FK | `(organization_id,recipient_id,read_at,created_at DESC)` |
| `processing_jobs` | `id uuid PK`; `organization_id uuid NN`; `job_type text NN CHECK parse_resume/import_spreadsheet`; `resume_id uuid NULL`; `status text NN DEFAULT 'queued' CHECK queued/running/succeeded/failed/cancelled`; `idempotency_key text NN`; `attempts integer NN DEFAULT 0 CHECK ≥0`; `run_after timestamptz NN DEFAULT now()`; `locked_at timestamptz NULL`; `locked_by text NULL`; `last_error_code text NULL`; `created_by uuid NN`; `created_at`, `updated_at timestamptz NN`; composite FKs; `UQ(organization_id,job_type,idempotency_key)` | `(status,run_after)`; `(organization_id,resume_id)`; partial `(locked_at) WHERE status='running'` |
| `matching_runs` | `id uuid PK`; `organization_id uuid NN`; `requirement_id uuid NN`; `requested_by uuid NN`; `algorithm_version text NN`; `input_fingerprint text NN`; `status text NN DEFAULT 'queued' CHECK queued/running/succeeded/failed`; `created_at`, `completed_at timestamptz NULL`; `UQ(organization_id,id)`; composite FKs | `(organization_id,requirement_id,created_at DESC)` |
| `matching_results` | `organization_id uuid NN`; `run_id uuid NN`; `candidate_id uuid NN`; `rank integer NN CHECK >0`; `score numeric(6,3) NN CHECK 0≤score≤100`; `evidence jsonb NN DEFAULT '{}'`; `created_at timestamptz NN`; `PK(organization_id,run_id,candidate_id)`; `UQ(organization_id,run_id,rank)`; composite FKs | `(organization_id,candidate_id)`; `(organization_id,run_id,rank)` |
| `audit_logs` | `id uuid PK`; `organization_id uuid NN`; `actor_id uuid NULL`; `action text NN`; `target_type text NN`; `target_id uuid NULL`; `outcome text NN CHECK success/denied`; `request_id uuid NULL`; `metadata jsonb NN DEFAULT '{}'`; `created_at timestamptz NN DEFAULT now()`; composite organization/actor FK where actor remains available | `(organization_id,created_at DESC)`; `(organization_id,actor_id,created_at DESC)`; `(organization_id,target_type,target_id,created_at DESC)` |

## 5. Business integrity rules

### Atomic candidate reservation

Reserve through a database RPC, never a UI check followed by insert. Under a transaction:

1. Verify `auth.uid()` is an active organization member with recruiter/manager role and has access to the requirement.
2. Lock the candidate row with `SELECT ... FOR UPDATE`.
3. Mark an expired active claim for the same candidate+REC expired and append history.
4. Insert the new ownership row with `expires_at = now() + interval '7 days'`.
5. Let the partial unique index resolve any remaining race; map unique violation to HTTP 409 conflict.

Renewal extends an active claim by seven days (proposed), with an audit/history event. Release/handoff is explicit and requires an authorized actor and reason; managers may reassign with a reason. Expired claims are also cleaned up by a scheduled worker; the RPC handles lazy expiry so correctness does not depend on scheduler timing.

### Duplicate submissions

The `requirements` row identifies its single `client_id`. Unique `(organization_id,candidate_id,requirement_id)` therefore prevents a second submission to the same client and REC. Repeated attempts return the existing submission or conflict; status is transitioned on that record. If product later chooses historical resubmission as a new attempt, add a separate attempt model and approved policy instead of dropping the uniqueness guard.

Only open requirements accept new submissions. The insert policy checks the current state, and a `BEFORE INSERT` trigger locks the requirement row `FOR SHARE` while checking it. This serializes submission creation against a concurrent close/pause update: either the submission precedes that state change, or it observes the non-open state and fails.

### Resume storage

`resumes.storage_path` is unique and private; proposed path format is `<organization-uuid>/<candidate-uuid>/<resume-uuid>`. It must not include a candidate name/email. Storage RLS checks active membership and candidate authorization. Actual file content validation occurs in a trusted processor, not by trusting browser MIME metadata.

## 6. Indexing and query strategy

- All frequent queries begin with `organization_id`.
- Add compound indexes matching UI filters and sort order; avoid redundant indexes already covered by unique indexes.
- Partial indexes keep active queues compact.
- GIN indexes serve array containment for locations; text-search/trigram indexes are introduced only after measuring query patterns and enabling required extensions.
- Use keyset pagination for large candidate/audit lists. Bound page size and export jobs.
- Inspect `EXPLAIN (ANALYZE, BUFFERS)` on representative synthetic datasets before production.
- Partition audit logs by time only when volume warrants; preserve retention and RLS semantics.

## 7. Row Level Security and grants

Enable and force RLS on all exposed tenant tables. Policies use `auth.uid()` and active `organization_members`. Shared helper functions are `SECURITY DEFINER` only where needed to prevent RLS recursion; they live in the non-exposed `searchy_private` schema, use pinned `search_path`, explicit execute grants, and least privilege. Configure Supabase API exposed schemas to exclude `searchy_private`. Row policies and grants must be tested via the `authenticated` role, not just as database owner. The service role bypasses RLS and must never be shipped to the browser.

The proposed migrations implement RLS on all domain tables, private Storage policies, candidate visibility checks, and the atomic reservation RPC. Admin access to candidate content is granted per candidate with purpose and expiry rather than implicitly across the workspace.

## 8. SQL examples

The following are practical query patterns; table/column names follow the migration.

### JOIN: requirements and candidate submissions

```sql
SELECT r.id AS requirement_id, r.title, c.name AS client_name,
       ca.id AS candidate_id, ca.full_name, s.status, s.submitted_at
FROM public.requirements r
JOIN public.clients c
  ON c.organization_id = r.organization_id AND c.id = r.client_id
JOIN public.submissions s
  ON s.organization_id = r.organization_id AND s.requirement_id = r.id
JOIN public.candidates ca
  ON ca.organization_id = s.organization_id AND ca.id = s.candidate_id
WHERE r.organization_id = :organization_id
  AND r.status IN ('open', 'paused')
ORDER BY s.submitted_at DESC;
```

### GROUP BY / HAVING: recruiter submission counts

```sql
SELECT s.submitted_by, count(*) AS submission_count
FROM public.submissions s
WHERE s.organization_id = :organization_id
  AND s.submitted_at >= :from_time
GROUP BY s.submitted_by
HAVING count(*) >= 5
ORDER BY submission_count DESC;
```

### Subquery: candidates with no submission for a REC

```sql
SELECT c.id, c.full_name
FROM public.candidates c
WHERE c.organization_id = :organization_id
  AND c.archived_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.submissions s
    WHERE s.organization_id = c.organization_id
      AND s.candidate_id = c.id
      AND s.requirement_id = :requirement_id
  );
```

### CTE: open requirements and overdue follow-ups

```sql
WITH overdue AS (
  SELECT f.organization_id, f.requirement_id, count(*) AS overdue_count
  FROM public.followups f
  WHERE f.organization_id = :organization_id
    AND f.status = 'open' AND f.due_at < now()
    AND f.requirement_id IS NOT NULL
  GROUP BY f.organization_id, f.requirement_id
)
SELECT r.id, r.title, coalesce(o.overdue_count, 0) AS overdue_count
FROM public.requirements r
LEFT JOIN overdue o
  ON o.organization_id = r.organization_id AND o.requirement_id = r.id
WHERE r.organization_id = :organization_id AND r.status = 'open'
ORDER BY overdue_count DESC, r.target_date NULLS LAST;
```

### Window function: submission sequence per REC

```sql
SELECT s.requirement_id, s.id, s.candidate_id, s.submitted_at,
       row_number() OVER (
         PARTITION BY s.organization_id, s.requirement_id
         ORDER BY s.submitted_at, s.id
       ) AS submission_sequence
FROM public.submissions s
WHERE s.organization_id = :organization_id;
```

### Index example

```sql
CREATE INDEX IF NOT EXISTS idx_followups_open_due
  ON public.followups (organization_id, owner_id, due_at)
  WHERE status = 'open';
```

### RLS-safe view example

```sql
CREATE OR REPLACE VIEW public.requirement_submission_counts
WITH (security_invoker = true) AS
SELECT organization_id, requirement_id, count(*) AS submission_count
FROM public.submissions
GROUP BY organization_id, requirement_id;
```

`security_invoker` requires PostgreSQL 15+. Expose a view only after confirming its invoker privileges and RLS behavior in the deployed Supabase version.

### Transactional reservation pattern

The migration exposes `public.reserve_candidate(organization_id,candidate_id,requirement_id)`. This is illustrative of the transaction boundary:

```sql
BEGIN;
SELECT id FROM public.candidates
WHERE organization_id = :organization_id AND id = :candidate_id
FOR UPDATE;
UPDATE public.candidate_ownership
SET status = 'expired', released_at = now(), release_reason = 'lease_expired'
WHERE organization_id = :organization_id
  AND candidate_id = :candidate_id AND requirement_id = :requirement_id
  AND status = 'active' AND expires_at <= now();
INSERT INTO public.candidate_ownership
  (organization_id, candidate_id, requirement_id, recruiter_id, expires_at)
VALUES
  (:organization_id, :candidate_id, :requirement_id, :auth_user_id,
   now() + interval '7 days');
COMMIT;
```

Production callers must use the RPC, which additionally checks membership, requirement status, authorization, records history/audit, and maps conflicts.

### Conditional update: renew only a live owner reservation

```sql
UPDATE public.candidate_ownership
SET expires_at = now() + interval '7 days', updated_at = now()
WHERE organization_id = :organization_id
  AND id = :ownership_id
  AND recruiter_id = :auth_user_id
  AND status = 'active'
  AND released_at IS NULL
  AND expires_at > now()
RETURNING id, expires_at;
```

Production renewal should be wrapped in an authorized RPC that writes ownership history and audit event in the same transaction.

## 9. Migrations and operational rules

Migrations are ordered, reviewed SQL files under `database/migrations/`. Apply them through Supabase CLI/CI to isolated environments, not manually from the browser. Validate on a clean local/staging database, then exercise RLS as authenticated users. Production changes should be additive first; destructive migrations require backup, rollback plan, and approval.

---

*See [database/migrations/](../database/migrations/) for the schema and RLS/RPC implementation.*
