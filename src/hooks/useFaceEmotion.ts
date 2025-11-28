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
    // Map face-api emotions to extended emotion set including neurodiverse-friendly emotions
    const emotionMapping: Record<string, string> = {
      'neutral': 'neutral',
      'happy': 'happy',
      'sad': 'sad',
      'angry': 'angry',
      'fearful': 'scared',  // Map fearful to scared
      'disgusted': 'disgusted',
      'surprised': 'surprised'
    };

    // Extended emotion detection with compound patterns
    const { neutral, happy, sad, angry, fearful, disgusted, surprised } = emotions;
    
    // Detect complex emotional states for neurodiverse students
    const fearScore = fearful;
    const confusionScore = (surprised * 0.6 + neutral * 0.4); // Surprised + neutral = confused
    const stressScore = (angry * 0.4 + fearful * 0.4 + sad * 0.2); // Mix of negative emotions
    const overwhelmedScore = (fearful * 0.5 + sad * 0.3 + angry * 0.2); // High fear + sadness
    const boredScore = (neutral * 0.7 + sad * 0.3); // High neutral + slight sadness
    
    // Create enhanced emotion object
    const enhancedEmotions = {
      neutral,
      happy,
      sad,
      angry,
      scared: fearScore,
      disgusted,
      surprised,
      confused: confusionScore,
      stressed: stressScore,
      overwhelmed: overwhelmedScore,
      bored: boredScore
    };

    const entries = Object.entries(enhancedEmotions);
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
