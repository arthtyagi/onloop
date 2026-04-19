"use client";

import { useState } from "react";
import { isValidSessionId, SESSION_STORAGE_KEY } from "./session";

function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "");
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function readOrCreate(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const stored = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (isValidSessionId(stored)) {
      return stored;
    }
    const fresh = generateId();
    window.localStorage.setItem(SESSION_STORAGE_KEY, fresh);
    return fresh;
  } catch (err) {
    void err;
    return generateId();
  }
}

export function useSessionId(): string | null {
  const [sessionId] = useState<string | null>(readOrCreate);
  return sessionId;
}
