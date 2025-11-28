import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, Clock, Languages, Sparkles } from "lucide-react";

interface StudentMessage {
  id: string;
  student_id: string;
  student_name: string;
  original_text: string;
  simplified_text: string | null;
  translated_text: string | null;
  language_code: string;
  created_at: string;
  is_read: boolean;
}

interface StudentMessagesPanelProps {
  teacherId: string;
}

const StudentMessagesPanel = ({ teacherId }: StudentMessagesPanelProps) => {
  const [messages, setMessages] = useState<StudentMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchMessages();

    // Subscribe to real-time message updates
    const channel = supabase
      .channel('teacher-student-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'student_teacher_messages',
          filter: `teacher_id=eq.${teacherId}`,
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teacherId]);

  const fetchMessages = async () => {
    const { data: messageData, error } = await supabase
      .from('student_teacher_messages')
      .select(`
        id,
        student_id,
        original_text,
        simplified_text,
        translated_text,
        language_code,
        created_at,
        is_read,
        profiles!student_teacher_messages_student_id_fkey(full_name)
      `)
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    const formattedMessages = messageData?.map((msg: any) => ({
      id: msg.id,
      student_id: msg.student_id,
      student_name: msg.profiles?.full_name || 'Unknown Student',
      original_text: msg.original_text,
      simplified_text: msg.simplified_text,
      translated_text: msg.translated_text,
      language_code: msg.language_code,
      created_at: msg.created_at,
      is_read: msg.is_read,
    })) || [];

    setMessages(formattedMessages);
    setUnreadCount(formattedMessages.filter(m => !m.is_read).length);
  };

  const markAsRead = async (messageId: string) => {
    await supabase
      .from('student_teacher_messages')
      .update({ is_read: true })
      .eq('id', messageId);
    
    fetchMessages();
  };

  const timeAgo = (timestamp: string) => {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const getLanguageName = (code: string) => {
    const languages: Record<string, string> = {
      'en-US': 'English',
      'hi-IN': 'Hindi',
      'ta-IN': 'Tamil',
      'te-IN': 'Telugu',
      'bn-IN': 'Bengali',
      'mr-IN': 'Marathi',
      'gu-IN': 'Gujarati',
      'kn-IN': 'Kannada',
      'ml-IN': 'Malayalam',
      'pa-IN': 'Punjabi',
      'ur-IN': 'Urdu',
    };
    return languages[code] || code;
  };

  return (
    <Card className="p-6 border-2">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          Student Messages (AI-Processed)
        </h3>
        {unreadCount > 0 && (
          <Badge variant="default" className="bg-primary">
            {unreadCount} New
          </Badge>
        )}
      </div>

      {messages.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          No messages yet. Students&apos; speech will appear here after AI processing.
        </p>
      ) : (
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                onClick={() => !message.is_read && markAsRead(message.id)}
                className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                  message.is_read
                    ? 'bg-background border-border'
                    : 'bg-primary/5 border-primary/50 hover:bg-primary/10'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">
                      {message.student_name}
                    </span>
                    {!message.is_read && (
                      <Badge variant="default" className="text-xs">New</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {timeAgo(message.created_at)}
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Original Speech */}
                  <div className="bg-muted/50 p-3 rounded-md">
                    <div className="flex items-center gap-2 mb-1">
                      <Languages className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">
                        Original ({getLanguageName(message.language_code)})
                      </span>
                    </div>
                    <p className="text-sm text-foreground italic">
                      &quot;{message.original_text}&quot;
                    </p>
                  </div>

                  {/* AI-Simplified Version */}
                  {message.simplified_text && (
                    <div className="bg-primary/5 p-3 rounded-md border border-primary/20">
                      <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="h-3 w-3 text-primary" />
                        <span className="text-xs font-medium text-primary">
                          AI-Simplified (Clear & Structured)
                        </span>
                      </div>
                      <p className="text-sm text-foreground font-medium">
                        {message.simplified_text}
                      </p>
                    </div>
                  )}

                  {/* Translated Version */}
                  {message.translated_text && (
                    <div className="bg-accent/30 p-3 rounded-md border border-accent">
                      <div className="flex items-center gap-2 mb-1">
                        <Languages className="h-3 w-3 text-accent-foreground" />
                        <span className="text-xs font-medium text-accent-foreground">
                          Translated
                        </span>
                      </div>
                      <p className="text-sm text-foreground">
                        {message.translated_text}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </Card>
  );
};

export default StudentMessagesPanel;
