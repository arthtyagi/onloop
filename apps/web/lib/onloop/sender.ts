import { customAlphabet } from "nanoid";

const anonSuffix = customAlphabet("23456789abcdefghjkmnpqrstvwxyz", 6);

export function maskEmail(email: string): string {
  const trimmed = email.trim();
  const at = trimmed.lastIndexOf("@");
  if (at < 1) {
    return "anon";
  }
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  const head = local[0];
  const tail = local[local.length - 1];
  return `${head}***${tail}@${domain}`;
}

export function generateAnonHandle(): string {
  return `anon-${anonSuffix()}`;
}

export function stripKTag(subject: string): string {
  return subject.replace(/\[K=\d\]/g, "").trim();
}
