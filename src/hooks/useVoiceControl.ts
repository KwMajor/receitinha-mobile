import { useState, useEffect, useCallback, useRef } from 'react';

// Lazy require — módulo nativo não disponível no Expo Go sem prebuild.
// Se falhar, o hook retorna isSupported=false e todas as funções viram no-op.
let Voice: typeof import('@react-native-voice/voice').default | null = null;
try {
  Voice = require('@react-native-voice/voice').default;
} catch {
  Voice = null;
}

type SpeechResultsEvent = import('@react-native-voice/voice').SpeechResultsEvent;
type SpeechErrorEvent   = import('@react-native-voice/voice').SpeechErrorEvent;

const noop = async () => {};

export function useVoiceControl() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    if (!Voice) return;
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
      const code = (e.error as any)?.code ?? '';
      if (code !== '7' && code !== 7) {
        setError(e.error?.message ?? 'Erro no reconhecimento de voz');
      }
      setIsListening(false);
    };

    Voice.onSpeechEnd = () => {
      if (mountedRef.current) setIsListening(false);
    };

    const v = Voice;
    return () => {
      mountedRef.current = false;
      v.destroy().then(() => v.removeAllListeners()).catch(() => {});
    };
  }, []);

  const startListening = useCallback(async () => {
    if (!Voice) return;
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
    if (!Voice) return;
    try { await Voice.stop(); } catch {}
    setIsListening(false);
  }, []);

  const destroy = useCallback(() => {
    if (!Voice) return;
    Voice.destroy().then(() => Voice!.removeAllListeners()).catch(() => {});
    setIsListening(false);
  }, []);

  if (!Voice) {
    return {
      isListening: false, transcript: '', error: null, isSupported: false,
      startListening: noop, stopListening: noop, destroy: () => {},
    };
  }

  return { isListening, transcript, error, isSupported, startListening, stopListening, destroy };
}
