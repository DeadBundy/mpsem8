import { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage, type SupportedLanguage, getSpeechLocale } from '@/lib/language';
import { stopSpeechPlayback } from '@/lib/speech';

export interface SpeechRecognitionHook {
  isListening: boolean;
  isSpeaking: boolean; // Track TTS
  transcript: string;
  interimTranscript: string;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  setSpeaking?: (speaking: boolean) => void;
}

interface UseSpeechRecognitionProps {
  language?: SupportedLanguage;
  onSilence?: (transcript: string) => void; // Auto-send on silence
  silenceDelay?: number; // ms
}

export function useSpeechRecognition({
  language = 'en',
  onSilence,
  silenceDelay = 1700,
}: UseSpeechRecognitionProps = {}): SpeechRecognitionHook {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState(''); // final
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const shouldRestartRef = useRef(true);
  const { copy } = useLanguage();

  const speechSupported = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const getRecognition = useCallback(() => {
    if (!speechSupported) return null;
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = getSpeechLocale(language);
    return recognition;
  }, [language, speechSupported]);

  useEffect(() => {
    const recognition = getRecognition();
    if (!recognition) return;

    const handleResult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let newFinal = transcript;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]!;
        if (result.isFinal) {
          newFinal += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      setInterimTranscript(interim);
      setTranscript(newFinal);

      // Interrupt TTS if speaking and speech detected
      if (isSpeaking && interim.trim()) {
        stopSpeechPlayback();
        setIsSpeaking(false);
      }

      // Reset silence timer
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        const msg = newFinal.trim();
        if (msg && onSilence) {
          onSilence(msg);
          setTranscript('');
          setInterimTranscript('');
        }
      }, silenceDelay);
    };

    const handleStart = () => setIsListening(true);
    const handleEnd = () => {
      setIsListening(false);
      if (shouldRestartRef.current && !isSpeaking) {
        // Restart logic can be added here if continuous needed
      }
    };
    const handleError = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      if (shouldRestartRef.current) {
        // Retry logic
        setTimeout(() => startListening(), 500);
      }
    };

    recognition.onstart = handleStart;
    recognition.onresult = handleResult;
    recognition.onerror = handleError;
    recognition.onend = handleEnd;

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, [language, transcript, isSpeaking, onSilence, silenceDelay, getRecognition]);

const startListening = useCallback(() => {
    console.log("🟢 START LISTENING CALLED", { speechSupported, hasRef: !!recognitionRef.current, isSpeaking, isListening });
    if (!recognitionRef.current || isSpeaking || isListening || !speechSupported) {
      console.log("🔴 BLOCKED BY GUARD:", { hasRef: !!recognitionRef.current, isSpeaking, isListening, speechSupported });
      return;
    }
    shouldRestartRef.current = true;
    try {
      console.log("🟢 CALLING recognition.start()");
      recognitionRef.current.start();
    } catch (e) {
      console.error("🔴 START ERROR:", e);
    }
    return;
  }, [isSpeaking, isListening, speechSupported]);

  const stopListening = useCallback(() => {
    shouldRestartRef.current = false;
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    recognitionRef.current?.stop();
    setIsListening(false);
    setInterimTranscript('');
    setTranscript('');
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  // External TTS tracking (call from parent)
  const setSpeaking = useCallback((speaking: boolean) => {
    setIsSpeaking(speaking);
    if (speaking) {
      stopListening();
    }
  }, []);

  return {
    isListening,
    isSpeaking,
    transcript: transcript + (interimTranscript ? ' ' + interimTranscript : ''),
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
    // Expose for TTS
    setSpeaking,
  };
}
