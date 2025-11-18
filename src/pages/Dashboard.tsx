import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Smile, Meh, Frown, TrendingUp, Users, Brain } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const Dashboard = () => {
  // Mock data for demonstration
  const emotionTrendData = [
    { day: "Mon", happy: 65, neutral: 25, sad: 10 },
    { day: "Tue", happy: 70, neutral: 20, sad: 10 },
    { day: "Wed", happy: 55, neutral: 30, sad: 15 },
    { day: "Thu", happy: 75, neutral: 15, sad: 10 },
    { day: "Fri", happy: 80, neutral: 15, sad: 5 },
  ];

  const engagementData = [
    { name: "Voice", value: 45 },
    { name: "Cards", value: 35 },
    { name: "Text", value: 20 },
  ];

  const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--muted))"];

  const students = [
    { name: "Emma Wilson", emotion: "happy", engagement: 92, sessions: 12 },
    { name: "Liam Chen", emotion: "neutral", engagement: 78, sessions: 10 },
    { name: "Sophia Martinez", emotion: "happy", engagement: 88, sessions: 15 },
    { name: "Noah Johnson", emotion: "neutral", engagement: 75, sessions: 8 },
    { name: "Olivia Brown", emotion: "sad", engagement: 65, sessions: 9 },
  ];

  const emotionIcons = {
    happy: <Smile className="h-5 w-5 text-emotion-happy" />,
    neutral: <Meh className="h-5 w-5 text-emotion-neutral" />,
    sad: <Frown className="h-5 w-5 text-emotion-sad" />,
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Teacher Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor emotional trends, engagement, and student progress
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Students</p>
                <p className="text-3xl font-bold">24</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-success">
              <TrendingUp className="h-4 w-4 mr-1" />
              <span>+12% from last week</span>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Avg. Engagement</p>
                <p className="text-3xl font-bold">82%</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center">
                <Brain className="h-6 w-6 text-accent" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-success">
              <TrendingUp className="h-4 w-4 mr-1" />
              <span>+5% improvement</span>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Positive Mood</p>
                <p className="text-3xl font-bold">71%</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-emotion-happy/10 flex items-center justify-center">
                <Smile className="h-6 w-6 text-emotion-happy" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-success">
              <TrendingUp className="h-4 w-4 mr-1" />
              <span>+8% this week</span>
            </div>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Emotion Trends */}
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

          {/* Engagement Distribution */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-6">Communication Methods</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={engagementData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
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
          <div className="space-y-4">
            {students.map((student, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                    {student.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div>
                    <p className="font-medium">{student.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {student.sessions} sessions this week
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
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
