# SEARCHY — Security Design

| Field | Value |
| --- | --- |
| Version | 1.0.0 |
| Status | Proposed controls; verify against deployed Supabase configuration |
| Scope | Threat boundaries, tenant isolation, data and operations security |

## 1. Security objectives

Protect candidate personal data and resumes, prevent cross-organization access, preserve recruitment workflow integrity, and limit privileged operational access. Security controls must be enforced server-side and in PostgreSQL; UI visibility is not an authorization boundary.

## 2. Trust boundaries and principal risks

| Boundary / risk | Required control |
| --- | --- |
| Browser is untrusted | Never embed service-role credentials; validate all inputs server-side; do not trust actor, role, owner, or organization IDs supplied by the browser. |
| Supabase Data API | Authenticated JWT plus RLS on every exposed tenant table; narrow RPCs for atomic operations; revoke unsafe function execution. |
| Tenant boundary | Repeated organization IDs, composite foreign keys, active-membership checks, tenant-scoped unique indexes, and cross-tenant negative tests. |
| Resume object storage | Private bucket, path-scoped policy, short-lived signed downloads, MIME/size/content checks, safe filenames, malware scanning policy, no public object URLs. |
| Privileged service role | Server/CI secret manager only; tightly restricted operators; rotate on exposure; monitor its use because it bypasses RLS. |
| AI/parser boundary | Minimize transmitted candidate data; no mandatory paid API; explicit provider/privacy approval; human review; no autonomous employment decision. |
| Exports and analytics | Reauthorize at execution time, bound export, audit actor/scope, avoid PII in aggregate/telemetry, use expiring downloads. |
| Platform support | No routine tenant content access. Purpose-limited, approved, expiring support grant; access and result are audited. |

## 3. Authentication and sessions

Supabase Auth manages credentials and sessions. Enable production-appropriate password controls, MFA for privileged workspace/platform administrators, secure redirect allowlists, and rate limits. Configure refresh token/session revocation and verify that deactivated memberships are denied even if a still-valid JWT exists. Membership role is resolved from current database state rather than a stale client claim.

Do not return or log session tokens, recovery tokens, invitation secrets, or signed object URLs. Use separate Supabase projects for development, staging, and production. Keep production credentials and service-role key out of GitHub client builds and preview deployments.

## 4. Authorization and tenant isolation

Every tenant-owned row includes `organization_id`; all cross-row references use composite keys containing that organization. RLS is enabled and forced where feasible on exposed tables. Policies derive the actor using `auth.uid()` and verify active membership in `organization_members`.

Access model:

- Recruiter: assigned requirements; own, shared, or actively claimed candidates; scoped submissions/tasks/interviews.
- Manager: organization-level recruitment records and conflict resolution.
- Workspace Admin: membership/settings and explicitly granted record access; no routine candidate-content access.
- Platform operator: separate control plane; no ordinary cross-tenant business data access.

Security-definer helper functions live in the non-exposed `searchy_private` schema, use a fixed `search_path`, minimal return data, explicit execute grants, and no caller-supplied actor identity. Configure Supabase API exposed schemas to exclude `searchy_private`. The SQL migration must be reviewed before production because Supabase's `service_role` and database owners bypass RLS.

## 5. Database integrity and concurrency

- Unique partial index permits at most one unreleased active ownership row per `(organization_id, candidate_id, requirement_id)`.
- Reservation RPC locks the candidate row, expires the stale claim for that exact REC, and inserts within one transaction; the unique constraint is the final race guard.
- Different requirements have distinct claim scopes; this is not a workspace-global reservation.
- One submission row per candidate/REC enforces same-client/REC duplicate prevention because every REC belongs to one client. Reuse status history for withdraw/review/resubmit; do not insert a duplicate.
- New submissions require an open REC. A database insert trigger takes a `FOR SHARE` lock on the requirement row so submission creation and closing/pausing the REC serialize safely.
- Foreign keys, check constraints, transactions, and state transition functions enforce integrity independently of frontend validation.
- Authenticated inserts are limited to initial workflow states (including `pending_review` submissions, `scheduled` interviews, draft evaluations, and open follow-ups); transition guards prevent forged completion/review timestamps, and submitted evaluations remain immutable.
- Audit event write path is append-only for application roles; avoid storing resume contents or unnecessary PII.

Reservation policy proposed for MVP: seven-day expiry, renewable by the owner while active and allowed by manager policy; explicit release on abandonment/handoff; manager may reassign with reason; a claim is expired lazily during the next reservation attempt and may also be expired by a scheduled worker. Expiry is never silently treated as a successful claim without the atomic update.

## 6. Resume and sensitive data controls

Candidate profile fields, contact details, resumes, interview notes, and email drafts are sensitive. Collect only data necessary for recruitment. Enforce approved consent/provenance and retention policy before production use.

Uploads must validate size, extension and actual type; parse in a resource-bounded worker; never execute uploaded content; isolate temporary files; clean them up on success/failure; and reject malformed/decompression-bomb inputs. Store in a private bucket with generated keys. Downloads require current record authorization and short-lived links. Backups and storage must be encrypted and access-controlled.

Development, tests, and public demos use synthetic candidate details only. Do not copy production data into developer machines or non-production environments.

## 7. AI and matching safeguards

The MVP baseline must work without paid APIs. Do not use protected characteristics, sensitive traits, or intentionally derived proxies in matching. Return criterion-level evidence and unknowns, persist algorithm version, show an assistive-not-decisional label, and require human review. Keep model prompt/input logs disabled or redacted. Any future external processing requires documented data flows, provider retention/training terms, customer approval, and privacy/security review. Sentence Transformers is not required unless offline evaluation demonstrates an advantage over the deterministic baseline.

## 8. API, browser, and deployment controls

- Use HTTPS; restrict CORS and Auth redirect origins to deployed app origins.
- Use parameterized SQL and schema-validated payloads; encode output; apply CSRF protections for cookie-based flows and standard XSS defenses.
- Rate-limit authentication, search, upload, export, and expensive matching/job operations.
- Use CSP and secure browser defaults. Do not put sensitive profile data in URL query strings.
- Run dependency, secret, and static checks in CI; pin reviewed dependencies and apply security updates.
- Deploy migrations via reviewable CI/operations, not ad hoc production console changes. Use backward-compatible changes and restore-tested backups.

## 9. Audit, logging, and incident response

Audit role/membership changes, candidate claims/releases/reassignments/merges, submission decisions, exports, support access, and sensitive setting changes. Records should include actor, organization, action, object identifiers, timestamp, outcome, and request correlation ID; exclude resume bytes and tokens. Restrict audit reads and retain according to approved policy.

Operational logs are structured and redacted. Monitor authorization denials, unusual export/download patterns, privileged service-role usage, repeated failed authentication, queue failures, database/storage health, and backup status. Establish incident triage, credential rotation, tenant notification, and restore procedures before production candidate data.

## 10. Required security tests / launch gates

1. A user from organization A cannot list, search, retrieve, update, delete, export, or download organization B's records.
2. A recruiter cannot inspect an unshared candidate merely by guessing UUIDs or changing API filters.
3. Storage read/write policies enforce organization, candidate access, bucket, and allowed path; signed links expire.
4. Concurrent reservations produce exactly one owner for the same candidate+REC; different RECs remain independent.
5. Concurrent/retried submission calls result in one candidate/REC record.
6. Deactivated user and changed role lose access immediately, including via old JWT.
7. Workspace Admin cannot obtain blanket resume access without an explicit expiring grant.
8. RPC functions reject unauthenticated callers and derive actor from `auth.uid()`.
9. Logs and audit payloads contain no resume text, passwords, bearer tokens, or signed URL secrets.
10. Backup restoration and deletion/retention operations are tested with synthetic data.

## 11. Decisions requiring approval

Approve legal basis/consent, retention and deletion windows, supported jurisdictions/data residency, audit retention, file-size/content limits, reservation lease duration, external AI policy, admin support-access procedure, and production availability/recovery targets. The current controls are architecture requirements, not a claim of regulatory certification.

---

*Related: [System Design](./SYSTEM_DESIGN.md), [Database Design](./DATABASE_DESIGN.md), [User Roles](./USER_ROLES.md).*
