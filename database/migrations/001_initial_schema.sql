-- SEARCHY initial tenant-scoped schema.
-- Supabase provides auth.users, auth.uid(), storage.objects and the storage schema.

CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(btrim(name)) > 0),
  slug text NOT NULL UNIQUE CHECK (slug = lower(slug) AND slug ~ '^[a-z0-9-]+$'),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'deleted')),
  timezone text NOT NULL DEFAULT 'UTC',
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL
);

CREATE TABLE public.organization_members (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  role text NOT NULL CHECK (role IN ('recruiter', 'manager', 'workspace_admin')),
  status text NOT NULL DEFAULT 'invited'
    CHECK (status IN ('invited', 'active', 'deactivated')),
  invited_by uuid NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz NULL,
  deactivated_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id),
  CHECK (
    (status = 'active' AND deactivated_at IS NULL)
    OR status <> 'active'
  )
);

CREATE INDEX idx_organization_members_user_status
  ON public.organization_members (user_id, status);
CREATE INDEX idx_organization_members_org_role_status
  ON public.organization_members (organization_id, role, status);

CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (length(btrim(name)) > 0),
  external_reference text NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, created_by)
    REFERENCES public.organization_members (organization_id, user_id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX uq_clients_org_name_active
  ON public.clients (organization_id, lower(name))
  WHERE deleted_at IS NULL;
CREATE INDEX idx_clients_org_status_name
  ON public.clients (organization_id, status, name);

CREATE TABLE public.requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  client_id uuid NOT NULL,
  title text NOT NULL CHECK (length(btrim(title)) > 0),
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'open', 'paused', 'closed')),
  locations text[] NOT NULL DEFAULT '{}',
  employment_type text NULL,
  min_experience_years numeric(5,2) NULL CHECK (min_experience_years >= 0),
  max_experience_years numeric(5,2) NULL CHECK (max_experience_years >= 0),
  openings integer NOT NULL DEFAULT 1 CHECK (openings > 0),
  salary_min numeric(12,2) NULL CHECK (salary_min >= 0),
  salary_max numeric(12,2) NULL CHECK (salary_max >= 0),
  salary_currency char(3) NULL,
  priority text NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  target_date date NULL,
  close_reason text NULL,
  extracted_jd jsonb NOT NULL DEFAULT '{}'::jsonb,
  jd_version integer NOT NULL DEFAULT 1 CHECK (jd_version > 0),
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, client_id)
    REFERENCES public.clients (organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, created_by)
    REFERENCES public.organization_members (organization_id, user_id) ON DELETE RESTRICT,
  CHECK (min_experience_years IS NULL OR max_experience_years IS NULL
    OR min_experience_years <= max_experience_years),
  CHECK (salary_min IS NULL OR salary_max IS NULL OR salary_min <= salary_max),
  CHECK (status <> 'open' OR length(btrim(description)) > 0),
  CHECK (salary_currency IS NULL OR salary_currency ~ '^[A-Z]{3}$')
);

CREATE INDEX idx_requirements_org_status_target
  ON public.requirements (organization_id, status, target_date)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_requirements_org_client
  ON public.requirements (organization_id, client_id);
CREATE INDEX idx_requirements_locations
  ON public.requirements USING gin (locations);

CREATE TABLE public.requirement_assignments (
  organization_id uuid NOT NULL,
  requirement_id uuid NOT NULL,
  user_id uuid NOT NULL,
  assigned_by uuid NOT NULL DEFAULT auth.uid(),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  unassigned_at timestamptz NULL,
  PRIMARY KEY (organization_id, requirement_id, user_id),
  FOREIGN KEY (organization_id, requirement_id)
    REFERENCES public.requirements (organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, user_id)
    REFERENCES public.organization_members (organization_id, user_id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, assigned_by)
    REFERENCES public.organization_members (organization_id, user_id) ON DELETE RESTRICT
);

CREATE INDEX idx_requirement_assignments_active_user
  ON public.requirement_assignments (organization_id, user_id, requirement_id)
  WHERE unassigned_at IS NULL;

CREATE TABLE public.candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  full_name text NOT NULL CHECK (length(btrim(full_name)) > 0),
  normalized_email text NULL,
  phone text NULL,
  current_title text NULL,
  total_experience_years numeric(5,2) NULL CHECK (total_experience_years >= 0),
  locations text[] NOT NULL DEFAULT '{}',
  source text NULL,
  consent_status text NULL
    CHECK (consent_status IS NULL OR consent_status IN ('unknown', 'granted', 'withdrawn', 'not_required')),
  consent_recorded_at timestamptz NULL,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz NULL,
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, created_by)
    REFERENCES public.organization_members (organization_id, user_id) ON DELETE RESTRICT,
  CHECK (normalized_email IS NULL OR normalized_email = lower(btrim(normalized_email)))
);

CREATE UNIQUE INDEX uq_candidates_org_email_active
  ON public.candidates (organization_id, normalized_email)
  WHERE normalized_email IS NOT NULL AND archived_at IS NULL;
CREATE INDEX idx_candidates_org_created
  ON public.candidates (organization_id, archived_at, created_at DESC);
CREATE INDEX idx_candidates_locations
  ON public.candidates USING gin (locations);

CREATE TABLE public.resumes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  candidate_id uuid NOT NULL,
  storage_path text NOT NULL UNIQUE,
  original_filename text NOT NULL,
  content_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes > 0),
  sha256 text NULL CHECK (sha256 IS NULL OR sha256 ~ '^[a-f0-9]{64}$'),
  processing_status text NOT NULL DEFAULT 'uploaded'
    CHECK (processing_status IN ('uploaded', 'queued', 'processing', 'review_ready', 'failed', 'deleted')),
  extracted_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  parser_version text NULL,
  uploaded_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL,
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, candidate_id)
    REFERENCES public.candidates (organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, uploaded_by)
    REFERENCES public.organization_members (organization_id, user_id) ON DELETE RESTRICT
);

CREATE INDEX idx_resumes_org_candidate_created
  ON public.resumes (organization_id, candidate_id, created_at DESC);
CREATE INDEX idx_resumes_org_status_created
  ON public.resumes (organization_id, processing_status, created_at);
CREATE UNIQUE INDEX uq_resumes_org_sha_active
  ON public.resumes (organization_id, sha256)
  WHERE sha256 IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE public.skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (length(btrim(name)) > 0),
  normalized_name text NOT NULL CHECK (normalized_name = lower(btrim(normalized_name))),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, normalized_name)
);

CREATE TABLE public.candidate_skills (
  organization_id uuid NOT NULL,
  candidate_id uuid NOT NULL,
  skill_id uuid NOT NULL,
  proficiency text NULL,
  years_experience numeric(5,2) NULL CHECK (years_experience >= 0),
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, candidate_id, skill_id),
  FOREIGN KEY (organization_id, candidate_id)
    REFERENCES public.candidates (organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, skill_id)
    REFERENCES public.skills (organization_id, id) ON DELETE RESTRICT
);

CREATE INDEX idx_candidate_skills_org_skill
  ON public.candidate_skills (organization_id, skill_id, candidate_id);

CREATE TABLE public.requirement_skills (
  organization_id uuid NOT NULL,
  requirement_id uuid NOT NULL,
  skill_id uuid NOT NULL,
  importance text NOT NULL CHECK (importance IN ('required', 'preferred')),
  weight numeric(5,2) NOT NULL DEFAULT 1 CHECK (weight > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, requirement_id, skill_id),
  FOREIGN KEY (organization_id, requirement_id)
    REFERENCES public.requirements (organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, skill_id)
    REFERENCES public.skills (organization_id, id) ON DELETE RESTRICT
);

CREATE INDEX idx_requirement_skills_org_skill
  ON public.requirement_skills (organization_id, skill_id, importance);

CREATE TABLE public.candidate_ownership (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  candidate_id uuid NOT NULL,
  requirement_id uuid NOT NULL,
  recruiter_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'released', 'expired', 'reassigned')),
  reserved_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  released_at timestamptz NULL,
  released_by uuid NULL,
  release_reason text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, candidate_id)
    REFERENCES public.candidates (organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, requirement_id)
    REFERENCES public.requirements (organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, recruiter_id)
    REFERENCES public.organization_members (organization_id, user_id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, released_by)
    REFERENCES public.organization_members (organization_id, user_id) ON DELETE RESTRICT,
  CHECK (expires_at > reserved_at),
  CHECK ((status = 'active') = (released_at IS NULL))
);

CREATE UNIQUE INDEX uq_candidate_ownership_active_workflow
  ON public.candidate_ownership (organization_id, candidate_id, requirement_id)
  WHERE status = 'active' AND released_at IS NULL;
CREATE INDEX idx_candidate_ownership_recruiter
  ON public.candidate_ownership (organization_id, recruiter_id, status, expires_at);

CREATE TABLE public.ownership_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  ownership_id uuid NOT NULL,
  candidate_id uuid NOT NULL,
  requirement_id uuid NOT NULL,
  actor_id uuid NULL,
  previous_recruiter_id uuid NULL,
  new_recruiter_id uuid NULL,
  action text NOT NULL CHECK (action IN ('reserved', 'renewed', 'released', 'expired', 'reassigned')),
  reason text NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, ownership_id)
    REFERENCES public.candidate_ownership (organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, candidate_id)
    REFERENCES public.candidates (organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, requirement_id)
    REFERENCES public.requirements (organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, actor_id)
    REFERENCES public.organization_members (organization_id, user_id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, previous_recruiter_id)
    REFERENCES public.organization_members (organization_id, user_id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, new_recruiter_id)
    REFERENCES public.organization_members (organization_id, user_id) ON DELETE RESTRICT
);

CREATE INDEX idx_ownership_history_candidate
  ON public.ownership_history (organization_id, candidate_id, occurred_at DESC);
CREATE INDEX idx_ownership_history_ownership
  ON public.ownership_history (organization_id, ownership_id, occurred_at);

CREATE TABLE public.candidate_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  candidate_id uuid NOT NULL,
  shared_with uuid NOT NULL,
  shared_by uuid NOT NULL DEFAULT auth.uid(),
  scope text NOT NULL CHECK (scope IN ('profile', 'resume')),
  expires_at timestamptz NULL,
  revoked_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, candidate_id)
    REFERENCES public.candidates (organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, shared_with)
    REFERENCES public.organization_members (organization_id, user_id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, shared_by)
    REFERENCES public.organization_members (organization_id, user_id) ON DELETE RESTRICT
);

CREATE INDEX idx_candidate_shares_active
  ON public.candidate_shares (organization_id, shared_with, candidate_id)
  WHERE revoked_at IS NULL;

CREATE TABLE public.candidate_access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  candidate_id uuid NOT NULL,
  granted_to uuid NOT NULL,
  granted_by uuid NOT NULL DEFAULT auth.uid(),
  purpose text NOT NULL CHECK (length(btrim(purpose)) > 0),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, candidate_id)
    REFERENCES public.candidates (organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, granted_to)
    REFERENCES public.organization_members (organization_id, user_id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, granted_by)
    REFERENCES public.organization_members (organization_id, user_id) ON DELETE RESTRICT
);

CREATE INDEX idx_candidate_access_grants_active
  ON public.candidate_access_grants (organization_id, granted_to, expires_at)
  WHERE revoked_at IS NULL;

CREATE TABLE public.submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  candidate_id uuid NOT NULL,
  requirement_id uuid NOT NULL,
  submitted_by uuid NOT NULL DEFAULT auth.uid(),
  status text NOT NULL DEFAULT 'pending_review'
    CHECK (status IN (
      'pending_review', 'returned', 'approved', 'sent_to_client',
      'interviewing', 'offered', 'joined', 'rejected', 'withdrawn'
    )),
  cover_note text NULL,
  decision_reason text NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, candidate_id, requirement_id),
  FOREIGN KEY (organization_id, candidate_id)
    REFERENCES public.candidates (organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, requirement_id)
    REFERENCES public.requirements (organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, submitted_by)
    REFERENCES public.organization_members (organization_id, user_id) ON DELETE RESTRICT
);

CREATE INDEX idx_submissions_requirement_status
  ON public.submissions (organization_id, requirement_id, status, submitted_at DESC);
CREATE INDEX idx_submissions_candidate
  ON public.submissions (organization_id, candidate_id, submitted_at DESC);

CREATE TABLE public.interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  submission_id uuid NOT NULL,
  interview_type text NOT NULL
    CHECK (interview_type IN ('phone', 'video', 'in_person', 'technical', 'other')),
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  timezone text NOT NULL,
  location_or_link text NULL,
  participants jsonb NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(participants) = 'array'),
  reschedule_reason text NULL,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, submission_id)
    REFERENCES public.submissions (organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, created_by)
    REFERENCES public.organization_members (organization_id, user_id) ON DELETE RESTRICT,
  CHECK (ends_at > starts_at)
);

CREATE INDEX idx_interviews_org_schedule
  ON public.interviews (organization_id, starts_at, status);
CREATE INDEX idx_interviews_submission
  ON public.interviews (organization_id, submission_id, starts_at);

CREATE TABLE public.interview_schedule_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  interview_id uuid NOT NULL,
  actor_id uuid NULL,
  old_starts_at timestamptz NOT NULL,
  old_ends_at timestamptz NOT NULL,
  old_timezone text NOT NULL,
  new_starts_at timestamptz NOT NULL,
  new_ends_at timestamptz NOT NULL,
  new_timezone text NOT NULL,
  reason text NOT NULL CHECK (length(btrim(reason)) > 0),
  changed_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, interview_id)
    REFERENCES public.interviews (organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, actor_id)
    REFERENCES public.organization_members (organization_id, user_id) ON DELETE RESTRICT
);

CREATE INDEX idx_interview_schedule_history
  ON public.interview_schedule_history (organization_id, interview_id, changed_at DESC);

CREATE TABLE public.interview_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  requirement_id uuid NULL,
  question text NOT NULL CHECK (length(btrim(question)) > 0),
  criterion text NOT NULL CHECK (length(btrim(criterion)) > 0),
  min_score integer NOT NULL DEFAULT 1,
  max_score integer NOT NULL DEFAULT 5,
  anchors jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, requirement_id)
    REFERENCES public.requirements (organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, created_by)
    REFERENCES public.organization_members (organization_id, user_id) ON DELETE RESTRICT,
  CHECK (max_score > min_score)
);

CREATE INDEX idx_interview_questions_requirement
  ON public.interview_questions (organization_id, requirement_id, active);

CREATE TABLE public.interview_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  interview_id uuid NOT NULL,
  evaluator_id uuid NOT NULL DEFAULT auth.uid(),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  recommendation text NULL
    CHECK (recommendation IS NULL OR recommendation IN ('strong_yes', 'yes', 'mixed', 'no', 'strong_no')),
  summary text NULL,
  submitted_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, interview_id, evaluator_id, version),
  FOREIGN KEY (organization_id, interview_id)
    REFERENCES public.interviews (organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, evaluator_id)
    REFERENCES public.organization_members (organization_id, user_id) ON DELETE RESTRICT,
  CHECK ((status = 'submitted') = (submitted_at IS NOT NULL))
);

CREATE INDEX idx_evaluations_interview
  ON public.interview_evaluations (organization_id, interview_id, status);
CREATE UNIQUE INDEX uq_evaluations_one_draft
  ON public.interview_evaluations (organization_id, interview_id, evaluator_id)
  WHERE status = 'draft';
CREATE INDEX idx_evaluations_evaluator
  ON public.interview_evaluations (organization_id, evaluator_id, submitted_at DESC);

CREATE TABLE public.interview_evaluation_scores (
  organization_id uuid NOT NULL,
  evaluation_id uuid NOT NULL,
  question_id uuid NOT NULL,
  score integer NOT NULL,
  evidence text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, evaluation_id, question_id),
  FOREIGN KEY (organization_id, evaluation_id)
    REFERENCES public.interview_evaluations (organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, question_id)
    REFERENCES public.interview_questions (organization_id, id) ON DELETE RESTRICT
);

CREATE INDEX idx_evaluation_scores_question
  ON public.interview_evaluation_scores (organization_id, question_id);

CREATE TABLE public.followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  owner_id uuid NOT NULL,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  candidate_id uuid NULL,
  requirement_id uuid NULL,
  submission_id uuid NULL,
  interview_id uuid NULL,
  title text NOT NULL CHECK (length(btrim(title)) > 0),
  description text NULL,
  due_at timestamptz NOT NULL,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'completed', 'cancelled')),
  completed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, owner_id)
    REFERENCES public.organization_members (organization_id, user_id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, created_by)
    REFERENCES public.organization_members (organization_id, user_id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, candidate_id)
    REFERENCES public.candidates (organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, requirement_id)
    REFERENCES public.requirements (organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, submission_id)
    REFERENCES public.submissions (organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, interview_id)
    REFERENCES public.interviews (organization_id, id) ON DELETE RESTRICT,
  CHECK (num_nonnulls(candidate_id, requirement_id, submission_id, interview_id) = 1),
  CHECK ((status = 'completed') = (completed_at IS NOT NULL))
);

CREATE INDEX idx_followups_owner_due
  ON public.followups (organization_id, owner_id, status, due_at);
CREATE INDEX idx_followups_open_due
  ON public.followups (organization_id, due_at)
  WHERE status = 'open';

CREATE TABLE public.communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  candidate_id uuid NULL,
  requirement_id uuid NULL,
  submission_id uuid NULL,
  kind text NOT NULL CHECK (kind IN ('email_draft', 'note')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'copied', 'archived')),
  recipient text NULL,
  subject text NULL,
  body text NOT NULL,
  template_key text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, created_by)
    REFERENCES public.organization_members (organization_id, user_id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, candidate_id)
    REFERENCES public.candidates (organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, requirement_id)
    REFERENCES public.requirements (organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, submission_id)
    REFERENCES public.submissions (organization_id, id) ON DELETE RESTRICT
);

CREATE INDEX idx_communications_creator
  ON public.communications (organization_id, created_by, updated_at DESC);
CREATE INDEX idx_communications_candidate
  ON public.communications (organization_id, candidate_id, updated_at DESC)
  WHERE candidate_id IS NOT NULL;

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  recipient_id uuid NOT NULL,
  kind text NOT NULL,
  title text NOT NULL,
  body text NULL,
  entity_type text NULL,
  entity_id uuid NULL,
  read_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, recipient_id)
    REFERENCES public.organization_members (organization_id, user_id) ON DELETE RESTRICT
);

CREATE INDEX idx_notifications_inbox
  ON public.notifications (organization_id, recipient_id, read_at, created_at DESC);

CREATE TABLE public.processing_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  job_type text NOT NULL CHECK (job_type IN ('parse_resume', 'import_spreadsheet')),
  resume_id uuid NULL,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  idempotency_key text NOT NULL,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  run_after timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz NULL,
  locked_by text NULL,
  last_error_code text NULL,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, resume_id)
    REFERENCES public.resumes (organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, created_by)
    REFERENCES public.organization_members (organization_id, user_id) ON DELETE RESTRICT,
  UNIQUE (organization_id, job_type, idempotency_key)
);

CREATE INDEX idx_processing_jobs_ready
  ON public.processing_jobs (status, run_after)
  WHERE status IN ('queued', 'running');
CREATE INDEX idx_processing_jobs_resume
  ON public.processing_jobs (organization_id, resume_id)
  WHERE resume_id IS NOT NULL;

CREATE TABLE public.matching_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  requirement_id uuid NOT NULL,
  requested_by uuid NOT NULL DEFAULT auth.uid(),
  algorithm_version text NOT NULL,
  input_fingerprint text NOT NULL,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'succeeded', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz NULL,
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, requirement_id)
    REFERENCES public.requirements (organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, requested_by)
    REFERENCES public.organization_members (organization_id, user_id) ON DELETE RESTRICT
);

CREATE INDEX idx_matching_runs_requirement
  ON public.matching_runs (organization_id, requirement_id, created_at DESC);

CREATE TABLE public.matching_results (
  organization_id uuid NOT NULL,
  run_id uuid NOT NULL,
  candidate_id uuid NOT NULL,
  rank integer NOT NULL CHECK (rank > 0),
  score numeric(6,3) NOT NULL CHECK (score >= 0 AND score <= 100),
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, run_id, candidate_id),
  UNIQUE (organization_id, run_id, rank),
  FOREIGN KEY (organization_id, run_id)
    REFERENCES public.matching_runs (organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, candidate_id)
    REFERENCES public.candidates (organization_id, id) ON DELETE RESTRICT
);

CREATE INDEX idx_matching_results_candidate
  ON public.matching_results (organization_id, candidate_id);

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  actor_id uuid NULL DEFAULT auth.uid(),
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid NULL,
  outcome text NOT NULL CHECK (outcome IN ('success', 'denied')),
  request_id uuid NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, actor_id)
    REFERENCES public.organization_members (organization_id, user_id) ON DELETE RESTRICT
);

CREATE INDEX idx_audit_logs_org_time
  ON public.audit_logs (organization_id, created_at DESC);
CREATE INDEX idx_audit_logs_actor_time
  ON public.audit_logs (organization_id, actor_id, created_at DESC);
CREATE INDEX idx_audit_logs_target_time
  ON public.audit_logs (organization_id, target_type, target_id, created_at DESC);

CREATE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'organizations', 'organization_members', 'clients', 'requirements',
    'candidates', 'resumes', 'candidate_ownership', 'submissions',
    'interviews', 'interview_evaluations', 'followups', 'communications',
    'processing_jobs'
  ]
  LOOP
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
      'trg_' || table_name || '_updated_at',
      table_name
    );
  END LOOP;
END;
$$;
