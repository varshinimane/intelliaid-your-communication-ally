import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Mic, Square, Volume2, MessageSquare, Smile, Meh, Frown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Student = () => {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<"happy" | "neutral" | "sad">("neutral");
  const [selectedLanguage, setSelectedLanguage] = useState("en");

  const symbolCards = [
    { emoji: "👋", label: "Hello", category: "greetings" },
    { emoji: "👍", label: "Yes", category: "responses" },
    { emoji: "👎", label: "No", category: "responses" },
    { emoji: "🙏", label: "Please", category: "courtesy" },
    { emoji: "💭", label: "Think", category: "actions" },
    { emoji: "✋", label: "Stop", category: "actions" },
    { emoji: "📚", label: "Learn", category: "education" },
    { emoji: "✅", label: "Understand", category: "responses" },
    { emoji: "❓", label: "Question", category: "communication" },
    { emoji: "💡", label: "Idea", category: "communication" },
    { emoji: "🎯", label: "Focus", category: "actions" },
    { emoji: "🤝", label: "Help", category: "courtesy" },
  ];

  const handleRecordToggle = () => {
    setIsRecording(!isRecording);
    toast({
      title: isRecording ? "Recording stopped" : "Recording started",
      description: isRecording ? "Processing your speech..." : "Speak clearly into your microphone",
    });
  };

  const handleCardClick = (card: typeof symbolCards[0]) => {
    toast({
      title: `Selected: ${card.label}`,
      description: "Card added to your message",
    });
  };

  const emotionIcons = {
    happy: <Smile className="h-5 w-5 text-emotion-happy" />,
    neutral: <Meh className="h-5 w-5 text-emotion-neutral" />,
    sad: <Frown className="h-5 w-5 text-emotion-sad" />,
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold">Student Interface</h1>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="flex items-center gap-2 px-3 py-2">
                {emotionIcons[currentEmotion]}
                <span className="text-sm">Detected: {currentEmotion}</span>
              </Badge>
            </div>
          </div>
          <p className="text-muted-foreground">
            Express yourself using voice, text, or visual cards
          </p>
        </div>

        {/* Language Selector */}
        <Card className="p-4 mb-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Language:</label>
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="fr">Français</SelectItem>
                <SelectItem value="de">Deutsch</SelectItem>
                <SelectItem value="zh">中文</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Voice Controls */}
        <Card className="p-8 mb-6">
          <div className="text-center space-y-6">
            <h2 className="text-xl font-semibold flex items-center justify-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Voice Communication
            </h2>

            <div className="flex justify-center gap-4">
              <Button
                size="lg"
                onClick={handleRecordToggle}
                className={`rounded-full h-20 w-20 ${
                  isRecording ? "bg-destructive hover:bg-destructive/90" : ""
                }`}
              >
                {isRecording ? (
                  <Square className="h-8 w-8" />
                ) : (
                  <Mic className="h-8 w-8" />
                )}
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="rounded-full h-20 w-20"
                onClick={() =>
                  toast({
                    title: "Text-to-Speech",
                    description: "Playing your message...",
                  })
                }
              >
                <Volume2 className="h-8 w-8" />
              </Button>
            </div>

            {isRecording && (
              <div className="flex items-center justify-center gap-2 animate-pulse-glow">
                <div className="h-2 w-2 rounded-full bg-destructive" />
                <span className="text-sm text-muted-foreground">Recording...</span>
              </div>
            )}

            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Click the microphone to start speaking. Your speech will be converted to text and analyzed for emotions.
            </p>
          </div>
        </Card>

        {/* Visual Symbol Cards */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-6">Visual Communication Cards</h2>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {symbolCards.map((card, index) => (
              <button
                key={index}
                onClick={() => handleCardClick(card)}
                className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-border bg-card hover:bg-accent hover:border-accent transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <span className="text-4xl mb-2">{card.emoji}</span>
                <span className="text-xs font-medium text-center">{card.label}</span>
              </button>
            ))}
          </div>

          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground text-center">
              Click any card to add it to your message. Cards help express ideas visually.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Student;
