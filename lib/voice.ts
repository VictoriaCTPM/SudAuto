import { useState, useRef, useCallback } from 'react';
import { Platform } from 'react-native';

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : typeof window !== 'undefined' ? '' : 'http://localhost:5000';

export function useVoiceInput(onResult: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const recorderRef = useRef<any>(null);

  const startListening = useCallback(async () => {
    if (Platform.OS === 'web') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        onResult('');
        return;
      }
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-MX';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.continuous = false;

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        onResult(transcript);
        setListening(false);
      };
      recognition.onerror = () => setListening(false);
      recognition.onend = () => setListening(false);

      recognitionRef.current = recognition;
      recognition.start();
      setListening(true);
    } else {
      try {
        const { Audio } = await import('expo-av');
        const permission = await Audio.requestPermissionsAsync();
        if (!permission.granted) return;

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        recorderRef.current = recording;
        setListening(true);
      } catch {
        setListening(false);
      }
    }
  }, [onResult]);

  const stopListening = useCallback(async () => {
    if (Platform.OS === 'web') {
      recognitionRef.current?.stop();
      setListening(false);
    } else {
      try {
        const recording = recorderRef.current;
        if (!recording) return;
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        recorderRef.current = null;
        setListening(false);

        if (uri) {
          const { readAsStringAsync, EncodingType } = await import('expo-file-system');
          const base64Audio = await readAsStringAsync(uri, { encoding: EncodingType.Base64 });

          const res = await fetch(`${API_BASE}/api/transcribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64: base64Audio }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.text) onResult(data.text);
          }
        }
      } catch {
        setListening(false);
      }
    }
  }, [onResult]);

  const toggle = useCallback(() => {
    if (listening) stopListening();
    else startListening();
  }, [listening, startListening, stopListening]);

  return { listening, toggle };
}
