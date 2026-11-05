-- Tenant authorization, private resume storage, and atomic ownership operations.

CREATE SCHEMA IF NOT EXISTS searchy_private;
REVOKE ALL ON SCHEMA searchy_private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA searchy_private TO authenticated, service_role;

CREATE FUNCTION searchy_private.is_active_org_member(p_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members m
    JOIN public.organizations o ON o.id = m.organization_id
    WHERE m.organization_id = p_organization_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND o.status = 'active'
      AND o.deleted_at IS NULL
  );
$$;

CREATE FUNCTION searchy_private.has_org_role(p_organization_id uuid, p_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members m
    JOIN public.organizations o ON o.id = m.organization_id
    WHERE m.organization_id = p_organization_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND m.role = ANY (p_roles)
      AND o.status = 'active'
      AND o.deleted_at IS NULL
  );
$$;

CREATE FUNCTION searchy_private.is_active_org_user(p_organization_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members m
    JOIN public.organizations o ON o.id = m.organization_id
    WHERE m.organization_id = p_organization_id
      AND m.user_id = p_user_id
      AND m.status = 'active'
      AND o.status = 'active'
      AND o.deleted_at IS NULL
  );
$$;

CREATE FUNCTION searchy_private.can_access_requirement(
  p_organization_id uuid,
  p_requirement_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT searchy_private.is_active_org_member(p_organization_id)
    AND (
      searchy_private.has_org_role(p_organization_id, ARRAY['manager', 'workspace_admin'])
      OR EXISTS (
        SELECT 1
        FROM public.requirement_assignments ra
        WHERE ra.organization_id = p_organization_id
          AND ra.requirement_id = p_requirement_id
          AND ra.user_id = auth.uid()
          AND ra.unassigned_at IS NULL
      )
    );
$$;

CREATE FUNCTION searchy_private.can_access_candidate(
  p_organization_id uuid,
  p_candidate_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT searchy_private.is_active_org_member(p_organization_id)
    AND (
      searchy_private.has_org_role(p_organization_id, ARRAY['manager'])
      OR EXISTS (
        SELECT 1
        FROM public.candidates c
        WHERE c.organization_id = p_organization_id
          AND c.id = p_candidate_id
          AND c.created_by = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM public.candidate_ownership co
        WHERE co.organization_id = p_organization_id
          AND co.candidate_id = p_candidate_id
          AND co.recruiter_id = auth.uid()
          AND co.status = 'active'
          AND co.released_at IS NULL
          AND co.expires_at > now()
      )
      OR EXISTS (
        SELECT 1
        FROM public.candidate_shares cs
        WHERE cs.organization_id = p_organization_id
          AND cs.candidate_id = p_candidate_id
          AND cs.shared_with = auth.uid()
          AND cs.scope IN ('profile', 'resume')
          AND cs.revoked_at IS NULL
          AND (cs.expires_at IS NULL OR cs.expires_at > now())
      )
      OR (
        searchy_private.has_org_role(p_organization_id, ARRAY['workspace_admin'])
        AND EXISTS (
          SELECT 1
          FROM public.candidate_access_grants g
          WHERE g.organization_id = p_organization_id
            AND g.candidate_id = p_candidate_id
            AND g.granted_to = auth.uid()
            AND g.revoked_at IS NULL
            AND g.expires_at > now()
        )
      )
    );
$$;

CREATE FUNCTION searchy_private.can_access_resume(
  p_organization_id uuid,
  p_candidate_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT searchy_private.is_active_org_member(p_organization_id)
    AND (
      searchy_private.has_org_role(p_organization_id, ARRAY['manager'])
      OR EXISTS (
        SELECT 1 FROM public.candidates c
        WHERE c.organization_id = p_organization_id
          AND c.id = p_candidate_id
          AND c.created_by = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.candidate_ownership co
        WHERE co.organization_id = p_organization_id
          AND co.candidate_id = p_candidate_id
          AND co.recruiter_id = auth.uid()
          AND co.status = 'active'
          AND co.released_at IS NULL
          AND co.expires_at > now()
      )
      OR EXISTS (
        SELECT 1 FROM public.candidate_shares cs
        WHERE cs.organization_id = p_organization_id
          AND cs.candidate_id = p_candidate_id
          AND cs.shared_with = auth.uid()
          AND cs.scope = 'resume'
          AND cs.revoked_at IS NULL
          AND (cs.expires_at IS NULL OR cs.expires_at > now())
      )
      OR (
        searchy_private.has_org_role(p_organization_id, ARRAY['workspace_admin'])
        AND EXISTS (
          SELECT 1 FROM public.candidate_access_grants g
          WHERE g.organization_id = p_organization_id
            AND g.candidate_id = p_candidate_id
            AND g.granted_to = auth.uid()
            AND g.revoked_at IS NULL
            AND g.expires_at > now()
        )
      )
    );
$$;

CREATE FUNCTION searchy_private.can_access_submission(
  p_organization_id uuid,
  p_submission_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT searchy_private.is_active_org_member(p_organization_id)
    AND (
      searchy_private.has_org_role(p_organization_id, ARRAY['manager'])
      OR EXISTS (
        SELECT 1
        FROM public.submissions s
        WHERE s.organization_id = p_organization_id
          AND s.id = p_submission_id
          AND searchy_private.can_access_candidate(s.organization_id, s.candidate_id)
      )
    );
$$;

CREATE FUNCTION searchy_private.can_access_interview(
  p_organization_id uuid,
  p_interview_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT searchy_private.is_active_org_member(p_organization_id)
    AND EXISTS (
      SELECT 1
      FROM public.interviews i
      WHERE i.organization_id = p_organization_id
        AND i.id = p_interview_id
        AND searchy_private.can_access_submission(i.organization_id, i.submission_id)
    );
$$;

CREATE FUNCTION searchy_private.can_access_evaluation(
  p_organization_id uuid,
  p_evaluation_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT searchy_private.is_active_org_member(p_organization_id)
    AND EXISTS (
      SELECT 1
      FROM public.interview_evaluations e
      WHERE e.organization_id = p_organization_id
        AND e.id = p_evaluation_id
        AND (
          e.evaluator_id = auth.uid()
          OR searchy_private.has_org_role(p_organization_id, ARRAY['manager'])
        )
    );
$$;

CREATE FUNCTION searchy_private.can_access_candidate_storage_path(p_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, storage, pg_temp
AS $$
DECLARE
  path_parts text[];
  org_id uuid;
  v_candidate_id uuid;
BEGIN
  path_parts := storage.foldername(p_name);
  IF coalesce(array_length(path_parts, 1), 0) < 2
     OR path_parts[1] !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     OR path_parts[2] !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN false;
  END IF;

  org_id := path_parts[1]::uuid;
  v_candidate_id := path_parts[2]::uuid;

  RETURN EXISTS (
    SELECT 1
    FROM public.resumes r
    WHERE r.organization_id = org_id
      AND r.candidate_id = v_candidate_id
      AND r.storage_path = p_name
      AND r.deleted_at IS NULL
      AND searchy_private.can_access_resume(org_id, v_candidate_id)
  );
END;
$$;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members FORCE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients FORCE ROW LEVEL SECURITY;
ALTER TABLE public.requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requirements FORCE ROW LEVEL SECURITY;
ALTER TABLE public.requirement_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requirement_assignments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates FORCE ROW LEVEL SECURITY;
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumes FORCE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills FORCE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_skills FORCE ROW LEVEL SECURITY;
ALTER TABLE public.requirement_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requirement_skills FORCE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_ownership ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_ownership FORCE ROW LEVEL SECURITY;
ALTER TABLE public.ownership_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ownership_history FORCE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_shares FORCE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_access_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_access_grants FORCE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interviews FORCE ROW LEVEL SECURITY;
ALTER TABLE public.interview_schedule_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_schedule_history FORCE ROW LEVEL SECURITY;
ALTER TABLE public.interview_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_questions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.interview_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_evaluations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.interview_evaluation_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_evaluation_scores FORCE ROW LEVEL SECURITY;
ALTER TABLE public.followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followups FORCE ROW LEVEL SECURITY;
ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communications FORCE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications FORCE ROW LEVEL SECURITY;
ALTER TABLE public.processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_jobs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.matching_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matching_runs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.matching_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matching_results FORCE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;

CREATE POLICY organizations_select_member ON public.organizations
  FOR SELECT TO authenticated
  USING (searchy_private.is_active_org_member(id));
CREATE POLICY organizations_update_admin ON public.organizations
  FOR UPDATE TO authenticated
  USING (searchy_private.has_org_role(id, ARRAY['workspace_admin']))
  WITH CHECK (searchy_private.has_org_role(id, ARRAY['workspace_admin']));

CREATE POLICY members_select_self_or_admin ON public.organization_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR searchy_private.has_org_role(organization_id, ARRAY['workspace_admin', 'manager'])
  );
CREATE POLICY members_insert_admin ON public.organization_members
  FOR INSERT TO authenticated
  WITH CHECK (
    searchy_private.has_org_role(organization_id, ARRAY['workspace_admin'])
    AND status = 'invited'
    AND invited_by = auth.uid()
  );
CREATE POLICY members_update_admin ON public.organization_members
  FOR UPDATE TO authenticated
  USING (searchy_private.has_org_role(organization_id, ARRAY['workspace_admin']))
  WITH CHECK (searchy_private.has_org_role(organization_id, ARRAY['workspace_admin']));

CREATE POLICY clients_select_relevant ON public.clients
  FOR SELECT TO authenticated
  USING (
    searchy_private.has_org_role(organization_id, ARRAY['manager', 'workspace_admin'])
    OR EXISTS (
      SELECT 1
      FROM public.requirements r
      WHERE r.organization_id = clients.organization_id
        AND r.client_id = clients.id
        AND searchy_private.can_access_requirement(r.organization_id, r.id)
    )
  );
CREATE POLICY clients_insert_manager ON public.clients
  FOR INSERT TO authenticated
  WITH CHECK (
    searchy_private.has_org_role(organization_id, ARRAY['manager'])
    AND created_by = auth.uid()
  );
CREATE POLICY clients_update_manager ON public.clients
  FOR UPDATE TO authenticated
  USING (searchy_private.has_org_role(organization_id, ARRAY['manager']))
  WITH CHECK (searchy_private.has_org_role(organization_id, ARRAY['manager']));

CREATE POLICY requirements_select_scope ON public.requirements
  FOR SELECT TO authenticated
  USING (searchy_private.can_access_requirement(organization_id, id));
CREATE POLICY requirements_insert_manager ON public.requirements
  FOR INSERT TO authenticated
  WITH CHECK (
    searchy_private.has_org_role(organization_id, ARRAY['manager'])
    AND created_by = auth.uid()
  );
CREATE POLICY requirements_update_manager ON public.requirements
  FOR UPDATE TO authenticated
  USING (searchy_private.has_org_role(organization_id, ARRAY['manager']))
  WITH CHECK (searchy_private.has_org_role(organization_id, ARRAY['manager']));

CREATE POLICY requirement_assignments_select_scope ON public.requirement_assignments
  FOR SELECT TO authenticated
  USING (searchy_private.can_access_requirement(organization_id, requirement_id));
CREATE POLICY requirement_assignments_insert_manager ON public.requirement_assignments
  FOR INSERT TO authenticated
  WITH CHECK (
    searchy_private.has_org_role(organization_id, ARRAY['manager'])
    AND assigned_by = auth.uid()
    AND searchy_private.is_active_org_user(organization_id, user_id)
  );
CREATE POLICY requirement_assignments_update_manager ON public.requirement_assignments
  FOR UPDATE TO authenticated
  USING (searchy_private.has_org_role(organization_id, ARRAY['manager']))
  WITH CHECK (
    searchy_private.has_org_role(organization_id, ARRAY['manager'])
    AND searchy_private.is_active_org_user(organization_id, user_id)
  );

CREATE POLICY candidates_select_access ON public.candidates
  FOR SELECT TO authenticated
  USING (searchy_private.can_access_candidate(organization_id, id));
CREATE POLICY candidates_insert_member ON public.candidates
  FOR INSERT TO authenticated
  WITH CHECK (
    searchy_private.has_org_role(organization_id, ARRAY['recruiter', 'manager'])
    AND created_by = auth.uid()
    AND archived_at IS NULL
  );
CREATE POLICY candidates_update_access ON public.candidates
  FOR UPDATE TO authenticated
  USING (
    searchy_private.has_org_role(organization_id, ARRAY['manager'])
    OR (
      searchy_private.has_org_role(organization_id, ARRAY['recruiter'])
      AND created_by = auth.uid()
    )
  )
  WITH CHECK (
    searchy_private.has_org_role(organization_id, ARRAY['manager'])
    OR (
      searchy_private.has_org_role(organization_id, ARRAY['recruiter'])
      AND created_by = auth.uid()
    )
  );

CREATE POLICY resumes_select_candidate_access ON public.resumes
  FOR SELECT TO authenticated
  USING (searchy_private.can_access_resume(organization_id, candidate_id));
CREATE POLICY resumes_insert_candidate_access ON public.resumes
  FOR INSERT TO authenticated
  WITH CHECK (
    searchy_private.has_org_role(organization_id, ARRAY['recruiter', 'manager'])
    AND uploaded_by = auth.uid()
    AND searchy_private.can_access_candidate(organization_id, candidate_id)
    AND processing_status = 'uploaded'
    AND extracted_data = '{}'::jsonb
    AND parser_version IS NULL
    AND deleted_at IS NULL
  );

CREATE POLICY skills_select_member ON public.skills
  FOR SELECT TO authenticated
  USING (searchy_private.is_active_org_member(organization_id));
CREATE POLICY skills_insert_member ON public.skills
  FOR INSERT TO authenticated
  WITH CHECK (searchy_private.has_org_role(organization_id, ARRAY['recruiter', 'manager']));

CREATE POLICY candidate_skills_select_access ON public.candidate_skills
  FOR SELECT TO authenticated
  USING (searchy_private.can_access_candidate(organization_id, candidate_id));
CREATE POLICY candidate_skills_insert_access ON public.candidate_skills
  FOR INSERT TO authenticated
  WITH CHECK (
    searchy_private.has_org_role(organization_id, ARRAY['recruiter', 'manager'])
    AND searchy_private.can_access_candidate(organization_id, candidate_id)
  );
CREATE POLICY candidate_skills_update_access ON public.candidate_skills
  FOR UPDATE TO authenticated
  USING (searchy_private.can_access_candidate(organization_id, candidate_id))
  WITH CHECK (searchy_private.can_access_candidate(organization_id, candidate_id));
CREATE POLICY candidate_skills_delete_access ON public.candidate_skills
  FOR DELETE TO authenticated
  USING (searchy_private.can_access_candidate(organization_id, candidate_id));

CREATE POLICY requirement_skills_select_scope ON public.requirement_skills
  FOR SELECT TO authenticated
  USING (searchy_private.can_access_requirement(organization_id, requirement_id));
CREATE POLICY requirement_skills_insert_manager ON public.requirement_skills
  FOR INSERT TO authenticated
  WITH CHECK (searchy_private.has_org_role(organization_id, ARRAY['manager']));
CREATE POLICY requirement_skills_update_manager ON public.requirement_skills
  FOR UPDATE TO authenticated
  USING (searchy_private.has_org_role(organization_id, ARRAY['manager']))
  WITH CHECK (searchy_private.has_org_role(organization_id, ARRAY['manager']));
CREATE POLICY requirement_skills_delete_manager ON public.requirement_skills
  FOR DELETE TO authenticated
  USING (searchy_private.has_org_role(organization_id, ARRAY['manager']));

CREATE POLICY ownership_select_scope ON public.candidate_ownership
  FOR SELECT TO authenticated
  USING (
    searchy_private.is_active_org_member(organization_id)
    AND (
      searchy_private.has_org_role(organization_id, ARRAY['manager'])
      OR recruiter_id = auth.uid()
      OR searchy_private.can_access_candidate(organization_id, candidate_id)
    )
  );
CREATE POLICY ownership_history_select_scope ON public.ownership_history
  FOR SELECT TO authenticated
  USING (
    searchy_private.is_active_org_member(organization_id)
    AND (
      searchy_private.has_org_role(organization_id, ARRAY['manager'])
      OR previous_recruiter_id = auth.uid()
      OR new_recruiter_id = auth.uid()
      OR searchy_private.can_access_candidate(organization_id, candidate_id)
    )
  );

CREATE POLICY candidate_shares_select_scope ON public.candidate_shares
  FOR SELECT TO authenticated
  USING (
    searchy_private.is_active_org_member(organization_id)
    AND (
      shared_with = auth.uid()
      OR shared_by = auth.uid()
      OR searchy_private.has_org_role(organization_id, ARRAY['manager'])
    )
  );
CREATE POLICY candidate_shares_insert_owner ON public.candidate_shares
  FOR INSERT TO authenticated
  WITH CHECK (
    shared_by = auth.uid()
    AND searchy_private.has_org_role(organization_id, ARRAY['recruiter', 'manager'])
    AND searchy_private.can_access_candidate(organization_id, candidate_id)
    AND searchy_private.is_active_org_user(organization_id, shared_with)
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > now())
  );
CREATE POLICY candidate_shares_update_manager_or_creator ON public.candidate_shares
  FOR UPDATE TO authenticated
  USING (
    searchy_private.is_active_org_member(organization_id)
    AND (
      shared_by = auth.uid()
      OR searchy_private.has_org_role(organization_id, ARRAY['manager'])
    )
  )
  WITH CHECK (
    searchy_private.is_active_org_member(organization_id)
    AND (
      shared_by = auth.uid()
      OR searchy_private.has_org_role(organization_id, ARRAY['manager'])
    )
  );

CREATE POLICY candidate_grants_select_scope ON public.candidate_access_grants
  FOR SELECT TO authenticated
  USING (
    searchy_private.is_active_org_member(organization_id)
    AND (
      granted_to = auth.uid()
      OR searchy_private.has_org_role(organization_id, ARRAY['workspace_admin', 'manager'])
    )
  );
CREATE POLICY candidate_grants_insert_admin ON public.candidate_access_grants
  FOR INSERT TO authenticated
  WITH CHECK (
    searchy_private.has_org_role(organization_id, ARRAY['workspace_admin'])
    AND granted_by = auth.uid()
    AND searchy_private.is_active_org_user(organization_id, granted_to)
    AND expires_at > now()
    AND expires_at <= now() + interval '4 hours'
    AND revoked_at IS NULL
  );
CREATE POLICY candidate_grants_update_admin ON public.candidate_access_grants
  FOR UPDATE TO authenticated
  USING (searchy_private.has_org_role(organization_id, ARRAY['workspace_admin']))
  WITH CHECK (
    searchy_private.has_org_role(organization_id, ARRAY['workspace_admin'])
    AND searchy_private.is_active_org_user(organization_id, granted_to)
    AND expires_at > now()
    AND expires_at <= now() + interval '4 hours'
    AND (revoked_at IS NULL OR revoked_at <= now())
  );

CREATE POLICY submissions_select_scope ON public.submissions
  FOR SELECT TO authenticated
  USING (
    searchy_private.is_active_org_member(organization_id)
    AND (
      searchy_private.has_org_role(organization_id, ARRAY['manager'])
      OR searchy_private.can_access_candidate(organization_id, candidate_id)
    )
  );
CREATE POLICY submissions_insert_owner ON public.submissions
  FOR INSERT TO authenticated
  WITH CHECK (
    submitted_by = auth.uid()
    AND searchy_private.has_org_role(organization_id, ARRAY['recruiter', 'manager'])
    AND searchy_private.can_access_candidate(organization_id, candidate_id)
    AND searchy_private.can_access_requirement(organization_id, requirement_id)
    AND status = 'pending_review'
    AND EXISTS (
      SELECT 1
      FROM public.requirements r
      WHERE r.organization_id = submissions.organization_id
        AND r.id = submissions.requirement_id
        AND r.status = 'open'
        AND r.deleted_at IS NULL
    )
    AND (
      searchy_private.has_org_role(organization_id, ARRAY['manager'])
      OR EXISTS (
        SELECT 1
        FROM public.candidate_ownership co
        WHERE co.organization_id = submissions.organization_id
          AND co.candidate_id = submissions.candidate_id
          AND co.requirement_id = submissions.requirement_id
          AND co.recruiter_id = auth.uid()
          AND co.status = 'active'
          AND co.released_at IS NULL
          AND co.expires_at > now()
      )
    )
  );
CREATE POLICY submissions_update_manager ON public.submissions
  FOR UPDATE TO authenticated
  USING (
    searchy_private.is_active_org_member(organization_id)
    AND (
      submitted_by = auth.uid()
      OR searchy_private.has_org_role(organization_id, ARRAY['manager'])
    )
  )
  WITH CHECK (
    searchy_private.is_active_org_member(organization_id)
    AND (
      submitted_by = auth.uid()
      OR searchy_private.has_org_role(organization_id, ARRAY['manager'])
    )
  );

CREATE POLICY interviews_select_access ON public.interviews
  FOR SELECT TO authenticated
  USING (searchy_private.can_access_submission(organization_id, submission_id));
CREATE POLICY interviews_insert_access ON public.interviews
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND searchy_private.has_org_role(organization_id, ARRAY['recruiter', 'manager'])
    AND searchy_private.can_access_submission(organization_id, submission_id)
    AND status = 'scheduled'
  );
CREATE POLICY interviews_update_access ON public.interviews
  FOR UPDATE TO authenticated
  USING (
    searchy_private.is_active_org_member(organization_id)
    AND (
      searchy_private.has_org_role(organization_id, ARRAY['manager'])
      OR created_by = auth.uid()
    )
  )
  WITH CHECK (
    searchy_private.is_active_org_member(organization_id)
    AND (
      searchy_private.has_org_role(organization_id, ARRAY['manager'])
      OR created_by = auth.uid()
    )
  );

CREATE POLICY interview_schedule_history_select ON public.interview_schedule_history
  FOR SELECT TO authenticated
  USING (searchy_private.can_access_interview(organization_id, interview_id));

CREATE POLICY interview_questions_select_scope ON public.interview_questions
  FOR SELECT TO authenticated
  USING (
    searchy_private.has_org_role(organization_id, ARRAY['manager'])
    OR (
      requirement_id IS NOT NULL
      AND searchy_private.can_access_requirement(organization_id, requirement_id)
    )
  );
CREATE POLICY interview_questions_insert_manager ON public.interview_questions
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND searchy_private.has_org_role(organization_id, ARRAY['manager'])
  );
CREATE POLICY interview_questions_update_manager ON public.interview_questions
  FOR UPDATE TO authenticated
  USING (searchy_private.has_org_role(organization_id, ARRAY['manager']))
  WITH CHECK (searchy_private.has_org_role(organization_id, ARRAY['manager']));

CREATE POLICY evaluations_select_scope ON public.interview_evaluations
  FOR SELECT TO authenticated
  USING (
    searchy_private.is_active_org_member(organization_id)
    AND (
      evaluator_id = auth.uid()
      OR searchy_private.has_org_role(organization_id, ARRAY['manager'])
    )
  );
CREATE POLICY evaluations_insert_authorized ON public.interview_evaluations
  FOR INSERT TO authenticated
  WITH CHECK (
    evaluator_id = auth.uid()
    AND version = 1
    AND status = 'draft'
    AND submitted_at IS NULL
    AND searchy_private.has_org_role(organization_id, ARRAY['recruiter', 'manager'])
    AND searchy_private.can_access_interview(organization_id, interview_id)
  );
CREATE POLICY evaluations_update_draft ON public.interview_evaluations
  FOR UPDATE TO authenticated
  USING (
    status = 'draft'
    AND searchy_private.is_active_org_member(organization_id)
    AND (
      evaluator_id = auth.uid()
      OR searchy_private.has_org_role(organization_id, ARRAY['manager'])
    )
  )
  WITH CHECK (
    searchy_private.is_active_org_member(organization_id)
    AND (
      evaluator_id = auth.uid()
      OR searchy_private.has_org_role(organization_id, ARRAY['manager'])
    )
    AND status IN ('draft', 'submitted')
  );

CREATE POLICY evaluation_scores_select_scope ON public.interview_evaluation_scores
  FOR SELECT TO authenticated
  USING (searchy_private.can_access_evaluation(organization_id, evaluation_id));
CREATE POLICY evaluation_scores_insert_scope ON public.interview_evaluation_scores
  FOR INSERT TO authenticated
  WITH CHECK (
    searchy_private.can_access_evaluation(organization_id, evaluation_id)
    AND EXISTS (
      SELECT 1
      FROM public.interview_evaluations e
      WHERE e.organization_id = interview_evaluation_scores.organization_id
        AND e.id = interview_evaluation_scores.evaluation_id
        AND e.status = 'draft'
    )
  );
CREATE POLICY evaluation_scores_update_scope ON public.interview_evaluation_scores
  FOR UPDATE TO authenticated
  USING (
    searchy_private.can_access_evaluation(organization_id, evaluation_id)
    AND EXISTS (
      SELECT 1
      FROM public.interview_evaluations e
      WHERE e.organization_id = interview_evaluation_scores.organization_id
        AND e.id = interview_evaluation_scores.evaluation_id
        AND e.status = 'draft'
    )
  )
  WITH CHECK (
    searchy_private.can_access_evaluation(organization_id, evaluation_id)
    AND EXISTS (
      SELECT 1
      FROM public.interview_evaluations e
      WHERE e.organization_id = interview_evaluation_scores.organization_id
        AND e.id = interview_evaluation_scores.evaluation_id
        AND e.status = 'draft'
    )
  );

CREATE POLICY followups_select_owner_or_manager ON public.followups
  FOR SELECT TO authenticated
  USING (
    searchy_private.is_active_org_member(organization_id)
    AND (
      owner_id = auth.uid()
      OR created_by = auth.uid()
      OR searchy_private.has_org_role(organization_id, ARRAY['manager'])
    )
  );
CREATE POLICY followups_insert_owner_or_manager ON public.followups
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND status = 'open'
    AND completed_at IS NULL
    AND (
      owner_id = auth.uid()
      OR searchy_private.has_org_role(organization_id, ARRAY['manager'])
    )
    AND searchy_private.is_active_org_user(organization_id, owner_id)
    AND (
      (candidate_id IS NOT NULL AND searchy_private.can_access_candidate(organization_id, candidate_id))
      OR (requirement_id IS NOT NULL AND searchy_private.can_access_requirement(organization_id, requirement_id))
      OR (submission_id IS NOT NULL AND searchy_private.can_access_submission(organization_id, submission_id))
      OR (interview_id IS NOT NULL AND searchy_private.can_access_interview(organization_id, interview_id))
    )
  );
CREATE POLICY followups_update_owner_or_manager ON public.followups
  FOR UPDATE TO authenticated
  USING (
    searchy_private.is_active_org_member(organization_id)
    AND (
      owner_id = auth.uid()
      OR searchy_private.has_org_role(organization_id, ARRAY['manager'])
    )
  )
  WITH CHECK (
    searchy_private.is_active_org_member(organization_id)
    AND (
      owner_id = auth.uid()
      OR searchy_private.has_org_role(organization_id, ARRAY['manager'])
    )
    AND searchy_private.is_active_org_user(organization_id, owner_id)
  );

CREATE POLICY communications_select_scope ON public.communications
  FOR SELECT TO authenticated
  USING (
    searchy_private.is_active_org_member(organization_id)
    AND (
      created_by = auth.uid()
      OR searchy_private.has_org_role(organization_id, ARRAY['manager'])
    )
  );
CREATE POLICY communications_insert_owner ON public.communications
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND searchy_private.has_org_role(organization_id, ARRAY['recruiter', 'manager'])
    AND status = 'draft'
    AND (
      candidate_id IS NULL OR searchy_private.can_access_candidate(organization_id, candidate_id)
    )
    AND (
      requirement_id IS NULL OR searchy_private.can_access_requirement(organization_id, requirement_id)
    )
    AND (
      submission_id IS NULL OR searchy_private.can_access_submission(organization_id, submission_id)
    )
  );
CREATE POLICY communications_update_owner ON public.communications
  FOR UPDATE TO authenticated
  USING (
    searchy_private.is_active_org_member(organization_id)
    AND (
      created_by = auth.uid()
      OR searchy_private.has_org_role(organization_id, ARRAY['manager'])
    )
  )
  WITH CHECK (
    searchy_private.is_active_org_member(organization_id)
    AND (
      created_by = auth.uid()
      OR searchy_private.has_org_role(organization_id, ARRAY['manager'])
    )
  );

CREATE POLICY notifications_select_recipient ON public.notifications
  FOR SELECT TO authenticated
  USING (
    recipient_id = auth.uid()
    AND searchy_private.is_active_org_member(organization_id)
  );
CREATE POLICY notifications_update_recipient ON public.notifications
  FOR UPDATE TO authenticated
  USING (
    recipient_id = auth.uid()
    AND searchy_private.is_active_org_member(organization_id)
  )
  WITH CHECK (
    recipient_id = auth.uid()
    AND searchy_private.is_active_org_member(organization_id)
  );

CREATE POLICY processing_jobs_select_creator_or_manager ON public.processing_jobs
  FOR SELECT TO authenticated
  USING (
    searchy_private.is_active_org_member(organization_id)
    AND (
      created_by = auth.uid()
      OR searchy_private.has_org_role(organization_id, ARRAY['manager'])
    )
  );

CREATE POLICY matching_runs_select_scope ON public.matching_runs
  FOR SELECT TO authenticated
  USING (
    searchy_private.is_active_org_member(organization_id)
    AND (
      requested_by = auth.uid()
      OR searchy_private.has_org_role(organization_id, ARRAY['manager'])
    )
  );
CREATE POLICY matching_results_select_scope ON public.matching_results
  FOR SELECT TO authenticated
  USING (
    searchy_private.is_active_org_member(organization_id)
    AND (
      searchy_private.has_org_role(organization_id, ARRAY['manager'])
      OR (
        EXISTS (
          SELECT 1
          FROM public.matching_runs mr
          WHERE mr.organization_id = matching_results.organization_id
            AND mr.id = matching_results.run_id
            AND mr.requested_by = auth.uid()
        )
        AND searchy_private.can_access_candidate(organization_id, candidate_id)
      )
    )
  );

CREATE POLICY audit_logs_select_admin ON public.audit_logs
  FOR SELECT TO authenticated
  USING (searchy_private.has_org_role(organization_id, ARRAY['workspace_admin']));

CREATE FUNCTION public.audit_row_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  row_data jsonb;
  organization_id_value uuid;
  target_id_value uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    row_data := to_jsonb(OLD);
  ELSE
    row_data := to_jsonb(NEW);
  END IF;

  organization_id_value := (row_data ->> 'organization_id')::uuid;
  target_id_value := COALESCE(
    NULLIF(row_data ->> 'id', '')::uuid,
    NULLIF(row_data ->> 'user_id', '')::uuid,
    NULLIF(row_data ->> 'candidate_id', '')::uuid,
    NULLIF(row_data ->> 'requirement_id', '')::uuid
  );

  INSERT INTO public.audit_logs (
    organization_id, actor_id, action, target_type, target_id, outcome, metadata
  ) VALUES (
    organization_id_value, auth.uid(),
    TG_TABLE_NAME || '_' || lower(TG_OP), TG_TABLE_NAME, target_id_value,
    'success', '{}'::jsonb
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'organization_members', 'requirements', 'requirement_assignments',
    'candidates', 'resumes', 'submissions', 'interviews',
    'interview_evaluations', 'interview_evaluation_scores', 'followups',
    'candidate_shares', 'candidate_access_grants', 'communications'
  ]
  LOOP
    EXECUTE format(
      'CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_row_change()',
      'trg_' || table_name || '_audit',
      table_name
    );
  END LOOP;
END;
$$;

CREATE FUNCTION public.enforce_submission_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor uuid := auth.uid();
  allowed boolean := false;
BEGIN
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id
     OR NEW.candidate_id IS DISTINCT FROM OLD.candidate_id
     OR NEW.requirement_id IS DISTINCT FROM OLD.requirement_id
     OR NEW.submitted_by IS DISTINCT FROM OLD.submitted_by
     OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'submission_identity_is_immutable'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  allowed := CASE OLD.status
    WHEN 'pending_review' THEN NEW.status IN ('returned', 'approved', 'rejected', 'withdrawn')
    WHEN 'returned' THEN NEW.status IN ('pending_review', 'withdrawn')
    WHEN 'approved' THEN NEW.status IN ('sent_to_client', 'withdrawn')
    WHEN 'sent_to_client' THEN NEW.status IN ('interviewing', 'rejected', 'withdrawn')
    WHEN 'interviewing' THEN NEW.status IN ('offered', 'rejected', 'withdrawn')
    WHEN 'offered' THEN NEW.status IN ('joined', 'rejected', 'withdrawn')
    ELSE false
  END;

  IF NOT allowed THEN
    RAISE EXCEPTION 'invalid_submission_transition'
      USING ERRCODE = '23514';
  END IF;
  IF NEW.status IN ('approved', 'returned', 'rejected')
     AND NOT searchy_private.has_org_role(NEW.organization_id, ARRAY['manager']) THEN
    RAISE EXCEPTION 'manager_review_required'
      USING ERRCODE = '42501';
  END IF;
  IF NEW.status = 'approved' AND actor = NEW.submitted_by THEN
    RAISE EXCEPTION 'self_approval_not_allowed'
      USING ERRCODE = '42501';
  END IF;
  IF NEW.status IN ('returned', 'rejected')
     AND (NEW.decision_reason IS NULL OR length(btrim(NEW.decision_reason)) = 0) THEN
    RAISE EXCEPTION 'decision_reason_required'
      USING ERRCODE = '23514';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.require_open_requirement_for_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM 1
  FROM public.requirements r
  WHERE r.organization_id = NEW.organization_id
    AND r.id = NEW.requirement_id
    AND r.status = 'open'
    AND r.deleted_at IS NULL
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'requirement_not_open'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_submissions_open_requirement
  BEFORE INSERT ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.require_open_requirement_for_submission();

CREATE TRIGGER trg_submissions_transition
  BEFORE UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_submission_transition();

CREATE FUNCTION public.enforce_interview_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  allowed boolean := false;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  allowed := OLD.status = 'scheduled'
    AND NEW.status IN ('completed', 'cancelled', 'no_show');
  IF NOT allowed THEN
    RAISE EXCEPTION 'invalid_interview_transition'
      USING ERRCODE = '23514';
  END IF;
  IF NEW.status = 'cancelled'
     AND (NEW.reschedule_reason IS NULL OR length(btrim(NEW.reschedule_reason)) = 0) THEN
    RAISE EXCEPTION 'cancellation_reason_required'
      USING ERRCODE = '23514';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_interviews_transition
  BEFORE UPDATE OF status ON public.interviews
  FOR EACH ROW EXECUTE FUNCTION public.enforce_interview_transition();

CREATE FUNCTION public.enforce_followup_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor uuid := auth.uid();
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    IF NEW.completed_at IS DISTINCT FROM OLD.completed_at THEN
      RAISE EXCEPTION 'followup_completion_timestamp_is_managed'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status = 'open' AND NEW.status = 'completed' THEN
    NEW.completed_at := now();
  ELSIF OLD.status = 'open' AND NEW.status = 'cancelled' THEN
    NEW.completed_at := NULL;
  ELSIF OLD.status IN ('completed', 'cancelled') AND NEW.status = 'open' THEN
    IF actor IS NULL OR NOT searchy_private.has_org_role(
      NEW.organization_id, ARRAY['manager']
    ) THEN
      RAISE EXCEPTION 'manager_required_to_reopen_followup'
        USING ERRCODE = '42501';
    END IF;
    NEW.completed_at := NULL;
  ELSE
    RAISE EXCEPTION 'invalid_followup_transition'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_followups_transition
  BEFORE UPDATE OF status, completed_at ON public.followups
  FOR EACH ROW EXECUTE FUNCTION public.enforce_followup_transition();

CREATE FUNCTION public.enforce_evaluation_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id
     OR NEW.interview_id IS DISTINCT FROM OLD.interview_id
     OR NEW.evaluator_id IS DISTINCT FROM OLD.evaluator_id
     OR NEW.version IS DISTINCT FROM OLD.version
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'evaluation_identity_is_immutable'
      USING ERRCODE = '23514';
  END IF;

  IF OLD.status = 'submitted' THEN
    RAISE EXCEPTION 'submitted_evaluation_is_immutable_create_revision'
      USING ERRCODE = '23514';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status <> 'draft' OR NEW.status <> 'submitted' THEN
      RAISE EXCEPTION 'invalid_evaluation_transition'
        USING ERRCODE = '23514';
    END IF;
    NEW.submitted_at := now();
  ELSE
    NEW.submitted_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_evaluations_status
  BEFORE UPDATE ON public.interview_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.enforce_evaluation_status();

CREATE FUNCTION public.record_interview_schedule_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.starts_at IS DISTINCT FROM OLD.starts_at
     OR NEW.ends_at IS DISTINCT FROM OLD.ends_at
     OR NEW.timezone IS DISTINCT FROM OLD.timezone THEN
    IF NEW.reschedule_reason IS NULL OR length(btrim(NEW.reschedule_reason)) = 0 THEN
      RAISE EXCEPTION 'reschedule_reason_required'
        USING ERRCODE = '23514';
    END IF;

    INSERT INTO public.interview_schedule_history (
      organization_id, interview_id, actor_id,
      old_starts_at, old_ends_at, old_timezone,
      new_starts_at, new_ends_at, new_timezone, reason
    ) VALUES (
      NEW.organization_id, NEW.id, auth.uid(),
      OLD.starts_at, OLD.ends_at, OLD.timezone,
      NEW.starts_at, NEW.ends_at, NEW.timezone, btrim(NEW.reschedule_reason)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_interviews_schedule_history
  BEFORE UPDATE OF starts_at, ends_at, timezone ON public.interviews
  FOR EACH ROW EXECUTE FUNCTION public.record_interview_schedule_change();

CREATE FUNCTION public.confirm_resume_parse(
  p_organization_id uuid,
  p_resume_id uuid,
  p_extracted_data jsonb
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_candidate_id uuid;
  v_status text;
BEGIN
  IF v_actor IS NULL OR NOT searchy_private.has_org_role(
    p_organization_id, ARRAY['recruiter', 'manager']
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_extracted_data IS NULL
     OR jsonb_typeof(p_extracted_data) <> 'object'
     OR pg_column_size(p_extracted_data) > 262144 THEN
    RAISE EXCEPTION 'invalid_extracted_data'
      USING ERRCODE = '23514';
  END IF;

  SELECT r.candidate_id, r.processing_status
    INTO v_candidate_id, v_status
  FROM public.resumes r
  WHERE r.organization_id = p_organization_id
    AND r.id = p_resume_id
    AND r.deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'resume_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT searchy_private.can_access_resume(p_organization_id, v_candidate_id) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF v_status NOT IN ('uploaded', 'review_ready', 'failed') THEN
    RAISE EXCEPTION 'resume_not_ready_for_confirmation'
      USING ERRCODE = '23514';
  END IF;

  UPDATE public.resumes
  SET extracted_data = p_extracted_data,
      processing_status = 'review_ready',
      parser_version = coalesce(parser_version, 'manual-entry')
  WHERE organization_id = p_organization_id AND id = p_resume_id;

  INSERT INTO public.audit_logs (
    organization_id, actor_id, action, target_type, target_id, outcome, metadata
  ) VALUES (
    p_organization_id, v_actor, 'RESUME_PARSE_CONFIRMED',
    'resume', p_resume_id, 'success',
    jsonb_build_object('candidate_id', v_candidate_id, 'manual_review', true)
  );
  RETURN 'review_ready';
END;
$$;

CREATE FUNCTION public.validate_evaluation_score()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  minimum_score integer;
  maximum_score integer;
  question_requirement uuid;
  interview_requirement uuid;
BEGIN
  SELECT q.min_score, q.max_score, q.requirement_id
    INTO minimum_score, maximum_score, question_requirement
  FROM public.interview_questions q
  WHERE q.organization_id = NEW.organization_id
    AND q.id = NEW.question_id;
  IF NOT FOUND OR NEW.score < minimum_score OR NEW.score > maximum_score THEN
    RAISE EXCEPTION 'evaluation_score_out_of_range'
      USING ERRCODE = '23514';
  END IF;
  SELECT s.requirement_id INTO interview_requirement
  FROM public.interview_evaluations e
  JOIN public.interviews i
    ON i.organization_id = e.organization_id AND i.id = e.interview_id
  JOIN public.submissions s
    ON s.organization_id = i.organization_id AND s.id = i.submission_id
  WHERE e.organization_id = NEW.organization_id
    AND e.id = NEW.evaluation_id;
  IF question_requirement IS NOT NULL
     AND question_requirement <> interview_requirement THEN
    RAISE EXCEPTION 'evaluation_question_requirement_mismatch'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_evaluation_score_range
  BEFORE INSERT OR UPDATE OF score, question_id ON public.interview_evaluation_scores
  FOR EACH ROW EXECUTE FUNCTION public.validate_evaluation_score();

CREATE FUNCTION public.create_evaluation_revision(
  p_organization_id uuid,
  p_evaluation_id uuid
)
RETURNS TABLE (evaluation_id uuid, version integer, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_interview_id uuid;
  v_evaluator_id uuid;
  v_version integer;
  v_new_evaluation_id uuid;
BEGIN
  IF v_actor IS NULL
     OR NOT searchy_private.has_org_role(p_organization_id, ARRAY['manager']) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT e.interview_id, e.evaluator_id, e.version
    INTO v_interview_id, v_evaluator_id, v_version
  FROM public.interview_evaluations e
  WHERE e.organization_id = p_organization_id
    AND e.id = p_evaluation_id
    AND e.status = 'submitted'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'submitted_evaluation_not_found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.interview_evaluations (
    organization_id, interview_id, evaluator_id, version, status
  ) VALUES (
    p_organization_id, v_interview_id, v_evaluator_id, v_version + 1, 'draft'
  )
  RETURNING id INTO v_new_evaluation_id;

  INSERT INTO public.audit_logs (
    organization_id, actor_id, action, target_type, target_id, outcome, metadata
  ) VALUES (
    p_organization_id, v_actor, 'INTERVIEW_EVALUATION_REVISION_CREATED',
    'interview_evaluation', v_new_evaluation_id, 'success',
    jsonb_build_object('previous_evaluation_id', p_evaluation_id, 'version', v_version + 1)
  );

  RETURN QUERY SELECT v_new_evaluation_id, v_version + 1, 'draft'::text;
END;
$$;

CREATE FUNCTION public.reject_audit_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs are append-only'
    USING ERRCODE = '42501';
END;
$$;

CREATE TRIGGER trg_audit_logs_immutable
  BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.reject_audit_log_mutation();

CREATE FUNCTION public.reserve_candidate(
  p_organization_id uuid,
  p_candidate_id uuid,
  p_requirement_id uuid
)
RETURNS TABLE (
  ownership_id uuid,
  candidate_id uuid,
  requirement_id uuid,
  recruiter_id uuid,
  expires_at timestamptz,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_candidate uuid;
  v_requirement_status text;
  v_expired_id uuid;
  v_expired_owner uuid;
  v_existing_id uuid;
  v_existing_owner uuid;
  v_existing_expiry timestamptz;
  v_ownership_id uuid;
  v_expires_at timestamptz;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '28000';
  END IF;

  IF NOT searchy_private.has_org_role(
    p_organization_id, ARRAY['recruiter', 'manager']
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT c.id INTO v_candidate
  FROM public.candidates c
  WHERE c.organization_id = p_organization_id
    AND c.id = p_candidate_id
    AND c.archived_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'candidate_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT searchy_private.has_org_role(p_organization_id, ARRAY['manager'])
     AND NOT searchy_private.can_access_candidate(p_organization_id, p_candidate_id) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT r.status INTO v_requirement_status
  FROM public.requirements r
  WHERE r.organization_id = p_organization_id
    AND r.id = p_requirement_id
    AND r.deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'requirement_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT searchy_private.can_access_requirement(p_organization_id, p_requirement_id) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF v_requirement_status <> 'open' THEN
    RAISE EXCEPTION 'requirement_not_open' USING ERRCODE = '23514';
  END IF;

  UPDATE public.candidate_ownership co
  SET status = 'expired',
      released_at = now(),
      released_by = v_actor,
      release_reason = 'lease_expired'
  WHERE co.organization_id = p_organization_id
    AND co.candidate_id = p_candidate_id
    AND co.requirement_id = p_requirement_id
    AND co.status = 'active'
    AND co.released_at IS NULL
    AND co.expires_at <= now()
  RETURNING co.id, co.recruiter_id INTO v_expired_id, v_expired_owner;

  IF v_expired_id IS NOT NULL THEN
    INSERT INTO public.ownership_history (
      organization_id, ownership_id, candidate_id, requirement_id,
      actor_id, previous_recruiter_id, new_recruiter_id, action, reason
    ) VALUES (
      p_organization_id, v_expired_id, p_candidate_id, p_requirement_id,
      v_actor, v_expired_owner, NULL, 'expired', 'lease_expired'
    );
  END IF;

  SELECT co.id, co.recruiter_id, co.expires_at
    INTO v_existing_id, v_existing_owner, v_existing_expiry
  FROM public.candidate_ownership co
  WHERE co.organization_id = p_organization_id
    AND co.candidate_id = p_candidate_id
    AND co.requirement_id = p_requirement_id
    AND co.status = 'active'
    AND co.released_at IS NULL
    AND co.expires_at > now()
  FOR UPDATE;

  IF FOUND THEN
    IF v_existing_owner = v_actor THEN
      RETURN QUERY
      SELECT v_existing_id, p_candidate_id, p_requirement_id, v_actor,
             v_existing_expiry, 'active'::text;
      RETURN;
    END IF;
    RAISE EXCEPTION 'candidate_already_reserved' USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.candidate_ownership (
    organization_id, candidate_id, requirement_id, recruiter_id, expires_at
  ) VALUES (
    p_organization_id, p_candidate_id, p_requirement_id, v_actor,
    now() + interval '7 days'
  )
  RETURNING id, candidate_ownership.expires_at
    INTO v_ownership_id, v_expires_at;

  INSERT INTO public.ownership_history (
    organization_id, ownership_id, candidate_id, requirement_id,
    actor_id, new_recruiter_id, action
  ) VALUES (
    p_organization_id, v_ownership_id, p_candidate_id, p_requirement_id,
    v_actor, v_actor, 'reserved'
  );

  INSERT INTO public.audit_logs (
    organization_id, actor_id, action, target_type, target_id, outcome, metadata
  ) VALUES (
    p_organization_id, v_actor, 'CANDIDATE_RESERVED', 'candidate_ownership',
    v_ownership_id, 'success',
    jsonb_build_object('candidate_id', p_candidate_id, 'requirement_id', p_requirement_id)
  );

  RETURN QUERY
  SELECT v_ownership_id, p_candidate_id, p_requirement_id, v_actor,
         v_expires_at, 'active'::text;
END;
$$;

CREATE FUNCTION public.renew_candidate_reservation(
  p_organization_id uuid,
  p_ownership_id uuid
)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_owner uuid;
  v_candidate uuid;
  v_requirement uuid;
  v_new_expiry timestamptz;
BEGIN
  IF v_actor IS NULL OR NOT searchy_private.has_org_role(
    p_organization_id, ARRAY['recruiter', 'manager']
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT co.recruiter_id, co.candidate_id, co.requirement_id
    INTO v_owner, v_candidate, v_requirement
  FROM public.candidate_ownership co
  WHERE co.organization_id = p_organization_id
    AND co.id = p_ownership_id
    AND co.status = 'active'
    AND co.released_at IS NULL
    AND co.expires_at > now()
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'active_reservation_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_owner <> v_actor
     AND NOT searchy_private.has_org_role(p_organization_id, ARRAY['manager']) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  UPDATE public.candidate_ownership
  SET expires_at = now() + interval '7 days'
  WHERE organization_id = p_organization_id
    AND id = p_ownership_id
  RETURNING candidate_ownership.expires_at INTO v_new_expiry;

  INSERT INTO public.ownership_history (
    organization_id, ownership_id, candidate_id, requirement_id,
    actor_id, previous_recruiter_id, new_recruiter_id, action
  ) VALUES (
    p_organization_id, p_ownership_id, v_candidate, v_requirement,
    v_actor, v_owner, v_owner, 'renewed'
  );

  INSERT INTO public.audit_logs (
    organization_id, actor_id, action, target_type, target_id, outcome, metadata
  ) VALUES (
    p_organization_id, v_actor, 'CANDIDATE_RESERVATION_RENEWED',
    'candidate_ownership', p_ownership_id, 'success',
    jsonb_build_object('candidate_id', v_candidate, 'requirement_id', v_requirement)
  );

  RETURN v_new_expiry;
END;
$$;

CREATE FUNCTION public.release_candidate_reservation(
  p_organization_id uuid,
  p_ownership_id uuid,
  p_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_owner uuid;
  v_candidate uuid;
  v_requirement uuid;
BEGIN
  IF v_actor IS NULL OR NOT searchy_private.has_org_role(
    p_organization_id, ARRAY['recruiter', 'manager']
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'release_reason_required' USING ERRCODE = '23514';
  END IF;

  SELECT co.recruiter_id, co.candidate_id, co.requirement_id
    INTO v_owner, v_candidate, v_requirement
  FROM public.candidate_ownership co
  WHERE co.organization_id = p_organization_id
    AND co.id = p_ownership_id
    AND co.status = 'active'
    AND co.released_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'active_reservation_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_owner <> v_actor
     AND NOT searchy_private.has_org_role(p_organization_id, ARRAY['manager']) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  UPDATE public.candidate_ownership
  SET status = 'released',
      released_at = now(),
      released_by = v_actor,
      release_reason = btrim(p_reason)
  WHERE organization_id = p_organization_id AND id = p_ownership_id;

  INSERT INTO public.ownership_history (
    organization_id, ownership_id, candidate_id, requirement_id,
    actor_id, previous_recruiter_id, action, reason
  ) VALUES (
    p_organization_id, p_ownership_id, v_candidate, v_requirement,
    v_actor, v_owner, 'released', btrim(p_reason)
  );

  INSERT INTO public.audit_logs (
    organization_id, actor_id, action, target_type, target_id, outcome, metadata
  ) VALUES (
    p_organization_id, v_actor, 'CANDIDATE_RESERVATION_RELEASED',
    'candidate_ownership', p_ownership_id, 'success',
    jsonb_build_object(
      'candidate_id', v_candidate,
      'requirement_id', v_requirement,
      'reason', btrim(p_reason)
    )
  );
END;
$$;

CREATE FUNCTION public.reassign_candidate_reservation(
  p_organization_id uuid,
  p_ownership_id uuid,
  p_new_recruiter_id uuid,
  p_reason text
)
RETURNS TABLE (
  ownership_id uuid,
  candidate_id uuid,
  requirement_id uuid,
  recruiter_id uuid,
  expires_at timestamptz,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_old_owner uuid;
  v_candidate uuid;
  v_requirement uuid;
  v_requirement_status text;
  v_new_ownership_id uuid;
  v_expiry timestamptz;
BEGIN
  IF v_actor IS NULL
     OR NOT searchy_private.has_org_role(p_organization_id, ARRAY['manager']) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'reassignment_reason_required' USING ERRCODE = '23514';
  END IF;
  IF NOT searchy_private.is_active_org_user(p_organization_id, p_new_recruiter_id)
     OR NOT EXISTS (
       SELECT 1 FROM public.organization_members m
       WHERE m.organization_id = p_organization_id
         AND m.user_id = p_new_recruiter_id
         AND m.role = 'recruiter'
         AND m.status = 'active'
     ) THEN
    RAISE EXCEPTION 'active_recruiter_required' USING ERRCODE = '23514';
  END IF;

  SELECT c.id INTO v_candidate
  FROM public.candidates c
  WHERE c.organization_id = p_organization_id
    AND c.archived_at IS NULL
    AND c.id = (
      SELECT co.candidate_id FROM public.candidate_ownership co
      WHERE co.organization_id = p_organization_id AND co.id = p_ownership_id
    )
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'candidate_not_found' USING ERRCODE = 'P0002';
  END IF;

  SELECT co.recruiter_id, co.candidate_id, co.requirement_id
    INTO v_old_owner, v_candidate, v_requirement
  FROM public.candidate_ownership co
  WHERE co.organization_id = p_organization_id
    AND co.id = p_ownership_id
    AND co.status = 'active'
    AND co.released_at IS NULL
    AND co.expires_at > now()
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'active_reservation_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_old_owner = p_new_recruiter_id THEN
    RAISE EXCEPTION 'recruiter_already_owns_reservation' USING ERRCODE = '23505';
  END IF;

  SELECT r.status INTO v_requirement_status
  FROM public.requirements r
  WHERE r.organization_id = p_organization_id AND r.id = v_requirement
  FOR UPDATE;
  IF NOT FOUND OR v_requirement_status <> 'open' THEN
    RAISE EXCEPTION 'requirement_not_open' USING ERRCODE = '23514';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.requirement_assignments ra
    WHERE ra.organization_id = p_organization_id
      AND ra.requirement_id = v_requirement
      AND ra.user_id = p_new_recruiter_id
      AND ra.unassigned_at IS NULL
  ) THEN
    RAISE EXCEPTION 'recruiter_not_assigned_to_requirement'
      USING ERRCODE = '23514';
  END IF;

  UPDATE public.candidate_ownership
  SET status = 'reassigned',
      released_at = now(),
      released_by = v_actor,
      release_reason = btrim(p_reason)
  WHERE organization_id = p_organization_id AND id = p_ownership_id;

  INSERT INTO public.ownership_history (
    organization_id, ownership_id, candidate_id, requirement_id,
    actor_id, previous_recruiter_id, new_recruiter_id, action, reason
  ) VALUES (
    p_organization_id, p_ownership_id, v_candidate, v_requirement,
    v_actor, v_old_owner, p_new_recruiter_id, 'reassigned', btrim(p_reason)
  );

  INSERT INTO public.candidate_ownership (
    organization_id, candidate_id, requirement_id, recruiter_id, expires_at
  ) VALUES (
    p_organization_id, v_candidate, v_requirement, p_new_recruiter_id,
    now() + interval '7 days'
  )
  RETURNING id, candidate_ownership.expires_at
    INTO v_new_ownership_id, v_expiry;

  INSERT INTO public.ownership_history (
    organization_id, ownership_id, candidate_id, requirement_id,
    actor_id, previous_recruiter_id, new_recruiter_id, action, reason
  ) VALUES (
    p_organization_id, v_new_ownership_id, v_candidate, v_requirement,
    v_actor, v_old_owner, p_new_recruiter_id, 'reserved', btrim(p_reason)
  );

  INSERT INTO public.audit_logs (
    organization_id, actor_id, action, target_type, target_id, outcome, metadata
  ) VALUES (
    p_organization_id, v_actor, 'CANDIDATE_RESERVATION_REASSIGNED',
    'candidate_ownership', v_new_ownership_id, 'success',
    jsonb_build_object(
      'candidate_id', v_candidate,
      'requirement_id', v_requirement,
      'previous_recruiter_id', v_old_owner,
      'new_recruiter_id', p_new_recruiter_id,
      'reason', btrim(p_reason)
    )
  );

  RETURN QUERY
  SELECT v_new_ownership_id, v_candidate, v_requirement, p_new_recruiter_id,
         v_expiry, 'active'::text;
END;
$$;

-- Private resume bucket; actual file-size limit is deployment-configured after approval.
INSERT INTO storage.buckets (id, name, public)
VALUES ('searchy-resumes', 'searchy-resumes', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY searchy_resumes_read_authorized ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'searchy-resumes'
    AND searchy_private.can_access_candidate_storage_path(name)
  );
CREATE POLICY searchy_resumes_insert_authorized ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'searchy-resumes'
    AND searchy_private.can_access_candidate_storage_path(name)
  );
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

GRANT UPDATE ON public.organizations TO authenticated;
GRANT INSERT, UPDATE ON public.organization_members TO authenticated;
GRANT INSERT, UPDATE ON public.clients TO authenticated;
GRANT INSERT, UPDATE ON public.requirements TO authenticated;
GRANT INSERT, UPDATE ON public.requirement_assignments TO authenticated;
GRANT INSERT, UPDATE ON public.candidates TO authenticated;
GRANT INSERT ON public.resumes TO authenticated;
GRANT INSERT ON public.skills TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.candidate_skills TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.requirement_skills TO authenticated;
GRANT INSERT, UPDATE ON public.candidate_shares TO authenticated;
GRANT INSERT, UPDATE ON public.candidate_access_grants TO authenticated;
GRANT INSERT, UPDATE ON public.submissions TO authenticated;
GRANT INSERT, UPDATE ON public.interviews TO authenticated;
GRANT INSERT, UPDATE ON public.interview_questions TO authenticated;
GRANT INSERT, UPDATE ON public.interview_evaluations TO authenticated;
GRANT INSERT, UPDATE ON public.interview_evaluation_scores TO authenticated;
GRANT INSERT, UPDATE ON public.followups TO authenticated;
GRANT INSERT, UPDATE ON public.communications TO authenticated;
GRANT UPDATE (read_at) ON public.notifications TO authenticated;

REVOKE ALL ON FUNCTION searchy_private.is_active_org_member(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION searchy_private.is_active_org_user(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION searchy_private.has_org_role(uuid, text[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION searchy_private.can_access_requirement(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION searchy_private.can_access_candidate(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION searchy_private.can_access_resume(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION searchy_private.can_access_submission(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION searchy_private.can_access_interview(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION searchy_private.can_access_evaluation(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION searchy_private.can_access_candidate_storage_path(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reserve_candidate(uuid, uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.renew_candidate_reservation(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.release_candidate_reservation(uuid, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reassign_candidate_reservation(uuid, uuid, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.confirm_resume_parse(uuid, uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_evaluation_revision(uuid, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION searchy_private.is_active_org_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION searchy_private.is_active_org_user(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION searchy_private.has_org_role(uuid, text[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION searchy_private.can_access_requirement(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION searchy_private.can_access_candidate(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION searchy_private.can_access_resume(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION searchy_private.can_access_submission(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION searchy_private.can_access_interview(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION searchy_private.can_access_evaluation(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION searchy_private.can_access_candidate_storage_path(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reserve_candidate(uuid, uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.renew_candidate_reservation(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.release_candidate_reservation(uuid, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reassign_candidate_reservation(uuid, uuid, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.confirm_resume_parse(uuid, uuid, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_evaluation_revision(uuid, uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.audit_row_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.require_open_requirement_for_submission() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_submission_transition() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_interview_transition() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_followup_transition() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_evaluation_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_interview_schedule_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_evaluation_score() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reject_audit_log_mutation() FROM PUBLIC, anon, authenticated;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.audit_logs FROM anon, authenticated;
REVOKE UPDATE, DELETE, TRUNCATE ON public.ownership_history FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.candidate_ownership FROM anon, authenticated;
