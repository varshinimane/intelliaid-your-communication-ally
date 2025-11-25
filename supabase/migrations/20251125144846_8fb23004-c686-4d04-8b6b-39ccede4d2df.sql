-- Drop the problematic policy
DROP POLICY IF EXISTS "Teachers can search for students" ON public.profiles;

-- Create a security definer function to check if user is a teacher
CREATE OR REPLACE FUNCTION public.is_teacher(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
    AND user_type = 'teacher'
  )
$$;

-- Now create the policy using the function (prevents infinite recursion)
CREATE POLICY "Teachers can search for students"
ON public.profiles
FOR SELECT
USING (
  user_type = 'student' 
  AND public.is_teacher(auth.uid())
);