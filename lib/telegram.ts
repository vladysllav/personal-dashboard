import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Telegram Mini App sign-in.
 *
 * When Telegram opens the app it hands the page `initData` — a query string of
 * the user's identity plus an HMAC the bot token can reproduce. Anyone can type
 * that string by hand, so it is worth exactly as much as its signature: every
 * field below is untrusted until `verifyInitData` returns.
 */

export type TelegramUser = {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
};

/**
 * How old an `initData` may be and still be accepted.
 *
 * Telegram does not expire it, so without a bound a string captured once works
 * forever. A day is long enough that a Mini App left open overnight still signs
 * in, and short enough that a leaked string stops being a key.
 */
const MAX_AGE_SECONDS = 24 * 60 * 60;

function hmac(key: string | Buffer, data: string): Buffer {
  return createHmac("sha256", key).update(data).digest();
}

/** Constant-time compare that will not throw on a length mismatch. */
function equalHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

/**
 * Verify the signature and return the user, or null for anything suspect.
 *
 * Returning null rather than throwing is deliberate: every rejection here is a
 * failed sign-in attempt and they all mean the same thing to the caller. A
 * reason distinguishable from outside would only help someone probing it.
 */
export function verifyInitData(
  initData: string,
  botToken: string,
  now: Date = new Date(),
): TelegramUser | null {
  if (!initData || !botToken) return null;

  let params: URLSearchParams;
  try {
    params = new URLSearchParams(initData);
  } catch {
    return null;
  }

  const hash = params.get("hash");
  if (!hash) return null;

  /**
   * The signed payload is every other field as `key=value`, sorted by key and
   * joined with newlines. URLSearchParams has already percent-decoded them,
   * which is what Telegram signs.
   */
  const dataCheckString = [...params.entries()]
    .filter(([key]) => key !== "hash" && key !== "signature")
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  // Two rounds: the bot token is keyed by the literal "WebAppData" to make the
  // secret, and the secret keys the payload. Getting these the wrong way round
  // produces a plausible-looking digest that never matches.
  const secret = hmac("WebAppData", botToken);
  const expected = hmac(secret, dataCheckString).toString("hex");

  if (!equalHex(hash, expected)) return null;

  const authDate = Number(params.get("auth_date"));
  if (!Number.isFinite(authDate)) return null;
  const ageSeconds = Math.floor(now.getTime() / 1000) - authDate;
  // A future timestamp is as wrong as an ancient one: the clock it came from
  // is not one we can reason about.
  if (ageSeconds < -60 || ageSeconds > MAX_AGE_SECONDS) return null;

  const rawUser = params.get("user");
  if (!rawUser) return null;

  try {
    const parsed = JSON.parse(rawUser) as Record<string, unknown>;
    const id = parsed.id;
    const firstName = parsed.first_name;
    if (typeof id !== "number" || !Number.isFinite(id)) return null;
    if (typeof firstName !== "string") return null;

    return {
      id,
      firstName,
      lastName: typeof parsed.last_name === "string" ? parsed.last_name : undefined,
      username: typeof parsed.username === "string" ? parsed.username : undefined,
      photoUrl: typeof parsed.photo_url === "string" ? parsed.photo_url : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Telegram ids allowed in, read the same way the Google allowlist is: an unset
 * or empty list admits nobody. A dashboard on a public URL has to fail closed.
 */
export function allowedTelegramIds(): string[] {
  return (process.env.ALLOWED_TELEGRAM_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export function isAllowedTelegramId(id: number | string): boolean {
  const allowed = allowedTelegramIds();
  if (allowed.length === 0) return false;
  return allowed.includes(String(id));
}
