"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import { getUnreadNotificationCountAction } from "../actions";

export function useUnreadCount(
  initialCount: number,
): readonly [number, Dispatch<SetStateAction<number>>] {
  const [count, setCount] = useState(initialCount);
  const seqRef = useRef(0);

  const wrappedSetCount: Dispatch<SetStateAction<number>> = useCallback((value) => {
    seqRef.current += 1;
    setCount(value);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      const seq = ++seqRef.current;
      try {
        const newCount = await getUnreadNotificationCountAction();
        if (!cancelled && seq === seqRef.current) setCount(newCount);
      } catch {
        // Swallow server-action errors during silent polling
      }
    }

    const intervalId = setInterval(() => {
      void poll();
    }, 30_000);

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") void poll();
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    function handleFocus() {
      void poll();
    }
    window.addEventListener("focus", handleFocus);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  return [count, wrappedSetCount] as const;
}
