import { useState, useEffect, useCallback } from 'react';

interface UseSpeechSynthesisReturn {
  speak: (text: string, language?: string) => void;
  stop: () => void;
  isSpeaking: boolean;
  isSupported: boolean;
  voices: SpeechSynthesisVoice[];
  setVoice: (voice: SpeechSynthesisVoice) => void;
}

export const useSpeechSynthesis = (
  language: string = 'en-US'
): UseSpeechSynthesisReturn => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  useEffect(() => {
    if (!isSupported) return;

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
      
      // Try to find a voice matching the language
      const matchingVoice = availableVoices.find(voice => 
        voice.lang.startsWith(language.split('-')[0])
      );
      
      if (matchingVoice) {
        setSelectedVoice(matchingVoice);
      } else if (availableVoices.length > 0) {
        setSelectedVoice(availableVoices[0]);
      }
    };

    loadVoices();
    
    // Voices may load asynchronously
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.cancel();
    };
  }, [language, isSupported]);

  const speak = useCallback((text: string, overrideLanguage?: string) => {
    if (!isSupported) {
      console.warn('Speech synthesis not supported');
      return;
    }

    const targetLang = overrideLanguage || language;
    console.log('Speaking text:', text, 'in language:', targetLang);
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Find a voice matching the target language
    const targetVoice = voices.find(voice => 
      voice.lang.startsWith(targetLang.split('-')[0])
    );
    
    if (targetVoice) {
      utterance.voice = targetVoice;
      console.log('Using voice:', targetVoice.name, 'for language:', targetLang);
    } else if (selectedVoice) {
      utterance.voice = selectedVoice;
      console.log('Using default voice:', selectedVoice.name);
    }
    
    utterance.lang = targetLang;
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => {
      console.log('Speech started');
      setIsSpeaking(true);
    };
    utterance.onend = () => {
      console.log('Speech ended');
      setIsSpeaking(false);
    };
    utterance.onerror = (event) => {
      console.error('Speech error:', event);
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  }, [isSupported, selectedVoice, language, voices]);

  const stop = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isSupported]);

  return {
    speak,
    stop,
    isSpeaking,
    isSupported,
    voices,
    setVoice: setSelectedVoice
  };
};
