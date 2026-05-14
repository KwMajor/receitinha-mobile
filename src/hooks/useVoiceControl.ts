import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';

let SpeechRecognition: typeof import('expo-speech-recognition') | null = null;
try {
  SpeechRecognition = require('expo-speech-recognition');
} catch {
  SpeechRecognition = null;
}

const noop = async () => {};

export function useVoiceControl() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const mountedRef = useRef(true);
  const shouldRestartRef = useRef(false);

  useEffect(() => {
    if (!SpeechRecognition) return;
    mountedRef.current = true;
    setIsSupported(true);

    return () => {
      mountedRef.current = false;
      shouldRestartRef.current = false;
      try { SpeechRecognition?.ExpoSpeechRecognitionModule.abort(); } catch {}
    };
  }, []);

  useEffect(() => {
    if (!SpeechRecognition) return;
    const mod = SpeechRecognition.ExpoSpeechRecognitionModule;

    const extractTranscript = (e: any): string => {
      // expo-speech-recognition pode entregar resultados em vários formatos.
      // Tentamos todas as variantes conhecidas para máxima compatibilidade.
      const r = e?.results;
      if (!r) return '';
      // Formato 1: results[0].transcript (mais comum)
      if (typeof r?.[0]?.transcript === 'string') return r[0].transcript;
      // Formato 2: results[resultIndex].transcript
      const idx = typeof e?.resultIndex === 'number' ? e.resultIndex : 0;
      if (typeof r?.[idx]?.transcript === 'string') return r[idx].transcript;
      // Formato 3: results[0][0].transcript (Web Speech API style — array de alternativas)
      if (typeof r?.[0]?.[0]?.transcript === 'string') return r[0][0].transcript;
      // Formato 4: results[last].transcript (entrega só o último)
      const last = r?.[r.length - 1];
      if (typeof last?.transcript === 'string') return last.transcript;
      if (typeof last?.[0]?.transcript === 'string') return last[0].transcript;
      return '';
    };

    const resultSub = mod.addListener('result', (e: any) => {
      if (!mountedRef.current) return;
      const text = extractTranscript(e);
      if (text) setTranscript(text);
    });

    const errorSub = mod.addListener('error', (e) => {
      if (!mountedRef.current) return;
      const code = e?.error ?? '';
      if (code !== 'no-speech' && code !== 'aborted' && code !== 'speech-timeout') {
        setError(e?.message ?? `Erro: ${code}`);
      }
    });

    const endSub = mod.addListener('end', () => {
      if (!mountedRef.current) return;
      // Não baixa isListening durante o ciclo de restart — evita o icone piscando
      if (shouldRestartRef.current) {
        setTimeout(() => {
          if (!mountedRef.current || !shouldRestartRef.current) return;
          try {
            mod.start({
              lang: 'pt-BR',
              interimResults: true,
              continuous: true,
              requiresOnDeviceRecognition: false,
              addsPunctuation: false,
              androidIntentOptions: Platform.OS === 'android' ? {
                EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 15000,
                EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 3000,
                EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 3000,
              } : undefined,
            });
          } catch {}
        }, 100);
      } else {
        setIsListening(false);
      }
    });

    return () => {
      resultSub?.remove?.();
      errorSub?.remove?.();
      endSub?.remove?.();
    };
  }, []);

  const startListening = useCallback(async () => {
    if (!SpeechRecognition) return;
    const mod = SpeechRecognition.ExpoSpeechRecognitionModule;
    try {
      const perm = await mod.requestPermissionsAsync();
      if (!perm.granted) {
        setError('Permissão de microfone negada');
        return;
      }
      setTranscript('');
      setError(null);
      shouldRestartRef.current = true;
      mod.start({
        lang: 'pt-BR',
        interimResults: true,
        continuous: true,
        requiresOnDeviceRecognition: false,
        addsPunctuation: false,
        androidIntentOptions: Platform.OS === 'android' ? {
          EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 15000,
          EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 3000,
          EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 3000,
        } : undefined,
      });
      setIsListening(true);
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao iniciar reconhecimento');
      setIsListening(false);
    }
  }, []);

  const stopListening = useCallback(async () => {
    if (!SpeechRecognition) return;
    shouldRestartRef.current = false;
    try { SpeechRecognition.ExpoSpeechRecognitionModule.stop(); } catch {}
    setIsListening(false);
  }, []);

  const destroy = useCallback(() => {
    if (!SpeechRecognition) return;
    shouldRestartRef.current = false;
    try { SpeechRecognition.ExpoSpeechRecognitionModule.abort(); } catch {}
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  if (!SpeechRecognition) {
    return {
      isListening: false,
      transcript: '',
      error: 'expo-speech-recognition não disponível neste build',
      isSupported: false,
      startListening: noop,
      stopListening: noop,
      destroy: () => {},
      resetTranscript: () => {},
    };
  }

  return {
    isListening,
    transcript,
    error,
    isSupported,
    startListening,
    stopListening,
    destroy,
    resetTranscript,
  };
}
