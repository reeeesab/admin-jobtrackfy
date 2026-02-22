import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

const ADMIN_SESSION_COOKIE = 'admin_session';

type AdminUser = {
  username: string;
  password: string;
};

function parseUsersFromEnv(): AdminUser[] {
  const raw = process.env.ADMIN_USERS;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const users = parsed
          .filter((entry): entry is AdminUser => {
            return !!entry && typeof entry.username === 'string' && typeof entry.password === 'string';
          })
          .map((entry) => ({ username: entry.username.trim(), password: entry.password }))
          .filter((entry) => entry.username && entry.password);
        if (users.length) return users;
      }
    } catch {
      // Fall through to pair-based env parsing.
    }
  }

  const pairs: AdminUser[] = [];
  const firstUsername = process.env.ADMIN_USER_1_USERNAME?.trim();
  const firstPassword = process.env.ADMIN_USER_1_PASSWORD;
  const secondUsername = process.env.ADMIN_USER_2_USERNAME?.trim();
  const secondPassword = process.env.ADMIN_USER_2_PASSWORD;

  if (firstUsername && firstPassword) pairs.push({ username: firstUsername, password: firstPassword });
  if (secondUsername && secondPassword) pairs.push({ username: secondUsername, password: secondPassword });

  return pairs;
}

function getSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || 'change-this-admin-session-secret';
}

function sign(input: string) {
  return createHmac('sha256', getSessionSecret()).update(input).digest('base64url');
}

function compareSafe(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

export function validateAdminCredentials(username: string, password: string) {
  const users = parseUsersFromEnv();
  const matched = users.find((user) => user.username === username);
  if (!matched) return false;
  return compareSafe(matched.password, password);
}

export function createAdminSessionToken(username: string) {
  const payload = Buffer.from(JSON.stringify({ username }), 'utf8').toString('base64url');
  const sig = sign(payload);
  return `${payload}.${sig}`;
}

export function decodeAdminSessionToken(token: string | undefined | null) {
  if (!token) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = sign(payload);
  if (!compareSafe(expected, sig)) return null;

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { username?: unknown };
    return typeof decoded.username === 'string' && decoded.username ? decoded.username : null;
  } catch {
    return null;
  }
}

export async function getAuthenticatedAdminUser() {
  const store = await cookies();
  return decodeAdminSessionToken(store.get(ADMIN_SESSION_COOKIE)?.value);
}

export function getAdminSessionCookieName() {
  return ADMIN_SESSION_COOKIE;
}

