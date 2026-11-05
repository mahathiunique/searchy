-- Preserve tenant identity/history and keep a workspace recoverable.

CREATE FUNCTION public.prevent_identity_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  old_data jsonb := to_jsonb(OLD);
  new_data jsonb := to_jsonb(NEW);
BEGIN
  IF (old_data ? 'id' AND old_data -> 'id' IS DISTINCT FROM new_data -> 'id')
     OR (old_data ? 'organization_id'
         AND old_data -> 'organization_id' IS DISTINCT FROM new_data -> 'organization_id') THEN
    RAISE EXCEPTION 'row_identity_is_immutable'
      USING ERRCODE = '42501';
  END IF;

  CASE TG_TABLE_NAME
    WHEN 'organization_members' THEN
      IF old_data -> 'user_id' IS DISTINCT FROM new_data -> 'user_id' THEN
        RAISE EXCEPTION 'membership_identity_is_immutable' USING ERRCODE = '42501';
      END IF;
    WHEN 'clients' THEN
      IF old_data -> 'created_by' IS DISTINCT FROM new_data -> 'created_by' THEN
        RAISE EXCEPTION 'creator_is_immutable' USING ERRCODE = '42501';
      END IF;
    WHEN 'requirements' THEN
      IF old_data -> 'created_by' IS DISTINCT FROM new_data -> 'created_by' THEN
        RAISE EXCEPTION 'creator_is_immutable' USING ERRCODE = '42501';
      END IF;
    WHEN 'candidates' THEN
      IF old_data -> 'created_by' IS DISTINCT FROM new_data -> 'created_by' THEN
        RAISE EXCEPTION 'creator_is_immutable' USING ERRCODE = '42501';
      END IF;
    WHEN 'resumes' THEN
      IF old_data -> 'candidate_id' IS DISTINCT FROM new_data -> 'candidate_id'
         OR old_data -> 'storage_path' IS DISTINCT FROM new_data -> 'storage_path'
         OR old_data -> 'uploaded_by' IS DISTINCT FROM new_data -> 'uploaded_by' THEN
        RAISE EXCEPTION 'resume_identity_is_immutable' USING ERRCODE = '42501';
      END IF;
    WHEN 'requirement_assignments' THEN
      IF old_data -> 'requirement_id' IS DISTINCT FROM new_data -> 'requirement_id'
         OR old_data -> 'user_id' IS DISTINCT FROM new_data -> 'user_id'
         OR old_data -> 'assigned_by' IS DISTINCT FROM new_data -> 'assigned_by' THEN
        RAISE EXCEPTION 'assignment_identity_is_immutable' USING ERRCODE = '42501';
      END IF;
    WHEN 'candidate_skills' THEN
      IF old_data -> 'candidate_id' IS DISTINCT FROM new_data -> 'candidate_id'
         OR old_data -> 'skill_id' IS DISTINCT FROM new_data -> 'skill_id' THEN
        RAISE EXCEPTION 'skill_link_identity_is_immutable' USING ERRCODE = '42501';
      END IF;
    WHEN 'requirement_skills' THEN
      IF old_data -> 'requirement_id' IS DISTINCT FROM new_data -> 'requirement_id'
         OR old_data -> 'skill_id' IS DISTINCT FROM new_data -> 'skill_id' THEN
        RAISE EXCEPTION 'skill_link_identity_is_immutable' USING ERRCODE = '42501';
      END IF;
    WHEN 'candidate_shares' THEN
      IF old_data -> 'candidate_id' IS DISTINCT FROM new_data -> 'candidate_id'
         OR old_data -> 'shared_with' IS DISTINCT FROM new_data -> 'shared_with'
         OR old_data -> 'shared_by' IS DISTINCT FROM new_data -> 'shared_by'
         OR old_data -> 'scope' IS DISTINCT FROM new_data -> 'scope' THEN
        RAISE EXCEPTION 'share_identity_is_immutable' USING ERRCODE = '42501';
      END IF;
    WHEN 'candidate_access_grants' THEN
      IF old_data -> 'candidate_id' IS DISTINCT FROM new_data -> 'candidate_id'
         OR old_data -> 'granted_to' IS DISTINCT FROM new_data -> 'granted_to'
         OR old_data -> 'granted_by' IS DISTINCT FROM new_data -> 'granted_by'
         OR old_data -> 'purpose' IS DISTINCT FROM new_data -> 'purpose' THEN
        RAISE EXCEPTION 'access_grant_identity_is_immutable' USING ERRCODE = '42501';
      END IF;
    WHEN 'submissions' THEN
      IF old_data -> 'candidate_id' IS DISTINCT FROM new_data -> 'candidate_id'
         OR old_data -> 'requirement_id' IS DISTINCT FROM new_data -> 'requirement_id'
         OR old_data -> 'submitted_by' IS DISTINCT FROM new_data -> 'submitted_by'
         OR old_data -> 'submitted_at' IS DISTINCT FROM new_data -> 'submitted_at' THEN
        RAISE EXCEPTION 'submission_identity_is_immutable' USING ERRCODE = '42501';
      END IF;
    WHEN 'interviews' THEN
      IF old_data -> 'submission_id' IS DISTINCT FROM new_data -> 'submission_id'
         OR old_data -> 'created_by' IS DISTINCT FROM new_data -> 'created_by' THEN
        RAISE EXCEPTION 'interview_identity_is_immutable' USING ERRCODE = '42501';
      END IF;
    WHEN 'interview_evaluations' THEN
      IF old_data -> 'interview_id' IS DISTINCT FROM new_data -> 'interview_id'
         OR old_data -> 'evaluator_id' IS DISTINCT FROM new_data -> 'evaluator_id' THEN
        RAISE EXCEPTION 'evaluation_identity_is_immutable' USING ERRCODE = '42501';
      END IF;
    WHEN 'followups' THEN
      IF old_data -> 'created_by' IS DISTINCT FROM new_data -> 'created_by'
         OR old_data -> 'candidate_id' IS DISTINCT FROM new_data -> 'candidate_id'
         OR old_data -> 'requirement_id' IS DISTINCT FROM new_data -> 'requirement_id'
         OR old_data -> 'submission_id' IS DISTINCT FROM new_data -> 'submission_id'
         OR old_data -> 'interview_id' IS DISTINCT FROM new_data -> 'interview_id' THEN
        RAISE EXCEPTION 'followup_identity_is_immutable' USING ERRCODE = '42501';
      END IF;
    WHEN 'communications' THEN
      IF old_data -> 'created_by' IS DISTINCT FROM new_data -> 'created_by'
         OR old_data -> 'candidate_id' IS DISTINCT FROM new_data -> 'candidate_id'
         OR old_data -> 'requirement_id' IS DISTINCT FROM new_data -> 'requirement_id'
         OR old_data -> 'submission_id' IS DISTINCT FROM new_data -> 'submission_id' THEN
        RAISE EXCEPTION 'communication_identity_is_immutable' USING ERRCODE = '42501';
      END IF;
    WHEN 'notifications' THEN
      IF old_data -> 'recipient_id' IS DISTINCT FROM new_data -> 'recipient_id'
         OR old_data -> 'entity_type' IS DISTINCT FROM new_data -> 'entity_type'
         OR old_data -> 'entity_id' IS DISTINCT FROM new_data -> 'entity_id' THEN
        RAISE EXCEPTION 'notification_identity_is_immutable' USING ERRCODE = '42501';
      END IF;
    WHEN 'processing_jobs' THEN
      IF old_data -> 'job_type' IS DISTINCT FROM new_data -> 'job_type'
         OR old_data -> 'resume_id' IS DISTINCT FROM new_data -> 'resume_id'
         OR old_data -> 'idempotency_key' IS DISTINCT FROM new_data -> 'idempotency_key'
         OR old_data -> 'created_by' IS DISTINCT FROM new_data -> 'created_by' THEN
        RAISE EXCEPTION 'job_identity_is_immutable' USING ERRCODE = '42501';
      END IF;
    WHEN 'matching_runs' THEN
      IF old_data -> 'requirement_id' IS DISTINCT FROM new_data -> 'requirement_id'
         OR old_data -> 'requested_by' IS DISTINCT FROM new_data -> 'requested_by'
         OR old_data -> 'algorithm_version' IS DISTINCT FROM new_data -> 'algorithm_version'
         OR old_data -> 'input_fingerprint' IS DISTINCT FROM new_data -> 'input_fingerprint' THEN
        RAISE EXCEPTION 'matching_run_identity_is_immutable' USING ERRCODE = '42501';
      END IF;
    WHEN 'matching_results' THEN
      IF old_data -> 'run_id' IS DISTINCT FROM new_data -> 'run_id'
         OR old_data -> 'candidate_id' IS DISTINCT FROM new_data -> 'candidate_id'
         OR old_data -> 'rank' IS DISTINCT FROM new_data -> 'rank' THEN
        RAISE EXCEPTION 'matching_result_identity_is_immutable' USING ERRCODE = '42501';
      END IF;
    WHEN 'interview_evaluation_scores' THEN
      IF old_data -> 'evaluation_id' IS DISTINCT FROM new_data -> 'evaluation_id'
         OR old_data -> 'question_id' IS DISTINCT FROM new_data -> 'question_id' THEN
        RAISE EXCEPTION 'evaluation_score_identity_is_immutable' USING ERRCODE = '42501';
      END IF;
    ELSE
      NULL;
  END CASE;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'organizations', 'organization_members', 'clients', 'requirements',
    'requirement_assignments', 'candidates', 'resumes', 'skills',
    'candidate_skills', 'requirement_skills', 'candidate_ownership',
    'candidate_shares', 'candidate_access_grants', 'submissions',
    'interviews', 'interview_questions', 'interview_evaluations',
    'interview_evaluation_scores', 'followups', 'communications',
    'notifications', 'processing_jobs', 'matching_runs', 'matching_results'
  ]
  LOOP
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.prevent_identity_mutation()',
      'trg_' || table_name || '_identity_guard',
      table_name
    );
  END LOOP;
END;
$$;

CREATE FUNCTION public.prevent_last_admin_removal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  remaining_admins integer;
BEGIN
  IF OLD.status = 'active'
     AND OLD.role = 'workspace_admin'
     AND (NEW.status <> 'active' OR NEW.role <> 'workspace_admin') THEN
    PERFORM 1 FROM public.organizations
    WHERE id = OLD.organization_id
    FOR UPDATE;

    SELECT count(*) INTO remaining_admins
    FROM public.organization_members m
    WHERE m.organization_id = OLD.organization_id
      AND m.status = 'active'
      AND m.role = 'workspace_admin'
      AND m.user_id <> OLD.user_id;
    IF remaining_admins = 0 THEN
      RAISE EXCEPTION 'workspace_must_keep_active_administrator'
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_organization_members_keep_admin
  BEFORE UPDATE OF role, status ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION public.prevent_last_admin_removal();

REVOKE UPDATE ON public.organizations FROM authenticated;
GRANT UPDATE (name, timezone, settings) ON public.organizations TO authenticated;

ALTER TABLE public.requirements
  ADD CONSTRAINT requirements_closed_reason_required
  CHECK (status <> 'closed' OR length(btrim(close_reason)) > 0);

CREATE FUNCTION public.enforce_requirement_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  allowed boolean := false;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  allowed := CASE OLD.status
    WHEN 'draft' THEN NEW.status IN ('open', 'closed')
    WHEN 'open' THEN NEW.status IN ('paused', 'closed')
    WHEN 'paused' THEN NEW.status IN ('open', 'closed')
    WHEN 'closed' THEN NEW.status = 'open'
    ELSE false
  END;
  IF NOT allowed THEN
    RAISE EXCEPTION 'invalid_requirement_transition'
      USING ERRCODE = '23514';
  END IF;
  IF NEW.status = 'closed'
     AND (NEW.close_reason IS NULL OR length(btrim(NEW.close_reason)) = 0) THEN
    RAISE EXCEPTION 'close_reason_required'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_requirements_transition
  BEFORE UPDATE OF status ON public.requirements
  FOR EACH ROW EXECUTE FUNCTION public.enforce_requirement_transition();

CREATE FUNCTION public.set_membership_lifecycle_timestamps()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'active' THEN
      NEW.activated_at := coalesce(NEW.activated_at, now());
      NEW.deactivated_at := NULL;
    ELSIF NEW.status = 'deactivated' THEN
      NEW.deactivated_at := now();
    ELSIF NEW.status = 'invited' THEN
      NEW.activated_at := NULL;
      NEW.deactivated_at := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_organization_members_lifecycle_timestamps
  BEFORE UPDATE OF status ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION public.set_membership_lifecycle_timestamps();

REVOKE ALL ON FUNCTION public.prevent_identity_mutation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_last_admin_removal() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_requirement_transition() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_membership_lifecycle_timestamps() FROM PUBLIC, anon, authenticated;
