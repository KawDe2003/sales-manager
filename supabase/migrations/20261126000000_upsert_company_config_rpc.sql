-- RPC helper to persist company/branding configuration in user_profiles
-- Handles cases where the active team_members.id is not in auth.users (avoids FK 23503)
CREATE OR REPLACE FUNCTION public.upsert_company_config(
  p_config jsonb,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_now timestamptz := now();
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Authentication required');
  END IF;

  INSERT INTO public.user_profiles (user_id, config, updated_at)
  VALUES (v_uid, COALESCE(p_config, '{}'::jsonb), v_now)
  ON CONFLICT (user_id) DO UPDATE
    SET config = EXCLUDED.config,
        updated_at = v_now;

  -- Keep existing profile rows aligned with shared company branding
  UPDATE public.user_profiles
  SET config = COALESCE(p_config, '{}'::jsonb),
      updated_at = v_now
  WHERE user_id <> v_uid;

  RETURN jsonb_build_object('ok', true, 'updated_at', v_now);
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_company_config(jsonb, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_company_config(jsonb, uuid) TO authenticated;
