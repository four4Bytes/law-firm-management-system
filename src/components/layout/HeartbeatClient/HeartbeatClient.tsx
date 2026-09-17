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
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function heartbeat() {
      try {
        const response = await fetch("/api/heartbeat", { method: "POST" });
        setIsOnline(response.ok);
      } catch {
        setIsOnline(false);
      }
    }

    heartbeat();
    intervalRef.current = setInterval(heartbeat, 30000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return <HeartbeatContext.Provider value={{ isOnline }}>{children}</HeartbeatContext.Provider>;
}
