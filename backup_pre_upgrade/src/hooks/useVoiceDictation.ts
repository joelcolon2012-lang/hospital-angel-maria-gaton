import { useState, useEffect, useRef } from 'react';

export function useVoiceDictation() {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);
  const callbackRef = useRef<((text: string) => void) | null>(null);

  useEffect(() => {
    const SpeechRecognition = 
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      setIsSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'es-ES';

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          currentTranscript += item[0].transcript;
        }

        setTranscript(currentTranscript);
        if (callbackRef.current) {
          callbackRef.current(currentTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const startListening = (onTranscript: (text: string) => void) => {
    if (!recognitionRef.current) return;
    callbackRef.current = onTranscript;
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (e) {
      console.warn('Error starting speech recognition:', e);
    }
  };

  const stopListening = () => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
      setIsListening(false);
    } catch (e) {
      console.warn('Error stopping speech recognition:', e);
    }
  };

  return {
    isSupported,
    isListening,
    transcript,
    startListening,
    stopListening
  };
}
