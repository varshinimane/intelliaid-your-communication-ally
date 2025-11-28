import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseMediaRecorderReturn {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string>;
  error: string | null;
  isSupported: boolean;
}

export const useMediaRecorder = (): UseMediaRecorderReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const isSupported = typeof window !== 'undefined' && 
    typeof MediaRecorder !== 'undefined' && 
    !!navigator.mediaDevices?.getUserMedia;

  const startRecording = useCallback(async () => {
    if (!isSupported) {
      setError('Audio recording is not supported in this browser');
      return;
    }

    try {
      setError(null);
      chunksRef.current = [];

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      streamRef.current = stream;

      // Determine best supported mime type for mobile compatibility
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
        'audio/wav'
      ];

      let selectedMimeType = '';
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          console.log('Using mime type:', mimeType);
          break;
        }
      }

      if (!selectedMimeType) {
        selectedMimeType = ''; // Let browser decide
        console.log('Using default mime type');
      }

      const options = selectedMimeType ? { mimeType: selectedMimeType } : {};
      const mediaRecorder = new MediaRecorder(stream, options);
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          console.log('Audio chunk recorded:', event.data.size, 'bytes');
        }
      };

      mediaRecorder.onerror = (event: any) => {
        console.error('MediaRecorder error:', event.error);
        setError('Recording error occurred');
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      
      console.log('Recording started with mime type:', selectedMimeType || 'default');
    } catch (err: any) {
      console.error('Error starting recording:', err);
      setError(err.message || 'Failed to start recording');
      throw err;
    }
  }, [isSupported]);

  const stopRecording = useCallback(async (): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!mediaRecorderRef.current || !isRecording) {
        reject(new Error('No active recording'));
        return;
      }

      const mediaRecorder = mediaRecorderRef.current;

      mediaRecorder.onstop = async () => {
        try {
          console.log('Recording stopped, processing audio...');
          
          // Stop all tracks
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
          }

          // Create blob from chunks
          const audioBlob = new Blob(chunksRef.current, { 
            type: mediaRecorder.mimeType || 'audio/webm' 
          });
          
          console.log('Audio blob created:', audioBlob.size, 'bytes, type:', audioBlob.type);

          // Convert to base64
          const reader = new FileReader();
          reader.onloadend = async () => {
            try {
              const base64Audio = (reader.result as string).split(',')[1];
              console.log('Audio converted to base64, length:', base64Audio.length);

              // Send to edge function for transcription
              const { data, error } = await supabase.functions.invoke('transcribe-audio', {
                body: { 
                  audio: base64Audio,
                  mimeType: audioBlob.type
                }
              });

              if (error) {
                console.error('Transcription error:', error);
                
                if (error.message?.includes('Rate limit')) {
                  reject(new Error('Rate limit exceeded. Please wait and try again.'));
                } else if (error.message?.includes('Payment required')) {
                  reject(new Error('Transcription credits exhausted. Please contact support.'));
                } else {
                  reject(new Error(error.message || 'Transcription failed'));
                }
                return;
              }

              console.log('Transcription successful:', data.text);
              resolve(data.text);
            } catch (err: any) {
              console.error('Processing error:', err);
              reject(err);
            }
          };

          reader.onerror = () => {
            reject(new Error('Failed to read audio data'));
          };

          reader.readAsDataURL(audioBlob);
          
          setIsRecording(false);
        } catch (err: any) {
          console.error('Stop recording error:', err);
          reject(err);
        }
      };

      mediaRecorder.stop();
    });
  }, [isRecording]);

  return {
    isRecording,
    startRecording,
    stopRecording,
    error,
    isSupported,
  };
};
