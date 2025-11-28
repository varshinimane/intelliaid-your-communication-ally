-- Create table for student-to-teacher messages (processed speech communications)
CREATE TABLE IF NOT EXISTS public.student_teacher_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  original_text TEXT NOT NULL,
  simplified_text TEXT,
  translated_text TEXT,
  language_code TEXT DEFAULT 'en-US',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_read BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE public.student_teacher_messages ENABLE ROW LEVEL SECURITY;

-- Students can create messages to their teachers
CREATE POLICY "Students can send messages to their teachers"
ON public.student_teacher_messages
FOR INSERT
WITH CHECK (
  auth.uid() = student_id AND
  EXISTS (
    SELECT 1 FROM public.teacher_students
    WHERE teacher_students.teacher_id = student_teacher_messages.teacher_id
    AND teacher_students.student_id = student_teacher_messages.student_id
  )
);

-- Students can view their own sent messages
CREATE POLICY "Students can view their own messages"
ON public.student_teacher_messages
FOR SELECT
USING (auth.uid() = student_id);

-- Teachers can view messages from their students
CREATE POLICY "Teachers can view messages from their students"
ON public.student_teacher_messages
FOR SELECT
USING (
  auth.uid() = teacher_id AND
  EXISTS (
    SELECT 1 FROM public.teacher_students
    WHERE teacher_students.teacher_id = student_teacher_messages.teacher_id
    AND teacher_students.student_id = student_teacher_messages.student_id
  )
);

-- Teachers can mark messages as read
CREATE POLICY "Teachers can mark messages as read"
ON public.student_teacher_messages
FOR UPDATE
USING (auth.uid() = teacher_id);

-- Add trigger for updated_at if needed in future
CREATE INDEX IF NOT EXISTS idx_student_teacher_messages_teacher_id ON public.student_teacher_messages(teacher_id);
CREATE INDEX IF NOT EXISTS idx_student_teacher_messages_student_id ON public.student_teacher_messages(student_id);
CREATE INDEX IF NOT EXISTS idx_student_teacher_messages_created_at ON public.student_teacher_messages(created_at DESC);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_teacher_messages;