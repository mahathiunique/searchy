# SEARCHY — User Roles and Permissions

| Field | Value |
| --- | --- |
| Version | 1.1.0 |
| Status | Product proposal — decisions requiring approval are listed in `PRD.md` |
| Scope | Workspace roles and platform operations |

## 1. Access model

SEARCHY serves multiple recruitment organizations. A **workspace** is one organization's private tenant. A user has one workspace role per membership and may have different roles in different workspaces. Every data operation is scoped to the active workspace; the platform role is separate from workspace membership.

Authorization is deny-by-default and enforced by the application service and database, not just by hiding interface controls. Every record with tenant data carries a workspace identifier. Cross-workspace reads and writes are denied. Sensitive administrative actions and access denials are auditable.

### Data visibility terms

- **Owned**: candidate, task, or activity assigned to the recruiter.
- **Assigned/shared**: a record explicitly assigned or shared with the user for work.
- **Team**: records belonging to the manager's reporting team.
- **Workspace**: all records belonging to that tenant.
- **Platform operations**: workspace lifecycle and service health; no routine access to tenant resumes or candidate content.

Recruiters can search a limited workspace-wide duplicate index so they do not unknowingly create duplicate profiles. Search results for records they do not own or have not been shared are minimized; full candidate details require an authorized assignment, share, or manager action.

## 2. Roles

### Recruiter

Front-line user who works assigned requirements and candidates. The interface should prioritize a simple queue, clear next actions, guided forms, and plain-language errors.

- View assigned requirements, candidate details they own or have access to, their submissions, interviews, evaluation entries, and follow-ups.
- Create candidate records and upload resumes; review and correct extracted fields before saving.
- Search the permitted candidate index, request or claim a candidate for an open requirement, and see an actionable conflict message if another claim exists.
- Run matching for accessible requirements; review evidence and decide whether to proceed.
- Submit a candidate once per requirement, prepare email drafts, schedule or update interviews, record follow-ups, and add permitted collaboration notes.
- Share access to an owned candidate or REC with another active workspace recruiter using an explicit scope; ownership changes only through a separate handoff.
- Cannot approve their own submission, change workspace roles/settings, bulk-export the candidate database, or access another recruiter's private candidate details.

### Recruitment Manager

Runs the recruitment team and oversees the requirement-to-placement pipeline.

- Create, edit, assign, pause, close, and reopen requirements; review JD extraction and matching evidence.
- View team candidate and activity details, resolve duplicate records, reassign candidate/requirement ownership, and review ownership history.
- Review, approve, reject, or return submissions with a reason; cannot silently erase submission history.
- View team interviews, follow-ups, evaluation scorecards, and team-level operational analytics.
- Configure team evaluation rubrics where enabled; cannot manage workspace billing, tenant-wide security, or platform operations.

### Workspace Administrator

Maintains workspace membership and tenant configuration. Administrative access does not imply routine need to inspect candidate content; access to business records is limited to the explicit admin task and is logged where sensitive.

- Invite, deactivate, and change roles of workspace members; configure workspace preferences, retention settings, and approved templates.
- View workspace usage and audit events, and initiate permitted workspace exports subject to export controls.
- Configure workspace-level access and notification defaults when available.
- Cannot access another tenant or use platform-level controls. A workspace must retain at least one active administrator.

### Platform Super Administrator

Internal SEARCHY operator responsible for tenant lifecycle and platform reliability. This is not a customer workspace role.

- Provision, suspend, or restore workspaces; manage service configuration, releases, and aggregate platform health.
- Support access to tenant content is disabled by default. A documented, time-limited, purpose-limited support grant and immutable audit entry are required before access.
- Cannot use ordinary platform operations to alter a customer's candidate, requirement, submission, or interview business data.
- Destructive workspace purge requires a defined retention period, explicit authorization, and an auditable approval process; exact policy requires approval.

## 3. Permission matrix

| Capability | Recruiter | Recruitment Manager | Workspace Administrator | Platform Super Administrator |
| --- | --- | --- | --- | --- |
| View assigned requirements | Own/assigned | Team/workspace | Only as needed for admin | No routine access |
| Create/edit/assign/close requirements | No | Yes | Admin action only | No |
| Add candidate / upload resume | Yes | Yes | Only as needed for admin | No |
| Search duplicate index | Limited results | Workspace | Workspace when needed | No |
| View candidate details | Owned/assigned/shared | Team/workspace | Only as needed for admin | Only under approved support grant |
| Claim/release candidate for requirement | Own claim | Team override | No routine action | No |
| Reassign ownership / merge duplicates | No | Yes, audited | No routine action | No |
| Share access to owned candidate/REC | Yes, scoped | Yes | No routine action | No |
| Create candidate submission | Yes, accessible candidates | Yes | No routine action | No |
| Approve/reject submissions | No | Yes; cannot approve own | No routine action | No |
| Schedule/manage interviews and follow-ups | Own/accessible work | Team/workspace | No routine action | No |
| View analytics | Personal | Team | Workspace usage; business analytics only if explicitly granted | Aggregated platform metrics |
| Invite users / change workspace roles | No | No | Yes | Only documented recovery procedure |
| Workspace settings / audit events | No | No | Yes | Platform settings only; tenant audit access by grant |
| Provision/suspend workspaces | No | No | No | Yes |
| Cross-tenant business data access | No | No | No | No, except approved support grant |

“Only as needed” means the role receives the minimum record scope required for a specific administrative action, not blanket access by virtue of the role.

## 4. Core authorization and lifecycle rules

1. A membership is unique per `(workspace, user)` and has exactly one active workspace role.
2. Role changes take effect immediately for authorization. Existing sessions/tokens must not preserve old privileges; the service revalidates membership or revokes the affected session.
3. Deactivation blocks authentication and terminates active sessions. Historical actions remain attributed to the original actor.
4. On recruiter departure, a manager reviews and reassigns active candidate claims, requirements, pending follow-ups, submissions, and upcoming interviews. Records and audit history are retained; they are not deleted with the user.
5. If the sole workspace administrator leaves, ordinary users cannot elevate themselves. A verified support recovery procedure appoints a replacement and records the reason and approver.
6. Managers cannot approve their own submissions. When a workspace has no eligible independent approver, the item remains pending and is visibly escalated; policy must not silently bypass approval.
7. Workspace administrators and platform operators cannot bypass tenant isolation. Support access is exceptional, explicit, expiring, and auditable.
8. A candidate may have different recruiter owners for different requirements only where workspace policy permits. An active claim for the same candidate and requirement is exclusive.
9. Permission denials return a non-disclosing response: do not reveal another tenant's or unauthorized candidate's existence or identity.

## 5. Main workflows and edge cases

### Claim race

The recruiter requests a claim for a candidate and open requirement. The service performs an atomic claim operation with a database uniqueness/locking guarantee. Exactly one concurrent request can win. The other receives a clear conflict and may request a manager reassignment; it must not overwrite the winning owner.

### Duplicate candidate

Normalize exact email and phone values for workspace-scoped duplicate checks. Exact-match candidates are presented as potential existing records before creation. Name similarity is a warning signal, not proof; do not auto-merge people or expose unauthorized profile details. A manager resolves a confirmed duplicate while preserving source and activity history.

### Requirement closure

Closing a requirement requires a reason. Active claims, drafts, submissions, interviews, and follow-ups are surfaced for review. Closure stops new claims/submissions but does not erase existing activity. The manager chooses to complete, withdraw, cancel, or reassign each open item. Reopening retains the same history.

### Interview rescheduling

Changing time creates a new schedule revision, retains the previous time and actor, updates the current status, and creates a follow-up/notification task for relevant participants. No external calendar or email invite is assumed in MVP.

### Recruiter departure

Deactivate access immediately, then give managers a visible reassignment queue covering all active work. Historical events remain attributable to the former user. Items are never silently dropped or auto-assigned to an arbitrary recruiter.

## 6. Authentication and audit baseline

The implementation must use secure, established authentication and password hashing, support MFA for privileged accounts, protect sessions against role changes and deactivation, and apply rate limits to authentication and sensitive operations. Exact password, session, MFA, and retention values are deployment/security decisions, not assumed contractual promises in this product draft.

Audit events should record actor, workspace, action, entity reference, timestamp, outcome, and request correlation identifier. Avoid copying resume text, credentials, or unnecessary personal data into audit logs. Logs are access-controlled, tamper-resistant, and retained according to the approved retention policy.

---

*End of SEARCHY User Roles and Permissions.*
