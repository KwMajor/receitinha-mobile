import { useState, useEffect, useCallback, useRef } from 'react';
import Voice, { SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice';

interface VoiceControlState {
  isListening: boolean;
  transcript: string;
  error: string | null;
  isSupported: boolean;
}

interface VoiceControlActions {
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  destroy: () => void;
}

export function useVoiceControl(): VoiceControlState & VoiceControlActions {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    Voice.isAvailable()
      .then(avail => { if (mountedRef.current) setIsSupported(!!avail); })
      .catch(() => { if (mountedRef.current) setIsSupported(false); });

    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      if (!mountedRef.current) return;
      const text = e.value?.[0] ?? '';
      if (text) setTranscript(text);
    };

    Voice.onSpeechError = (e: SpeechErrorEvent) => {
      if (!mountedRef.current) return;
      // error code 7 = "No match" — silently ignore and let loop retry
      const code = (e.error as any)?.code ?? '';
      if (code !== '7' && code !== 7) {
        setError(e.error?.message ?? 'Erro no reconhecimento de voz');
      }
      setIsListening(false);
    };

    Voice.onSpeechEnd = () => {
      if (mountedRef.current) setIsListening(false);
    };

    return () => {
      mountedRef.current = false;
      Voice.destroy().then(() => Voice.removeAllListeners()).catch(() => {});
    };
  }, []);

  const startListening = useCallback(async () => {
    try {
      setTranscript('');
      setError(null);
      await Voice.start('pt-BR');
      setIsListening(true);
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao iniciar reconhecimento');
      setIsListening(false);
    }
  }, []);

  const stopListening = useCallback(async () => {
    try {
      await Voice.stop();
    } catch {}
    setIsListening(false);
  }, []);

  const destroy = useCallback(() => {
    Voice.destroy().then(() => Voice.removeAllListeners()).catch(() => {});
    setIsListening(false);
  }, []);

  return { isListening, transcript, error, isSupported, startListening, stopListening, destroy };
}
