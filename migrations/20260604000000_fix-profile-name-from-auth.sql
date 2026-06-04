-- Backfill full_name for existing profiles from auth.users.
-- Insforge stores user data in a "profile" JSON column (not raw_user_meta_data).

UPDATE public.profiles p
SET full_name = COALESCE(
  NULLIF(TRIM(u.profile->>'full_name'),   ''),
  NULLIF(TRIM(u.profile->>'name'),         ''),
  NULLIF(TRIM(u.profile->>'display_name'), ''),
  NULLIF(TRIM(u.metadata->>'full_name'),   ''),
  NULLIF(TRIM(u.metadata->>'name'),        '')
)
FROM auth.users u
WHERE p.id = u.id
  AND (p.full_name IS NULL OR TRIM(p.full_name) = '');

-- Fix the trigger so future signups capture the name correctly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(
      NULLIF(TRIM(new.profile->>'full_name'),   ''),
      NULLIF(TRIM(new.profile->>'name'),         ''),
      NULLIF(TRIM(new.profile->>'display_name'), ''),
      NULLIF(TRIM(new.metadata->>'full_name'),   ''),
      NULLIF(TRIM(new.metadata->>'name'),        '')
    )
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
