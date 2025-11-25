import { useState, useEffect, useRef } from 'react';

interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

interface UseSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  isSupported: boolean;
  error: string | null;
}

export const useSpeechRecognition = (
  language: string = 'en-US',
  onResult?: (result: SpeechRecognitionResult) => void
): UseSpeechRecognitionReturn => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false); // Track actual state to prevent conflicts

  const isSupported = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  useEffect(() => {
    if (!isSupported) {
      setError('Speech recognition is not supported in this browser');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcriptText = result[0].transcript;
        
        if (result.isFinal) {
          finalTranscript += transcriptText + ' ';
          console.log('Final transcript:', transcriptText, 'Confidence:', result[0].confidence);
          
          if (onResult) {
            onResult({
              transcript: transcriptText,
              confidence: result[0].confidence,
              isFinal: true
            });
          }
        } else {
          interimTranscript += transcriptText;
          console.log('Interim transcript:', transcriptText);
        }
      }

      const fullTranscript = finalTranscript || interimTranscript;
      setTranscript(fullTranscript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setError(`Error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      console.log('Speech recognition ended');
      isListeningRef.current = false;
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [language, isSupported, onResult]);

  const startListening = () => {
    if (!isSupported || !recognitionRef.current) {
      console.error('Speech recognition not available');
      setError('Speech recognition not available');
      return;
    }

    // Prevent starting if already listening
    if (isListeningRef.current) {
      console.log('Speech recognition already running, skipping start');
      return;
    }

    try {
      console.log('Starting speech recognition...');
      setTranscript('');
      setError(null);
      isListeningRef.current = true;
      recognitionRef.current.start();
      setIsListening(true);
      console.log('Speech recognition started successfully');
    } catch (err: any) {
      console.error('Failed to start speech recognition:', err);
      isListeningRef.current = false;
      setIsListening(false);
      setError(err.message);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListeningRef.current) {
      console.log('Stopping speech recognition...');
      try {
        recognitionRef.current.stop();
        isListeningRef.current = false;
        setIsListening(false);
      } catch (err) {
        console.error('Error stopping recognition:', err);
        isListeningRef.current = false;
        setIsListening(false);
      }
    }
  };

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    isSupported,
    error
  };
};
