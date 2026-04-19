"use client";

import { useEffect, useState } from "react";
import { isValidSessionId, SESSION_STORAGE_KEY } from "./session";

function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "");
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function useSessionId(): string | null {
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const stored = window.localStorage.getItem(SESSION_STORAGE_KEY);
      if (isValidSessionId(stored)) {
        setSessionId(stored);
        return;
      }
      const fresh = generateId();
      window.localStorage.setItem(SESSION_STORAGE_KEY, fresh);
      setSessionId(fresh);
    } catch (err) {
      void err;
      setSessionId(generateId());
    }
  }, []);

  return sessionId;
}
