# SEARCHY — UI Specification

| Field | Value |
| --- | --- |
| Version | 1.0.0 |
| Status | Frontend prototype |
| Scope | Responsive React application shell and synthetic-data screens |

## 1. Design system

SEARCHY uses a light, premium enterprise workspace: a white navigation shell on a soft slate canvas, deep navy text, restrained blue accents, subtle borders, rounded cards, and compact information hierarchy. Typography uses the system sans-serif stack. Lucide icons are used consistently for navigation and actions.

The interface supports desktop, tablet, and mobile layouts; keyboard focus is visible; dialogs use accessible Radix primitives; status is conveyed with text as well as color; and reduced-motion preferences are respected. Candidate data shown in the prototype is synthetic.

## 2. Application routes and screens

| Screen | Route | Main content and interactions |
| --- | --- | --- |
| Login | `/login` | Email/password validation, simulated demo entry, sample credentials, password-reset notice, and explicit unauthenticated-prototype disclosure. |
| Dashboard | `/` | Four recruitment KPIs, pipeline chart, recent activity, active requirements, today's interviews, pending follow-ups, and prominent create-requirement CTA. |
| Requirements list | `/requirements` | Search, status tabs/filters, sortable table, pagination affordances, export-to-print, and new-requirement navigation. |
| Create requirement | `/requirements/new` | React Hook Form and Zod validation for role overview, client, location, experience, openings, priority, and job description; suggested skills populate the local form; submission is local-only. |
| Requirement details | `/requirements/:requirementId` | REC overview, progress, team, candidate-match preview, and Overview/Candidates/Submissions/Activity tabs. |
| REC intelligence | `/requirements/:requirementId/intelligence` | Structured must-have/nice-to-have criteria, source/suggestion evidence, readiness score, and clarification questions. |
| Candidate discovery | `/candidates/discover` | Candidate search, filter panel, criteria-based synthetic fit evidence, selectable cards, profile links, and comparison navigation. |
| Candidate database | `/candidates` | Searchable/filterable sortable synthetic directory, profile navigation, local file selection, and candidate actions. |
| Candidate profile | `/candidates/:candidateId` | Synthetic professional summary, skills, contact/provenance, ownership scope, submissions, and activity. |
| AI candidate matching | `/matching` | Requirement selector, sample match results, criterion coverage, fit explanation, and profile/review/compare actions. |
| Candidate comparison | `/matching/compare` | Side-by-side criteria evidence and unknowns with explicit human-decision notice. |
| Submission management | `/submissions` | Pipeline KPIs, status tabs, searchable sortable queue, and review/action menus. |
| Interview calendar | `/interviews` | Week/agenda toggle, selectable sample dates, timezone context, internal interview agenda, and schedule/reschedule affordances. |
| Follow-up management | `/followups` | Open/completed views, filters, task completion toggle, owner/due/priority, and reassignment affordances. |
| Communication centre | `/communications` | Email draft and template views, local draft composition, edit, copy-to-clipboard, and no-send boundary. |
| Technical interview intelligence | `/interview-intelligence` | Role-oriented interview kits and structured scorecard entry point. |
| Question bank | `/interview-intelligence/questions` | Searchable and category-filtered synthetic question list; kit/question actions. |
| Technical evaluation scorecard | `/interview-intelligence/scorecard` | Job-related rubric scores, evidence notes, computed local average, recommendation, and local-draft affordances. |
| Manager dashboard | `/manager` | Manager-only navigation entry; team workload, pipeline, attention queue, and synthetic team insight. |
| Analytics | `/analytics` | Pipeline chart, conversion/throughput KPIs, client/team views, attention table, and print export. |
| Workspace settings | `/settings` | Workspace preferences, notification switches, security disclosure, and role-based settings navigation. |
| Admin settings | `/admin` | Workspace-member table and member action affordances for the Workspace Administrator demo role. |

The interview schedule and the communication center are internal-only. No calendar invitation, email sending, recruitment-platform integration, or external AI service is represented.

## 3. Navigation and role presentation

The collapsible sidebar exposes the product modules and hides links outside the selected demo role:

- Recruiter: Dashboard, Requirements, Candidates, AI Matching, Submissions, Interviews, Follow-ups, Communication, and Interview Intelligence.
- Recruitment Manager: recruiter modules plus Analytics, Settings, and Manager overview.
- Workspace Admin: Dashboard, Analytics, Settings, and Admin console. The admin dashboard is limited to aggregate workspace/member information; this role does not receive recruiter candidate-detail navigation or candidate/REC global-search results.

The top bar contains breadcrumbs, global synthetic-record search (`Cmd/Ctrl+K` visual affordance), notifications, and a profile menu. The profile menu's demo-role switch is only a UI preview; it is not an authorization control. Real authorization must come from Supabase Auth and PostgreSQL RLS.

Platform Super Administrator is intentionally outside this tenant-workspace prototype. It is a separate SaaS control-plane surface and must not be added as a tenant role switch or given cross-tenant access through this UI.

## 4. Component structure

```text
src/
  App.tsx                         Route table and prototype toast viewport
  main.tsx                        React root, React Router, TanStack Query provider
  index.css                       Design tokens, responsive styles, shared UI states
  components/
    layout.tsx                    Sidebar, top bar, role menu, global search, notifications
    ui.tsx                        Button, Card, Field, inputs, badge, avatar, dropdown,
                                  modal, sortable table, tabs, search, upload, checkbox,
                                  skeleton
  lib/
    app-context.tsx               Demo role and local toast context
    data.ts                       Synthetic records, navigation metadata, chart series
  pages.tsx                       Login, dashboard, requirements, candidate, matching,
                                  submissions, interviews, follow-ups, communication,
                                  interview intelligence, analytics, settings screens
```

Reusable UI elements use local shadcn/ui conventions and Radix primitives for accessible Dialog and Dropdown behavior. `components.json` records the shadcn/ui project aliases and New York style. Shared form controls use React Hook Form and Zod where validation is required.

## 5. Prototype interaction boundaries

Search, tabs, sorting, filters, modal visibility, client-side form validation, sample navigation, comparison selection, score selection, notification menus, demo role switching, and task checkboxes work locally in the browser. Toast messages explicitly distinguish local prototype changes from server persistence.

The resume picker only selects a local file; it does not upload, parse, or store it. Email drafts are held in page memory and can be copied to the clipboard but are never sent. "Create requirement" validates its form and displays a local prototype notice; it does not call Supabase. Other actions that depend on reservations, approval, role changes, exports, or business-record persistence are informational affordances, not fake API calls.

TanStack Query is configured at the application root for later service integration. No Supabase credentials, client, backend integration, remote data requests, or fake success response is included in this phase.

## 6. Future integration requirements

When a backend is connected, replace synthetic fixtures and local state with typed service operations consistent with [API_CONTRACTS.md](./API_CONTRACTS.md). Preserve tenant scoping, RLS-denied states, accessible empty/loading/error views, candidate ownership conflicts, explicit workflow transitions, and the human-review requirements documented in [SECURITY_DESIGN.md](./SECURITY_DESIGN.md). The demo role selector must be removed or clearly isolated from production authorization.
