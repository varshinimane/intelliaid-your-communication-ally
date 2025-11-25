-- Allow teachers to search for student profiles by email
-- This enables the "Add Student" feature where teachers need to discover students before linking them
CREATE POLICY "Teachers can search for students"
ON public.profiles
FOR SELECT
USING (
  user_type = 'student' 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.user_type = 'teacher'
  )
);