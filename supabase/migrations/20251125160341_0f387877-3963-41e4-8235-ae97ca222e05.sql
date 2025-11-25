-- Add student response fields to teacher_instructions
ALTER TABLE public.teacher_instructions 
ADD COLUMN student_response text,
ADD COLUMN completed_at timestamp with time zone;

-- Update RLS policy to allow students to submit responses
DROP POLICY IF EXISTS "Students can mark instructions as read" ON public.teacher_instructions;

CREATE POLICY "Students can update their instructions" 
ON public.teacher_instructions 
FOR UPDATE 
USING (auth.uid() = student_id)
WITH CHECK (auth.uid() = student_id);