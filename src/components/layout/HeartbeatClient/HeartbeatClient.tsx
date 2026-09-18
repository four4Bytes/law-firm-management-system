"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { touchLastSeenAction } from "@/features/users/actions";
import { HEARTBEAT_INTERVAL_MS } from "@/features/users/constants";

interface HeartbeatContextValue {
  isOnline: boolean;
}

const HeartbeatContext = createContext<HeartbeatContextValue>({ isOnline: false });

export function useHeartbeat(): HeartbeatContextValue {
  return useContext(HeartbeatContext);
}

interface HeartbeatProviderProps {
  children: ReactNode;
}

export function HeartbeatProvider({ children }: HeartbeatProviderProps) {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    let disposed = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    async function heartbeat(): Promise<void> {
      try {
        if (!document.hidden) {
          const result = await touchLastSeenAction();
          if (!disposed) setIsOnline(result.success);
        }
      } catch {
        if (!disposed) setIsOnline(false);
      } finally {
        if (!disposed) {
          timeoutId = setTimeout(() => void heartbeat(), HEARTBEAT_INTERVAL_MS);
        }
      }
    }

    void heartbeat();

    return () => {
      disposed = true;
      clearTimeout(timeoutId);
    };
  }, []);

  return <HeartbeatContext.Provider value={{ isOnline }}>{children}</HeartbeatContext.Provider>;
}
