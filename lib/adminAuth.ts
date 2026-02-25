import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { createSupabaseAdminClient } from './supabaseAdmin';

const ADMIN_SESSION_COOKIE = 'admin_session';

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
  return verifyAdminCredentialsFromDb(username, password);
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

export async function hasAnyAdminUser() {
  const supabase = createSupabaseAdminClient();
  const { count, error } = await supabase
    .from('admin_users')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true);

  if (error) return false;
  return (count || 0) > 0;
}

async function verifyAdminCredentialsFromDb(username: string, password: string): Promise<boolean> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc('verify_admin_credentials', {
    p_username: username,
    p_password: password,
  });

  if (error) return false;
  return Boolean(data);
}
