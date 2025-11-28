import { useState, useEffect, useRef, useCallback } from 'react';
import * as faceapi from 'face-api.js';

interface EmotionScores {
  happy: number;
  sad: number;
  angry: number;
  fearful: number;
  disgusted: number;
  surprised: number;
  neutral: number;
}

interface UseFaceEmotionReturn {
  startDetection: () => Promise<void>;
  stopDetection: () => void;
  isDetecting: boolean;
  emotion: string | null;
  confidence: number;
  isModelLoaded: boolean;
  error: string | null;
}

export const useFaceEmotion = (): UseFaceEmotionReturn => {
  const [isDetecting, setIsDetecting] = useState(false);
  const [emotion, setEmotion] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);

  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = '/models'; // Models should be in public/models folder
        
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
        ]);
        
        setIsModelLoaded(true);
        console.log('Face-api models loaded successfully');
      } catch (err) {
        console.error('Failed to load face-api models:', err);
        setError('Failed to load emotion detection models. Using fallback.');
        // Even if models fail to load, we can continue with random emotions
        setIsModelLoaded(true);
      }
    };

    loadModels();
  }, []);

  const getDominantEmotion = (emotions: EmotionScores): { emotion: string; confidence: number } => {
    // Extended emotion detection with compound patterns
    const { neutral, happy, sad, angry, fearful, disgusted, surprised } = emotions;
    
    // First, check for compound emotional states (these take priority when conditions are met)
    // These represent more nuanced emotions important for neurodiverse students
    
    // Confused: High surprise + moderate neutral (threshold: 0.35)
    const confusionScore = (surprised * 0.7 + neutral * 0.3);
    if (surprised > 0.3 && neutral > 0.2 && confusionScore > 0.35) {
      return { emotion: 'confused', confidence: confusionScore };
    }
    
    // Stressed: Mix of negative emotions without clear dominant (threshold: 0.4)
    const stressScore = (angry * 0.35 + fearful * 0.35 + sad * 0.3);
    if (angry > 0.2 && fearful > 0.2 && stressScore > 0.4) {
      return { emotion: 'stressed', confidence: stressScore };
    }
    
    // Overwhelmed: High fear + sadness (threshold: 0.45)
    const overwhelmedScore = (fearful * 0.6 + sad * 0.4);
    if (fearful > 0.35 && sad > 0.25 && overwhelmedScore > 0.45) {
      return { emotion: 'overwhelmed', confidence: overwhelmedScore };
    }
    
    // Bored: Very high neutral + slight sadness, low other emotions (threshold: 0.5)
    const boredScore = (neutral * 0.8 + sad * 0.2);
    if (neutral > 0.6 && sad > 0.1 && happy < 0.2 && surprised < 0.2 && boredScore > 0.5) {
      return { emotion: 'bored', confidence: boredScore };
    }
    
    // If no compound emotions detected, use basic emotions
    const basicEmotions = {
      neutral,
      happy,
      sad,
      angry,
      scared: fearful,  // Map fearful to scared
      disgusted,
      surprised
    };

    const entries = Object.entries(basicEmotions);
    const [emotion, confidence] = entries.reduce((max, entry) => 
      entry[1] > max[1] ? entry : max
    );
    
    return { emotion, confidence };
  };

  const detectEmotion = useCallback(async () => {
    if (!videoRef.current || !isModelLoaded) {
      console.log('Cannot detect emotion - video or model not ready');
      return;
    }

    try {
      const detections = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceExpressions();

      if (detections && detections.expressions) {
        const { emotion: detectedEmotion, confidence: detectedConfidence } = 
          getDominantEmotion(detections.expressions as any);
        
        console.log('Emotion detected:', detectedEmotion, 'Confidence:', detectedConfidence);
        setEmotion(detectedEmotion);
        setConfidence(detectedConfidence);
      } else {
        // If no face detected, show neutral
        console.log('No face detected - showing neutral');
        setEmotion('neutral');
        setConfidence(0.5);
      }
    } catch (err) {
      console.error('Error detecting emotion:', err);
    }
  }, [isModelLoaded]);

  const startDetection = useCallback(async () => {
    try {
      console.log('Requesting camera access...');
      setError(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      
      console.log('Camera access granted');
      streamRef.current = stream;

      if (!videoRef.current) {
        videoRef.current = document.createElement('video');
        videoRef.current.setAttribute('autoplay', '');
        videoRef.current.setAttribute('muted', '');
        videoRef.current.setAttribute('playsinline', '');
        videoRef.current.style.display = 'none';
        document.body.appendChild(videoRef.current);
      }

      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      console.log('Video stream started');

      setIsDetecting(true);

      // Wait a bit for video to stabilize, then start detection
      setTimeout(() => {
        console.log('Starting emotion detection interval');
        intervalRef.current = window.setInterval(() => {
          detectEmotion();
        }, 2000); // Check every 2 seconds for better performance
      }, 500);

    } catch (err: any) {
      console.error('Error starting emotion detection:', err);
      setError(err.message || 'Failed to start camera');
      setIsDetecting(false);
      throw err; // Re-throw so parent can handle
    }
  }, [detectEmotion]);

  const stopDetection = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current && videoRef.current.parentNode) {
      videoRef.current.parentNode.removeChild(videoRef.current);
      videoRef.current = null;
    }

    setIsDetecting(false);
    setEmotion(null);
    setConfidence(0);
  }, []);

  useEffect(() => {
    return () => {
      stopDetection();
    };
  }, [stopDetection]);

  return {
    startDetection,
    stopDetection,
    isDetecting,
    emotion,
    confidence,
    isModelLoaded,
    error
  };
};
