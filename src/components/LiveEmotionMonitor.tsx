import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Brain, Clock } from "lucide-react";

interface StudentEmotion {
  student_id: string;
  student_name: string;
  emotion_type: string;
  confidence_score: number;
  detected_at: string;
  context: string;
}

interface LiveEmotionMonitorProps {
  teacherId: string;
}

const LiveEmotionMonitor = ({ teacherId }: LiveEmotionMonitorProps) => {
  const [liveEmotions, setLiveEmotions] = useState<StudentEmotion[]>([]);
  const [alerts, setAlerts] = useState<StudentEmotion[]>([]);
  const { toast } = useToast();

  const getEmotionColor = (emotion: string) => {
    const colors: Record<string, string> = {
      happy: 'text-emotion-happy bg-emotion-happy/10 border-emotion-happy',
      sad: 'text-emotion-sad bg-emotion-sad/10 border-emotion-sad',
      angry: 'text-emotion-angry bg-emotion-angry/10 border-emotion-angry',
      fearful: 'text-emotion-fearful bg-emotion-fearful/10 border-emotion-fearful',
      surprised: 'text-emotion-surprised bg-emotion-surprised/10 border-emotion-surprised',
      neutral: 'text-emotion-neutral bg-emotion-neutral/10 border-emotion-neutral',
      disgusted: 'text-muted-foreground bg-muted border-muted',
    };
    return colors[emotion] || colors.neutral;
  };

  const getEmotionEmoji = (emotion: string) => {
    const emojis: Record<string, string> = {
      happy: '😊',
      sad: '😢',
      angry: '😡',
      fearful: '😰',
      surprised: '😲',
      disgusted: '🤢',
      neutral: '😐',
    };
    return emojis[emotion] || '😐';
  };

  const isConcerningEmotion = (emotion: string) => {
    return ['sad', 'angry', 'fearful', 'disgusted'].includes(emotion);
  };

  useEffect(() => {
    // Fetch initial recent emotions (last 5 minutes)
    const fetchRecentEmotions = async () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const { data: students } = await supabase
        .from('teacher_students')
        .select('student_id')
        .eq('teacher_id', teacherId);

      if (!students || students.length === 0) return;

      const studentIds = students.map(s => s.student_id);

      const { data: emotions, error } = await supabase
        .from('emotion_logs')
        .select(`
          student_id,
          emotion_type,
          confidence_score,
          detected_at,
          context,
          profiles!inner(full_name)
        `)
        .in('student_id', studentIds)
        .gte('detected_at', fiveMinutesAgo)
        .order('detected_at', { ascending: false });

      if (error) {
        console.error('Error fetching emotions:', error);
        return;
      }

      // Get latest emotion per student
      const latestEmotions = new Map<string, StudentEmotion>();
      emotions?.forEach((emotion: any) => {
        if (!latestEmotions.has(emotion.student_id)) {
          latestEmotions.set(emotion.student_id, {
            student_id: emotion.student_id,
            student_name: emotion.profiles.full_name,
            emotion_type: emotion.emotion_type,
            confidence_score: emotion.confidence_score,
            detected_at: emotion.detected_at,
            context: emotion.context,
          });
        }
      });

      setLiveEmotions(Array.from(latestEmotions.values()));
    };

    fetchRecentEmotions();

    // Subscribe to real-time emotion updates
    const channel = supabase
      .channel('teacher-emotion-monitor')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'emotion_logs',
        },
        async (payload) => {
          // Fetch student details
          const { data: student } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', payload.new.student_id)
            .single();

          // Check if this student belongs to the teacher
          const { data: relationship } = await supabase
            .from('teacher_students')
            .select('id')
            .eq('teacher_id', teacherId)
            .eq('student_id', payload.new.student_id)
            .maybeSingle();

          if (!relationship || !student) return;

          const newEmotion: StudentEmotion = {
            student_id: payload.new.student_id,
            student_name: student.full_name,
            emotion_type: payload.new.emotion_type,
            confidence_score: payload.new.confidence_score,
            detected_at: payload.new.detected_at,
            context: payload.new.context || 'idle',
          };

          // Update live emotions
          setLiveEmotions((prev) => {
            const filtered = prev.filter(e => e.student_id !== newEmotion.student_id);
            return [newEmotion, ...filtered];
          });

          // Create alert for concerning emotions
          if (isConcerningEmotion(newEmotion.emotion_type)) {
            setAlerts((prev) => [newEmotion, ...prev].slice(0, 5));
            
            toast({
              title: "⚠️ Student Needs Attention",
              description: `${newEmotion.student_name} is feeling ${newEmotion.emotion_type}`,
              variant: "destructive",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teacherId, toast]);

  const timeAgo = (timestamp: string) => {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div className="space-y-6">
      {/* Alerts Section */}
      {alerts.length > 0 && (
        <Card className="p-6 border-2 border-destructive/50">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Recent Emotion Alerts
          </h3>
          <div className="space-y-3">
            {alerts.map((alert, index) => (
              <Alert key={`${alert.student_id}-${index}`} variant="destructive">
                <AlertDescription className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getEmotionEmoji(alert.emotion_type)}</span>
                    <div>
                      <p className="font-medium">{alert.student_name}</p>
                      <p className="text-sm opacity-90">
                        Feeling {alert.emotion_type} • {Math.round(alert.confidence_score * 100)}% confident
                      </p>
                    </div>
                  </div>
                  <span className="text-sm flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {timeAgo(alert.detected_at)}
                  </span>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        </Card>
      )}

      {/* Live Monitor */}
      <Card className="p-6 border-2">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          Live Emotion Monitor
        </h3>
        
        {liveEmotions.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No active student sessions. Emotions will appear here when students are using the platform.
          </p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {liveEmotions.map((emotion) => (
              <div
                key={emotion.student_id}
                className={`p-4 rounded-lg border-2 ${getEmotionColor(emotion.emotion_type)}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium">{emotion.student_name}</p>
                  <span className="text-2xl">{getEmotionEmoji(emotion.emotion_type)}</span>
                </div>
                <div className="space-y-1">
                  <Badge variant="outline" className="capitalize">
                    {emotion.emotion_type}
                  </Badge>
                  <p className="text-xs opacity-75">
                    {Math.round(emotion.confidence_score * 100)}% confidence
                  </p>
                  <p className="text-xs opacity-75 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {timeAgo(emotion.detected_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default LiveEmotionMonitor;
