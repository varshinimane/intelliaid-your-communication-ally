import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mic, Volume2, Brain, Languages, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { useFaceEmotion } from "@/hooks/useFaceEmotion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const Student = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [selectedLanguage, setSelectedLanguage] = useState("en-US");
  const [targetLanguage, setTargetLanguage] = useState("hi-IN"); // Default to Hindi
  const [currentText, setCurrentText] = useState("");
  const [simplifiedText, setSimplifiedText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  
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

  // Check authentication
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  // Start a communication session and emotion detection
  useEffect(() => {
    if (!user) return;
    
    const startSession = async () => {
      try {
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
          console.log('Session created:', data.id);
        }

        // Start emotion detection with error handling
        console.log('Starting emotion detection...');
        await startEmotionDetection().then(() => {
          console.log('Emotion detection started successfully');
          toast({
            title: "Camera Active",
            description: "Emotion detection is now running.",
          });
        }).catch((error) => {
          console.error('Error starting emotion detection:', error);
          toast({
            title: "Camera Access Required",
            description: "Please allow camera access for emotion detection.",
            variant: "destructive"
          });
        });
      } catch (error) {
        console.error('Initialization error:', error);
        toast({
          title: "Initialization Error",
          description: "Failed to start session. Please refresh.",
          variant: "destructive"
        });
      } finally {
        setIsInitializing(false);
      }
    };

    startSession();

    return () => {
      stopEmotionDetection();
    };
  }, [user, startEmotionDetection, stopEmotionDetection, toast]);

  // Log emotions to database
  useEffect(() => {
    if (!emotion || !sessionId || !user) return;

    const logEmotion = async () => {
      const { data, error } = await supabase.from('emotion_logs').insert({
        student_id: user.id,
        session_id: sessionId,
        emotion_type: emotion,
        confidence_score: confidence,
        context: isListening ? 'speaking' : 'idle'
      });
      
      if (error) {
        console.error('Error logging emotion:', error);
      } else {
        console.log('Emotion logged successfully:', emotion, confidence);
      }
    };

    logEmotion();
  }, [emotion, sessionId, user, isListening, confidence]);

  const handleRecordToggle = async () => {
    if (isListening) {
      stopListening();
      console.log('Recording stopped. Transcript:', currentText);
      
      // Save the speech message to database
      if (currentText.trim() && sessionId && user) {
        const { error } = await supabase.from('communication_messages').insert({
          student_id: user.id,
          session_id: sessionId,
          message_type: 'speech',
          original_text: currentText,
          language_code: selectedLanguage
        });
        
        if (error) {
          console.error('Error saving speech message:', error);
        } else {
          console.log('Speech message saved to database');
        }
      }
      
      toast({
        title: "Recording Stopped",
        description: "Your voice recording has been saved.",
      });
    } else {
      console.log('Starting recording...');
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
      
      // Save simplified text to database
      if (sessionId && user) {
        await supabase.from('communication_messages').insert({
          student_id: user.id,
          session_id: sessionId,
          message_type: 'simplified',
          original_text: currentText,
          simplified_text: data.result,
          language_code: selectedLanguage
        });
        console.log('Simplified message saved to database');
      }
      
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
      // Get the language name from the code
      const languageMap: Record<string, string> = {
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
        'es-ES': 'Spanish',
        'fr-FR': 'French',
        'de-DE': 'German',
        'zh-CN': 'Chinese'
      };
      
      const targetLang = languageMap[targetLanguage] || 'Hindi';
      const { data, error } = await supabase.functions.invoke('process-communication', {
        body: { text: currentText, action: 'translate', targetLanguage: targetLang }
      });

      if (error) throw error;

      setTranslatedText(data.result);
      
      // Save translated text to database
      if (sessionId && user) {
        await supabase.from('communication_messages').insert({
          student_id: user.id,
          session_id: sessionId,
          message_type: 'translated',
          original_text: currentText,
          translated_text: data.result,
          language_code: selectedLanguage
        });
        console.log('Translated message saved to database');
      }
      
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
    console.log('Speech synthesis requested for:', text);
    if (isSpeaking) {
      stopSpeaking();
      console.log('Stopped speaking');
    } else {
      speak(text);
      console.log('Started speaking');
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
    if (sessionId && user) {
      const { error } = await supabase.from('communication_messages').insert({
        student_id: user.id,
        session_id: sessionId,
        message_type: 'visual_card',
        visual_card_data: { emoji, label },
        original_text: message,
        language_code: selectedLanguage
      });
      
      if (error) {
        console.error('Error saving message:', error);
      } else {
        console.log('Visual card message saved to database');
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

  // Show loading state
  if (authLoading || isInitializing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Initializing IntelliAid...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header with Emotion Detection */}
        <Card className="p-6 border-2">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">IntelliAid Student</h1>
              <p className="text-muted-foreground mt-1">AI-Powered Multimodal Communication Platform</p>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 bg-accent/10 rounded-lg border border-accent/20">
              <div className="text-4xl">{getEmotionEmoji(emotion)}</div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {isModelLoaded ? 'Emotion Detected' : 'Loading AI...'}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {emotion || (isModelLoaded ? 'neutral' : 'initializing...')} 
                  {confidence > 0 && ` (${Math.round(confidence * 100)}%)`}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Voice Communication Controls */}
        <Card className="p-6 border-2">
          <h2 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
            <Mic className="h-5 w-5 text-primary" />
            Speech AI + Translation AI
          </h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Input Language
                </label>
                <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en-US">English</SelectItem>
                    <SelectItem value="hi-IN">हिंदी (Hindi)</SelectItem>
                    <SelectItem value="ta-IN">தமிழ் (Tamil)</SelectItem>
                    <SelectItem value="te-IN">తెలుగు (Telugu)</SelectItem>
                    <SelectItem value="bn-IN">বাংলা (Bengali)</SelectItem>
                    <SelectItem value="mr-IN">मराठी (Marathi)</SelectItem>
                    <SelectItem value="gu-IN">ગુજરાતી (Gujarati)</SelectItem>
                    <SelectItem value="kn-IN">ಕನ್ನಡ (Kannada)</SelectItem>
                    <SelectItem value="ml-IN">മലയാളം (Malayalam)</SelectItem>
                    <SelectItem value="pa-IN">ਪੰਜਾਬੀ (Punjabi)</SelectItem>
                    <SelectItem value="ur-IN">اردو (Urdu)</SelectItem>
                    <SelectItem value="es-ES">Spanish</SelectItem>
                    <SelectItem value="fr-FR">French</SelectItem>
                    <SelectItem value="de-DE">German</SelectItem>
                    <SelectItem value="zh-CN">Chinese</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Translate To
                </label>
                <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en-US">English</SelectItem>
                    <SelectItem value="hi-IN">हिंदी (Hindi)</SelectItem>
                    <SelectItem value="ta-IN">தமிழ் (Tamil)</SelectItem>
                    <SelectItem value="te-IN">తెలుగు (Telugu)</SelectItem>
                    <SelectItem value="bn-IN">বাংলা (Bengali)</SelectItem>
                    <SelectItem value="mr-IN">मराठी (Marathi)</SelectItem>
                    <SelectItem value="gu-IN">ગુજરાતી (Gujarati)</SelectItem>
                    <SelectItem value="kn-IN">ಕನ್ನಡ (Kannada)</SelectItem>
                    <SelectItem value="ml-IN">മലയാളം (Malayalam)</SelectItem>
                    <SelectItem value="pa-IN">ਪੰਜਾਬੀ (Punjabi)</SelectItem>
                    <SelectItem value="ur-IN">اردو (Urdu)</SelectItem>
                    <SelectItem value="es-ES">Spanish</SelectItem>
                    <SelectItem value="fr-FR">French</SelectItem>
                    <SelectItem value="de-DE">German</SelectItem>
                    <SelectItem value="zh-CN">Chinese</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
        <Card className="p-6 border-2">
          <h2 className="text-xl font-semibold mb-4 text-foreground">Visual Symbol Communication</h2>
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
