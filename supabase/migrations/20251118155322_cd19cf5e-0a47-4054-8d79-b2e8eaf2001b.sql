-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table for both students and teachers
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('student', 'teacher')),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Teacher-Student relationships table (create before policies reference it)
CREATE TABLE public.teacher_students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(teacher_id, student_id)
);

ALTER TABLE public.teacher_students ENABLE ROW LEVEL SECURITY;

-- Now create policies that reference teacher_students
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Teachers can view student profiles"
  ON public.profiles FOR SELECT
  USING (
    user_type = 'student' AND
    EXISTS (
      SELECT 1 FROM public.teacher_students
      WHERE teacher_id = auth.uid()
      AND student_id = profiles.id
    )
  );

-- Teacher-Student relationship policies
CREATE POLICY "Teachers can view their students"
  ON public.teacher_students FOR SELECT
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can add students"
  ON public.teacher_students FOR INSERT
  WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can remove students"
  ON public.teacher_students FOR DELETE
  USING (auth.uid() = teacher_id);

-- Communication sessions table
CREATE TABLE public.communication_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  session_duration INTEGER,
  language_code TEXT DEFAULT 'en',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.communication_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own sessions"
  ON public.communication_sessions FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view their students' sessions"
  ON public.communication_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.teacher_students
      WHERE teacher_id = auth.uid()
      AND student_id = communication_sessions.student_id
    )
  );

CREATE POLICY "Students can create their own sessions"
  ON public.communication_sessions FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- Emotion logs table
CREATE TABLE public.emotion_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.communication_sessions(id) ON DELETE CASCADE,
  emotion_type TEXT NOT NULL CHECK (emotion_type IN ('happy', 'neutral', 'sad', 'stressed', 'excited', 'frustrated')),
  confidence_score DECIMAL(3, 2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  context TEXT
);

ALTER TABLE public.emotion_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own emotion logs"
  ON public.emotion_logs FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view their students' emotion logs"
  ON public.emotion_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.teacher_students
      WHERE teacher_id = auth.uid()
      AND student_id = emotion_logs.student_id
    )
  );

CREATE POLICY "Students can create their own emotion logs"
  ON public.emotion_logs FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- Communication messages table
CREATE TABLE public.communication_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.communication_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL CHECK (message_type IN ('text', 'speech', 'visual_card')),
  original_text TEXT,
  translated_text TEXT,
  simplified_text TEXT,
  language_code TEXT DEFAULT 'en',
  visual_card_data JSONB,
  audio_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.communication_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own messages"
  ON public.communication_messages FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view their students' messages"
  ON public.communication_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.teacher_students
      WHERE teacher_id = auth.uid()
      AND student_id = communication_messages.student_id
    )
  );

CREATE POLICY "Students can create their own messages"
  ON public.communication_messages FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- Create indexes for better performance
CREATE INDEX idx_sessions_student ON public.communication_sessions(student_id);
CREATE INDEX idx_emotions_student ON public.emotion_logs(student_id);
CREATE INDEX idx_emotions_session ON public.emotion_logs(session_id);
CREATE INDEX idx_messages_session ON public.communication_messages(session_id);
CREATE INDEX idx_messages_student ON public.communication_messages(student_id);
CREATE INDEX idx_teacher_students_teacher ON public.teacher_students(teacher_id);
CREATE INDEX idx_teacher_students_student ON public.teacher_students(student_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, user_type)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'student')
  );
  RETURN NEW;
END;
$$;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();