-- Create teacher_instructions table for sending assignments/instructions to students
CREATE TABLE public.teacher_instructions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  original_instruction TEXT NOT NULL,
  simplified_instruction TEXT,
  subject TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.teacher_instructions ENABLE ROW LEVEL SECURITY;

-- Teachers can create and view their own instructions
CREATE POLICY "Teachers can create instructions"
  ON public.teacher_instructions
  FOR INSERT
  WITH CHECK (auth.uid() = teacher_id AND is_teacher(auth.uid()));

CREATE POLICY "Teachers can view their own instructions"
  ON public.teacher_instructions
  FOR SELECT
  USING (auth.uid() = teacher_id AND is_teacher(auth.uid()));

CREATE POLICY "Teachers can update their own instructions"
  ON public.teacher_instructions
  FOR UPDATE
  USING (auth.uid() = teacher_id AND is_teacher(auth.uid()));

CREATE POLICY "Teachers can delete their own instructions"
  ON public.teacher_instructions
  FOR DELETE
  USING (auth.uid() = teacher_id AND is_teacher(auth.uid()));

-- Students can view instructions sent to them
CREATE POLICY "Students can view their instructions"
  ON public.teacher_instructions
  FOR SELECT
  USING (auth.uid() = student_id);

-- Students can mark instructions as read
CREATE POLICY "Students can mark instructions as read"
  ON public.teacher_instructions
  FOR UPDATE
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

-- Add trigger for updated_at
CREATE TRIGGER update_teacher_instructions_updated_at
  BEFORE UPDATE ON public.teacher_instructions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_teacher_instructions_student_id ON public.teacher_instructions(student_id);
CREATE INDEX idx_teacher_instructions_teacher_id ON public.teacher_instructions(teacher_id);
CREATE INDEX idx_teacher_instructions_created_at ON public.teacher_instructions(created_at DESC);