"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

interface HeartbeatContextValue {
  isOnline: boolean;
}

const HeartbeatContext = createContext<HeartbeatContextValue>({ isOnline: false });

export function useHeartbeat() {
  return useContext(HeartbeatContext);
}

export function HeartbeatProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    async function heartbeat() {
      abortRef.current = new AbortController();
      try {
        const response = await fetch("/api/heartbeat", {
          method: "POST",
          signal: abortRef.current.signal,
        });
        setIsOnline(response.ok);
      } catch {
        setIsOnline(false);
      } finally {
        timeoutRef.current = setTimeout(heartbeat, 30000);
      }
    }

    heartbeat();

    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return <HeartbeatContext.Provider value={{ isOnline }}>{children}</HeartbeatContext.Provider>;
}
