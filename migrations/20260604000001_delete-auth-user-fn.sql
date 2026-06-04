-- SECURITY DEFINER function so the API can delete a user from auth.users.
-- Direct DELETE on auth.users is blocked for anon/service clients in Insforge.

CREATE OR REPLACE FUNCTION public.delete_auth_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

