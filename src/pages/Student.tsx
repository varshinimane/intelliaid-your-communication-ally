import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mic, Volume2, Brain, Languages } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { useFaceEmotion } from "@/hooks/useFaceEmotion";
import { supabase } from "@/integrations/supabase/client";

const Student = () => {
  const { toast } = useToast();
  const [selectedLanguage, setSelectedLanguage] = useState("en-US");
  const [currentText, setCurrentText] = useState("");
  const [simplifiedText, setSimplifiedText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  const { 
    isListening, 
    transcript, 
    startListening, 
    stopListening,
    isSupported: speechRecognitionSupported 
  } = useSpeechRecognition(selectedLanguage, (result) => {
    if (result.isFinal) {
      setCurrentText(prev => prev + ' ' + result.transcript);
    }
  });

  const { 
    speak, 
    stop: stopSpeaking, 
    isSpeaking,
    isSupported: speechSynthesisSupported 
  } = useSpeechSynthesis(selectedLanguage);

  const {
    startDetection: startEmotionDetection,
    stopDetection: stopEmotionDetection,
    isDetecting,
    emotion,
    confidence,
    isModelLoaded
  } = useFaceEmotion();

  // Start a communication session
  useEffect(() => {
    const startSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('communication_sessions')
        .insert({
          student_id: user.id,
          language_code: selectedLanguage,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating session:', error);
      } else {
        setSessionId(data.id);
      }
    };

    startSession();
    startEmotionDetection();

    return () => {
      stopEmotionDetection();
    };
  }, []);

  // Log emotions to database
  useEffect(() => {
    if (!emotion || !sessionId) return;

    const logEmotion = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('emotion_logs').insert({
        student_id: user.id,
        session_id: sessionId,
        emotion_type: emotion,
        confidence_score: confidence,
        context: isListening ? 'speaking' : 'idle'
      });
    };

    logEmotion();
  }, [emotion, sessionId]);

  const handleRecordToggle = () => {
    if (isListening) {
      stopListening();
      toast({
        title: "Recording Stopped",
        description: "Your voice recording has been saved.",
      });
    } else {
      startListening();
      toast({
        title: "Recording Started",
        description: "Speak clearly into your microphone.",
      });
    }
  };

  const handleSimplifyText = async () => {
    if (!currentText.trim()) {
      toast({
        title: "No text to simplify",
        description: "Please record or type some text first.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-communication', {
        body: { text: currentText, action: 'simplify' }
      });

      if (error) throw error;

      setSimplifiedText(data.result);
      toast({
        title: "Text Simplified",
        description: "Your text has been simplified.",
      });
    } catch (error: any) {
      console.error('Simplify error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to simplify text",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTranslateText = async () => {
    if (!currentText.trim()) {
      toast({
        title: "No text to translate",
        description: "Please record or type some text first.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      const targetLang = selectedLanguage === 'en-US' ? 'Spanish' : 'English';
      const { data, error } = await supabase.functions.invoke('process-communication', {
        body: { text: currentText, action: 'translate', targetLanguage: targetLang }
      });

      if (error) throw error;

      setTranslatedText(data.result);
      toast({
        title: "Text Translated",
        description: `Translated to ${targetLang}.`,
      });
    } catch (error: any) {
      console.error('Translate error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to translate text",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSpeakText = (text: string) => {
    if (isSpeaking) {
      stopSpeaking();
    } else {
      speak(text);
    }
  };

  const symbolCards = [
    { emoji: "😊", label: "Happy" },
    { emoji: "😢", label: "Sad" },
    { emoji: "😡", label: "Angry" },
    { emoji: "😰", label: "Worried" },
    { emoji: "🤔", label: "Thinking" },
    { emoji: "😴", label: "Tired" },
    { emoji: "🍽️", label: "Hungry" },
    { emoji: "🥤", label: "Thirsty" },
    { emoji: "✅", label: "Yes" },
    { emoji: "❌", label: "No" },
    { emoji: "❓", label: "Help" },
    { emoji: "🚽", label: "Restroom" },
  ];

  const handleCardClick = async (label: string, emoji: string) => {
    const message = `${emoji} ${label}`;
    speak(message);
    
    toast({
      title: "Symbol Selected",
      description: message,
    });

    // Save to database
    if (sessionId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('communication_messages').insert({
          student_id: user.id,
          session_id: sessionId,
          message_type: 'visual_card',
          visual_card_data: { emoji, label },
          original_text: message,
          language_code: selectedLanguage
        });
      }
    }
  };

  const getEmotionEmoji = (emotionType: string | null) => {
    switch (emotionType) {
      case 'happy': return '😊';
      case 'sad': return '😢';
      case 'angry': return '😡';
      case 'fearful': return '😰';
      case 'surprised': return '😲';
      case 'disgusted': return '🤢';
      default: return '😐';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header with Emotion Detection */}
        <Card className="p-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Student Interface</h1>
              <p className="text-muted-foreground mt-1">Express yourself your way</p>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 bg-primary/10 rounded-lg">
              <div className="text-4xl">{getEmotionEmoji(emotion)}</div>
              <div>
                <p className="text-sm font-medium text-foreground">Current Mood</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {emotion || 'detecting...'} {confidence > 0 && `(${Math.round(confidence * 100)}%)`}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Voice Communication Controls */}
        <Card className="p-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <h2 className="text-xl font-semibold mb-4 text-foreground">Voice Communication</h2>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Select Language
              </label>
              <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                <SelectTrigger className="w-full md:w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en-US">English (US)</SelectItem>
                  <SelectItem value="es-ES">Spanish</SelectItem>
                  <SelectItem value="fr-FR">French</SelectItem>
                  <SelectItem value="de-DE">German</SelectItem>
                  <SelectItem value="zh-CN">Chinese</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!speechRecognitionSupported && (
              <div className="text-sm text-destructive">
                Speech recognition is not supported in your browser. Please use Chrome or Edge.
              </div>
            )}

            <div className="flex gap-4">
              <Button
                size="lg"
                onClick={handleRecordToggle}
                disabled={!speechRecognitionSupported}
                className={`flex-1 ${
                  isListening
                    ? "bg-destructive hover:bg-destructive/90"
                    : "bg-primary hover:bg-primary/90"
                }`}
              >
                <Mic className="mr-2 h-5 w-5" />
                {isListening ? "Stop Recording" : "Start Recording"}
              </Button>
            </div>

            {/* Current transcript */}
            {(isListening || currentText) && (
              <div className="space-y-2">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-1">Current Text:</p>
                  <p className="text-foreground">{currentText || transcript || "Listening..."}</p>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSimplifyText}
                    disabled={isProcessing || !currentText.trim()}
                  >
                    <Brain className="mr-2 h-4 w-4" />
                    Simplify
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleTranslateText}
                    disabled={isProcessing || !currentText.trim()}
                  >
                    <Languages className="mr-2 h-4 w-4" />
                    Translate
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSpeakText(currentText)}
                    disabled={!speechSynthesisSupported || !currentText.trim()}
                  >
                    <Volume2 className="mr-2 h-4 w-4" />
                    {isSpeaking ? 'Stop' : 'Speak'}
                  </Button>
                </div>
              </div>
            )}

            {/* Simplified text */}
            {simplifiedText && (
              <div className="p-4 bg-primary/10 rounded-lg">
                <p className="text-sm font-medium mb-1 flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  Simplified:
                </p>
                <p className="text-foreground">{simplifiedText}</p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-2"
                  onClick={() => handleSpeakText(simplifiedText)}
                >
                  <Volume2 className="mr-2 h-4 w-4" />
                  Speak
                </Button>
              </div>
            )}

            {/* Translated text */}
            {translatedText && (
              <div className="p-4 bg-secondary/10 rounded-lg">
                <p className="text-sm font-medium mb-1 flex items-center gap-2">
                  <Languages className="h-4 w-4" />
                  Translated:
                </p>
                <p className="text-foreground">{translatedText}</p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-2"
                  onClick={() => handleSpeakText(translatedText)}
                >
                  <Volume2 className="mr-2 h-4 w-4" />
                  Speak
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Visual Communication Cards */}
        <Card className="p-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <h2 className="text-xl font-semibold mb-4 text-foreground">Visual Communication</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {symbolCards.map((card) => (
              <Button
                key={card.label}
                variant="outline"
                className="h-24 flex flex-col gap-2 hover:bg-primary/10 hover:border-primary transition-all"
                onClick={() => handleCardClick(card.label, card.emoji)}
              >
                <span className="text-4xl">{card.emoji}</span>
                <span className="text-sm font-medium">{card.label}</span>
              </Button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Student;
