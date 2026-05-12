import { useEffect, useEffectEvent, useState } from 'react';

interface UseIdleResetOptions {
  enabled: boolean;
  timeoutSeconds: number;
  onTimeout: () => void;
}

const activityEvents = [
  'pointerdown',
  'pointermove',
  'keydown',
  'wheel',
  'touchstart',
  'mousedown'
] as const;

export function useIdleReset({ enabled, timeoutSeconds, onTimeout }: UseIdleResetOptions) {
  const [deadline, setDeadline] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const renewDeadline = useEffectEvent(() => {
    if (!enabled) {
      return;
    }

    const nextDeadline = Date.now() + timeoutSeconds * 1000;
    setDeadline(nextDeadline);
    setNow(Date.now());
  });

  const triggerTimeout = useEffectEvent(() => {
    setDeadline(null);
    onTimeout();
  });

  useEffect(() => {
    if (!enabled) {
      setDeadline(null);
      return;
    }

    setDeadline(Date.now() + timeoutSeconds * 1000);
    setNow(Date.now());
  }, [enabled, timeoutSeconds]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleActivity = () => {
      renewDeadline();
    };

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity);
    });

    return () => {
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity);
      });
    };
  }, [enabled, renewDeadline]);

  useEffect(() => {
    if (!enabled || deadline === null) {
      return;
    }

    if (now >= deadline) {
      triggerTimeout();
    }
  }, [deadline, enabled, now, triggerTimeout]);

  if (!enabled || deadline === null) {
    return null;
  }

  return Math.max(0, Math.ceil((deadline - now) / 1000));
}
