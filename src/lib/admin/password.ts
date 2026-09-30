import "server-only";
import { randomInt } from "node:crypto";

// No look-alike characters (0/O, 1/l/I), so a password read from an email is easy to type.
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnopqrstuvwxyz";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%*?-";
const ALL = UPPER + LOWER + DIGITS + SYMBOLS;

/** A one-time password: 16 characters with at least one of each kind, from a secure random source. */
export function generateTemporaryPassword(length = 16) {
  const pick = (set: string) => set[randomInt(set.length)];
  const chars = [pick(UPPER), pick(LOWER), pick(DIGITS), pick(SYMBOLS)];
  while (chars.length < length) chars.push(pick(ALL));
  // Fisher-Yates shuffle so the guaranteed characters aren't always first.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
