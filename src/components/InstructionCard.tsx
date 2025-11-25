import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Eye, EyeOff, BookOpen, Volume2, Send } from "lucide-react";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface InstructionCardProps {
  id: string;
  title: string;
  subject?: string;
  originalInstruction: string;
  simplifiedInstruction: string;
  isRead: boolean;
  createdAt: string;
  studentResponse?: string | null;
  completedAt?: string | null;
  onMarkAsRead: () => void;
}

const InstructionCard = ({
  id,
  title,
  subject,
  originalInstruction,
  simplifiedInstruction,
  isRead,
  createdAt,
  studentResponse,
  completedAt,
  onMarkAsRead,
}: InstructionCardProps) => {
  const [showOriginal, setShowOriginal] = useState(false);
  const [response, setResponse] = useState(studentResponse || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { speak, isSpeaking, stop } = useSpeechSynthesis();
  const { toast } = useToast();

  const handleToggleView = () => {
    setShowOriginal(!showOriginal);
  };

  const handleMarkAsRead = async () => {
    if (isRead) return;

    const { error } = await supabase
      .from('teacher_instructions')
      .update({ is_read: true })
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to mark as read",
        variant: "destructive",
      });
    } else {
      onMarkAsRead();
    }
  };

  const handleSpeak = () => {
    if (isSpeaking) {
      stop();
    } else {
      const textToSpeak = showOriginal ? originalInstruction : simplifiedInstruction;
      speak(textToSpeak);
    }
  };

  const handleSubmitResponse = async () => {
    if (!response.trim()) {
      toast({
        title: "Response required",
        description: "Please write your response before submitting",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('teacher_instructions')
        .update({
          student_response: response,
          completed_at: new Date().toISOString(),
          is_read: true,
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Response submitted",
        description: "Your work has been sent to your teacher",
      });
      onMarkAsRead();
    } catch (error) {
      console.error('Error submitting response:', error);
      toast({
        title: "Submission failed",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayText = showOriginal ? originalInstruction : simplifiedInstruction;
  const formattedDate = new Date(createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Card className="p-6 border-2 hover:border-primary/50 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            {!isRead && (
              <Badge variant="default" className="bg-primary">New</Badge>
            )}
          </div>
          {subject && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              {subject}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">{formattedDate}</p>
        </div>
      </div>

      <div className="bg-muted/30 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-foreground">
            {showOriginal ? "📝 Original Instruction" : "✨ Simplified Version"}
          </p>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleToggleView}
            className="h-8"
          >
            {showOriginal ? (
              <>
                <EyeOff className="h-4 w-4 mr-2" />
                Show Simplified
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Show Original
              </>
            )}
          </Button>
        </div>
        <p className="text-foreground leading-relaxed">{displayText}</p>
      </div>

      <div className="flex gap-2 mb-4">
        <Button
          size="sm"
          variant="outline"
          onClick={handleSpeak}
          className="flex-1"
        >
          <Volume2 className="h-4 w-4 mr-2" />
          {isSpeaking ? 'Stop' : 'Listen'}
        </Button>
        {!isRead && (
          <Button
            size="sm"
            onClick={handleMarkAsRead}
            className="flex-1"
          >
            Mark as Read
          </Button>
        )}
      </div>

      {/* Student Response Section */}
      {!completedAt ? (
        <div className="space-y-2 pt-4 border-t">
          <label className="text-sm font-medium">Your Response:</label>
          <Textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Write your answer here..."
            className="min-h-[120px]"
          />
          <Button
            onClick={handleSubmitResponse}
            disabled={isSubmitting}
            className="w-full"
          >
            <Send className="h-4 w-4 mr-2" />
            {isSubmitting ? "Submitting..." : "Submit Response"}
          </Button>
        </div>
      ) : (
        <div className="pt-4 border-t">
          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm font-medium mb-2">Your Submitted Response:</p>
            <p className="text-sm whitespace-pre-wrap">{studentResponse}</p>
            <p className="text-xs text-muted-foreground mt-2">
              Submitted on {new Date(completedAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
};

export default InstructionCard;
