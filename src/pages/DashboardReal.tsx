import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Smile, Meh, Frown, TrendingUp, Users, Brain } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import AddStudentDialog from "@/components/AddStudentDialog";
import SendInstructionDialog from "@/components/SendInstructionDialog";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface Student {
  id: string;
  full_name: string;
  email: string;
}

interface EmotionLog {
  emotion_type: string;
  detected_at: string;
  student_id: string;
}

interface Session {
  id: string;
  student_id: string;
  started_at: string;
}

interface Message {
  message_type: string;
  student_id: string;
}

const DashboardReal = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [emotionLogs, setEmotionLogs] = useState<EmotionLog[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/login');
      } else if (profile && profile.user_type !== 'teacher') {
        toast({
          title: "Access Denied",
          description: "This page is only accessible to teachers.",
          variant: "destructive"
        });
        navigate('/student');
      }
    }
  }, [user, profile, authLoading, navigate, toast]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // Fetch students linked to this teacher
      const { data: teacherStudents } = await supabase
        .from('teacher_students')
        .select('student_id')
        .eq('teacher_id', user?.id);

      const studentIds = teacherStudents?.map(ts => ts.student_id) || [];

      if (studentIds.length > 0) {
        // Fetch student profiles
        const { data: studentsData } = await supabase
          .from('profiles')
          .select('*')
          .in('id', studentIds);

        // Fetch emotion logs
        const { data: emotionsData } = await supabase
          .from('emotion_logs')
          .select('*')
          .in('student_id', studentIds)
          .order('detected_at', { ascending: false });

        // Fetch sessions
        const { data: sessionsData } = await supabase
          .from('communication_sessions')
          .select('*')
          .in('student_id', studentIds);

        // Fetch messages
        const { data: messagesData } = await supabase
          .from('communication_messages')
          .select('*')
          .in('student_id', studentIds);

        setStudents(studentsData || []);
        setEmotionLogs(emotionsData || []);
        setSessions(sessionsData || []);
        setMessages(messagesData || []);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate emotion trends for the last 7 days
  const getEmotionTrends = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d;
    });

    return last7Days.map(date => {
      const dayLogs = emotionLogs.filter(log => {
        const logDate = new Date(log.detected_at);
        return logDate.toDateString() === date.toDateString();
      });

      const happy = dayLogs.filter(l => ['happy', 'surprised'].includes(l.emotion_type)).length;
      const neutral = dayLogs.filter(l => l.emotion_type === 'neutral').length;
      const sad = dayLogs.filter(l => ['sad', 'angry', 'fearful', 'disgusted'].includes(l.emotion_type)).length;
      const total = dayLogs.length || 1;

      return {
        day: days[date.getDay()],
        happy: Math.round((happy / total) * 100),
        neutral: Math.round((neutral / total) * 100),
        sad: Math.round((sad / total) * 100),
      };
    });
  };

  // Calculate communication method distribution
  const getEngagementData = () => {
    const voice = messages.filter(m => m.message_type === 'voice' || m.message_type === 'text').length;
    const cards = messages.filter(m => m.message_type === 'visual_card').length;
    const total = messages.length || 1;

    return [
      { name: "Voice/Text", value: Math.round((voice / total) * 100) },
      { name: "Visual Cards", value: Math.round((cards / total) * 100) },
    ];
  };

  // Calculate student stats
  const getStudentStats = () => {
    return students.map(student => {
      const studentSessions = sessions.filter(s => s.student_id === student.id);
      const studentEmotions = emotionLogs.filter(e => e.student_id === student.id);
      const recentEmotions = studentEmotions.slice(0, 10);
      
      const happyCount = recentEmotions.filter(e => ['happy', 'surprised'].includes(e.emotion_type)).length;
      const dominantEmotion = happyCount > 5 ? 'happy' : happyCount < 3 ? 'sad' : 'neutral';
      
      const engagement = studentSessions.length > 0 ? Math.min(100, studentSessions.length * 10) : 0;

      return {
        ...student,
        emotion: dominantEmotion,
        engagement,
        sessions: studentSessions.length,
      };
    });
  };

  const emotionTrendData = getEmotionTrends();
  const engagementData = getEngagementData();
  const studentStats = getStudentStats();

  const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))"];

  const emotionIcons = {
    happy: <Smile className="h-5 w-5 text-emotion-happy" />,
    neutral: <Meh className="h-5 w-5 text-emotion-neutral" />,
    sad: <Frown className="h-5 w-5 text-emotion-sad" />,
  };

  // Calculate aggregate stats
  const totalStudents = students.length;
  const avgEngagement = studentStats.length > 0
    ? Math.round(studentStats.reduce((sum, s) => sum + s.engagement, 0) / studentStats.length)
    : 0;
  const positiveEmotions = emotionLogs.filter(e => ['happy', 'surprised'].includes(e.emotion_type)).length;
  const positiveMoodPercent = emotionLogs.length > 0
    ? Math.round((positiveEmotions / emotionLogs.length) * 100)
    : 0;

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container px-4 py-8 max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Teacher Dashboard</h1>
            <p className="text-muted-foreground">
              Monitor emotional trends, engagement, and student progress
            </p>
          </div>
          {user && <AddStudentDialog teacherId={user.id} onStudentAdded={fetchDashboardData} />}
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Students</p>
                <p className="text-3xl font-bold">{totalStudents}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Avg. Engagement</p>
                <p className="text-3xl font-bold">{avgEngagement}%</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center">
                <Brain className="h-6 w-6 text-accent" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Positive Mood</p>
                <p className="text-3xl font-bold">{positiveMoodPercent}%</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-emotion-happy/10 flex items-center justify-center">
                <Smile className="h-6 w-6 text-emotion-happy" />
              </div>
            </div>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-6">Weekly Emotion Trends</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={emotionTrendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="day" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="happy"
                  stroke="hsl(var(--emotion-happy))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--emotion-happy))" }}
                />
                <Line
                  type="monotone"
                  dataKey="neutral"
                  stroke="hsl(var(--emotion-neutral))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--emotion-neutral))" }}
                />
                <Line
                  type="monotone"
                  dataKey="sad"
                  stroke="hsl(var(--emotion-sad))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--emotion-sad))" }}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-emotion-happy" />
                <span className="text-sm">Happy</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-emotion-neutral" />
                <span className="text-sm">Neutral</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-emotion-sad" />
                <span className="text-sm">Sad</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-6">Communication Methods</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={engagementData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {engagementData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Student List */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-6">Student Overview</h2>
          {studentStats.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No students assigned yet. Add students to see their progress.
            </p>
          ) : (
            <div className="space-y-4">
              {studentStats.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                      {student.full_name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div>
                      <p className="font-medium">{student.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {student.sessions} sessions
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Engagement</p>
                      <p className="font-semibold">{student.engagement}%</p>
                    </div>
                    <Badge variant="outline" className="flex items-center gap-2">
                      {emotionIcons[student.emotion as keyof typeof emotionIcons]}
                      <span className="capitalize">{student.emotion}</span>
                    </Badge>
                    <SendInstructionDialog 
                      studentId={student.id} 
                      studentName={student.full_name}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default DashboardReal;
