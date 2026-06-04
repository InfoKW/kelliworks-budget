-- SECURITY DEFINER function so the admin API can upsert any client's profile
-- without being blocked by RLS (which only lets users update their own row).

CREATE OR REPLACE FUNCTION public.upsert_client_profile(
  p_id uuid,
  p_email text,
  p_full_name text,
  p_role text DEFAULT 'client'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (p_id, p_email, p_full_name, p_role)
  ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        email = EXCLUDED.email;
END;
$$;
