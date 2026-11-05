# SEARCHY — Entity Relationship Diagram

The diagram omits some audit and lifecycle columns for readability. All tenant-owned records use `organization_id`; composite tenant foreign keys are defined in the migrations.

```mermaid
erDiagram
  AUTH_USERS ||--o{ ORGANIZATION_MEMBERS : joins
  ORGANIZATIONS ||--o{ ORGANIZATION_MEMBERS : has
  ORGANIZATIONS ||--o{ CLIENTS : owns
  ORGANIZATIONS ||--o{ REQUIREMENTS : owns
  CLIENTS ||--o{ REQUIREMENTS : requests
  REQUIREMENTS ||--o{ REQUIREMENT_ASSIGNMENTS : assigned
  ORGANIZATION_MEMBERS ||--o{ REQUIREMENT_ASSIGNMENTS : works
  ORGANIZATIONS ||--o{ CANDIDATES : owns
  AUTH_USERS ||--o{ CANDIDATES : creates
  CANDIDATES ||--o{ RESUMES : has
  CANDIDATES ||--o{ CANDIDATE_SKILLS : tagged
  SKILLS ||--o{ CANDIDATE_SKILLS : labels
  REQUIREMENTS ||--o{ REQUIREMENT_SKILLS : needs
  SKILLS ||--o{ REQUIREMENT_SKILLS : labels
  CANDIDATES ||--o{ CANDIDATE_OWNERSHIP : reserved
  REQUIREMENTS ||--o{ CANDIDATE_OWNERSHIP : for_requirement
  AUTH_USERS ||--o{ CANDIDATE_OWNERSHIP : owns
  CANDIDATE_OWNERSHIP ||--o{ OWNERSHIP_HISTORY : history
  CANDIDATES ||--o{ CANDIDATE_SHARES : shared
  SUBMISSIONS ||--o{ INTERVIEWS : schedules
  INTERVIEWS ||--o{ INTERVIEW_SCHEDULE_HISTORY : rescheduled
  CANDIDATES ||--o{ SUBMISSIONS : submitted
  REQUIREMENTS ||--o{ SUBMISSIONS : receives
  SUBMISSIONS ||--o{ FOLLOWUPS : followed_by
  INTERVIEWS ||--o{ FOLLOWUPS : followed_by
  INTERVIEWS ||--o{ INTERVIEW_EVALUATIONS : evaluated
  INTERVIEW_QUESTIONS ||--o{ INTERVIEW_EVALUATION_SCORES : scored
  INTERVIEW_EVALUATIONS ||--o{ INTERVIEW_EVALUATION_SCORES : contains
  ORGANIZATIONS ||--o{ COMMUNICATIONS : stores
  ORGANIZATIONS ||--o{ NOTIFICATIONS : sends
  ORGANIZATIONS ||--o{ AUDIT_LOGS : records
  ORGANIZATIONS ||--o{ PROCESSING_JOBS : queues

  ORGANIZATIONS {
    uuid id PK
    text name
    text slug UK
    text status
    timestamptz created_at
  }
  ORGANIZATION_MEMBERS {
    uuid organization_id PK, FK
    uuid user_id PK, FK
    text role
    text status
  }
  CLIENTS {
    uuid id PK
    uuid organization_id FK
    text name
    text status
  }
  REQUIREMENTS {
    uuid id PK
    uuid organization_id FK
    uuid client_id FK
    text title
    text status
    uuid created_by FK
  }
  CANDIDATES {
    uuid id PK
    uuid organization_id FK
    text full_name
    text normalized_email
    uuid created_by FK
  }
  RESUMES {
    uuid id PK
    uuid organization_id FK
    uuid candidate_id FK
    text storage_path UK
    text processing_status
  }
  SKILLS {
    uuid id PK
    uuid organization_id FK
    text normalized_name
  }
  CANDIDATE_OWNERSHIP {
    uuid id PK
    uuid organization_id FK
    uuid candidate_id FK
    uuid requirement_id FK
    uuid recruiter_id FK
    timestamptz expires_at
    timestamptz released_at
  }
  SUBMISSIONS {
    uuid id PK
    uuid organization_id FK
    uuid candidate_id FK
    uuid requirement_id FK
    text status
  }
  INTERVIEWS {
    uuid id PK
    uuid organization_id FK
    uuid submission_id FK
    timestamptz starts_at
    text status
  }
  INTERVIEW_SCHEDULE_HISTORY {
    uuid id PK
    uuid organization_id FK
    uuid interview_id FK
    uuid actor_id FK
    timestamptz old_starts_at
    timestamptz new_starts_at
    text reason
  }
  FOLLOWUPS {
    uuid id PK
    uuid organization_id FK
    uuid owner_id FK
    uuid submission_id FK
    uuid interview_id FK
    timestamptz due_at
    text status
  }
  INTERVIEW_EVALUATIONS {
    uuid id PK
    uuid organization_id FK
    uuid interview_id FK
    uuid evaluator_id FK
    text status
  }
  INTERVIEW_QUESTIONS {
    uuid id PK
    uuid organization_id FK
    uuid requirement_id FK
    text question
  }
  COMMUNICATIONS {
    uuid id PK
    uuid organization_id FK
    uuid created_by FK
    text kind
    text status
  }
  NOTIFICATIONS {
    uuid id PK
    uuid organization_id FK
    uuid recipient_id FK
    timestamptz read_at
  }
  AUDIT_LOGS {
    uuid id PK
    uuid organization_id FK
    uuid actor_id FK
    text action
    jsonb metadata
  }
  PROCESSING_JOBS {
    uuid id PK
    uuid organization_id FK
    uuid resume_id FK
    text job_type
    text status
  }
```

`AUTH_USERS` is Supabase's managed `auth.users` table and is not created by SEARCHY migrations. Several entity references are omitted to keep the view legible; see [DATABASE_DESIGN.md](./DATABASE_DESIGN.md).
