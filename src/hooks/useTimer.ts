import { useState, useEffect, useRef, useCallback } from 'react';
import { scheduleTimerNotification, cancelNotification } from '../services/notifications';

interface UseTimerProps {
  initialSeconds: number;
  stepTitle: string;
  onComplete?: () => void;
}

export const useTimer = ({ initialSeconds, stepTitle, onComplete }: UseTimerProps) => {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const notificationIdRef = useRef<string | null>(null);

  // Limpa o intervalo no unmount
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && seconds > 0) {
      interval = setInterval(() => {
        setSeconds((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            setIsDone(true);
            if (onComplete) onComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, seconds, onComplete]);

  // Limpa a notificação local prevendo interrupções
  useEffect(() => {
    return () => {
      if (notificationIdRef.current) {
        cancelNotification(notificationIdRef.current);
      }
    };
  }, []);

  const start = async () => {
    if (seconds <= 0) return;
    setIsRunning(true);
    setIsDone(false);
    
    if (!notificationIdRef.current) {
      const id = await scheduleTimerNotification(stepTitle, seconds);
      notificationIdRef.current = id;
    }
  };

  const pause = async () => {
    setIsRunning(false);
    if (notificationIdRef.current) {
      await cancelNotification(notificationIdRef.current);
      notificationIdRef.current = null;
    }
  };

  const reset = async () => {
    setIsRunning(false);
    setIsDone(false);
    setSeconds(initialSeconds);
    if (notificationIdRef.current) {
      await cancelNotification(notificationIdRef.current);
      notificationIdRef.current = null;
    }
  };

  const setDuration = useCallback((s: number) => {
    setIsRunning(false);
    setIsDone(false);
    setSeconds(s);
    if (notificationIdRef.current) {
      cancelNotification(notificationIdRef.current).catch(() => {});
      notificationIdRef.current = null;
    }
  }, []);

  return {
    seconds,
    isRunning,
    isDone,
    start,
    pause,
    reset,
    setDuration,
  };
};
