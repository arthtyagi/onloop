export const SESSION_HEADER = "x-onloop-session-id";
export const SESSION_STORAGE_KEY = "onloop-session-id";

const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{6,64}$/;

export function isValidSessionId(
  value: string | null | undefined,
): value is string {
  return typeof value === "string" && SESSION_ID_PATTERN.test(value);
}

export function readSessionId(headers: Headers): string | null {
  const raw = headers.get(SESSION_HEADER);
  return isValidSessionId(raw) ? raw : null;
}
