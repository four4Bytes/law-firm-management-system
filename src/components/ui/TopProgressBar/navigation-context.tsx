"use client";

import { usePathname, useSearchParams } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type LoadingState = "idle" | "loading" | "completing";

interface NavigationContextValue {
  startLoading: () => void;
  state: LoadingState;
}

const MIN_DISPLAY_MS = 500;
const MAX_TIMEOUT_MS = 8_000;
const COMPLETING_DURATION_MS = 500;

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function useNavigationProgress(): NavigationContextValue {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    return { startLoading: () => {}, state: "idle" };
  }
  return ctx;
}

export function NavigationProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [state, setState] = useState<LoadingState>("idle");

  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const loadingStartedAt = useRef(0);
  const maxTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined!);
  const pendingCompleteRef = useRef<ReturnType<typeof setTimeout>>(undefined!);
  const completingTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined!);
  const prevUrlRef = useRef(`${pathname}${searchParams.toString()}`);

  const completeLoading = useCallback(() => {
    if (stateRef.current !== "loading") return;

    const elapsed = Date.now() - loadingStartedAt.current;
    const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);

    clearTimeout(maxTimeoutRef.current);

    pendingCompleteRef.current = setTimeout(() => {
      if (stateRef.current !== "loading") return;
      setState("completing");
      completingTimeoutRef.current = setTimeout(() => {
        setState("idle");
      }, COMPLETING_DURATION_MS);
    }, remaining);
  }, []);

  const startLoading = useCallback(() => {
    clearTimeout(completingTimeoutRef.current);
    clearTimeout(maxTimeoutRef.current);
    clearTimeout(pendingCompleteRef.current);

    loadingStartedAt.current = Date.now();
    setState("loading");

    maxTimeoutRef.current = setTimeout(() => {
      if (stateRef.current === "loading") {
        completeLoading();
      }
    }, MAX_TIMEOUT_MS);
  }, [completeLoading]);

  useEffect(() => {
    const currentUrl = `${pathname}${searchParams.toString()}`;

    if (currentUrl !== prevUrlRef.current) {
      prevUrlRef.current = currentUrl;
      if (stateRef.current === "loading") {
        completeLoading();
      }
    }
  }, [pathname, searchParams, completeLoading]);

  useEffect(() => {
    return () => {
      clearTimeout(maxTimeoutRef.current);
      clearTimeout(pendingCompleteRef.current);
      clearTimeout(completingTimeoutRef.current);
    };
  }, []);

  return (
    <NavigationContext.Provider value={{ startLoading, state }}>
      {children}
    </NavigationContext.Provider>
  );
}
