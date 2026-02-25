import { createSign } from 'crypto';

const GOOGLE_OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_ANALYTICS_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';
const GOOGLE_ANALYTICS_ENDPOINT = 'https://analyticsdata.googleapis.com/v1beta';

type RunReportResponse = {
  rows?: Array<{
    dimensionValues?: Array<{ value?: string }>;
    metricValues?: Array<{ value?: string }>;
  }>;
};

export type GaOverviewMetrics = {
  activeUsers: number;
  newUsers: number;
  sessions: number;
  screenPageViews: number;
};

export type GaAnalyticsResponse = {
  last7: GaOverviewMetrics;
  last30: GaOverviewMetrics;
  topPages: Array<{ pagePath: string; views: number }>;
};

function base64UrlEncode(input: string) {
  return Buffer.from(input).toString('base64url');
}

function signJwt(unsignedToken: string, privateKey: string) {
  const signer = createSign('RSA-SHA256');
  signer.update(unsignedToken);
  signer.end();
  return signer.sign(privateKey).toString('base64url');
}

function buildServiceAccountJwt(clientEmail: string, privateKey: string) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: clientEmail,
    scope: GOOGLE_ANALYTICS_SCOPE,
    aud: GOOGLE_OAUTH_TOKEN_URL,
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const unsigned = `${encodedHeader}.${encodedPayload}`;
  const signature = signJwt(unsigned, privateKey);
  return `${unsigned}.${signature}`;
}

async function getGoogleAccessToken(clientEmail: string, privateKey: string) {
  const assertion = buildServiceAccountJwt(clientEmail, privateKey);
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  });

  const tokenRes = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    throw new Error(`Failed to get Google access token: ${tokenRes.status} ${text}`);
  }

  const tokenJson = (await tokenRes.json()) as { access_token?: string };
  if (!tokenJson.access_token) {
    throw new Error('Google OAuth token response missing access_token');
  }
  return tokenJson.access_token;
}

function parseOverviewMetrics(data: RunReportResponse): GaOverviewMetrics {
  const row = data.rows?.[0];
  const values = row?.metricValues ?? [];
  return {
    activeUsers: Number(values[0]?.value ?? 0),
    newUsers: Number(values[1]?.value ?? 0),
    sessions: Number(values[2]?.value ?? 0),
    screenPageViews: Number(values[3]?.value ?? 0),
  };
}

function parseTopPages(data: RunReportResponse) {
  return (data.rows ?? []).map((row) => ({
    pagePath: row.dimensionValues?.[0]?.value || '/',
    views: Number(row.metricValues?.[0]?.value ?? 0),
  }));
}

async function runReport(
  accessToken: string,
  propertyId: string,
  payload: Record<string, unknown>
) {
  const res = await fetch(`${GOOGLE_ANALYTICS_ENDPOINT}/properties/${propertyId}:runReport`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Analytics runReport failed: ${res.status} ${text}`);
  }

  return (await res.json()) as RunReportResponse;
}

export async function fetchGaAnalytics(): Promise<GaAnalyticsResponse> {
  const propertyId = process.env.GA4_PROPERTY_ID?.trim();
  const clientEmail = process.env.GA4_CLIENT_EMAIL?.trim();
  const rawPrivateKey = process.env.GA4_PRIVATE_KEY;

  if (!propertyId || !clientEmail || !rawPrivateKey) {
    throw new Error('GA4 env missing: GA4_PROPERTY_ID, GA4_CLIENT_EMAIL, GA4_PRIVATE_KEY are required');
  }

  const privateKey = rawPrivateKey.replace(/\\n/g, '\n');
  const accessToken = await getGoogleAccessToken(clientEmail, privateKey);

  const [last7Res, last30Res, topPagesRes] = await Promise.all([
    runReport(accessToken, propertyId, {
      dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'newUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
      ],
      limit: 1,
    }),
    runReport(accessToken, propertyId, {
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'newUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
      ],
      limit: 1,
    }),
    runReport(accessToken, propertyId, {
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 5,
    }),
  ]);

  return {
    last7: parseOverviewMetrics(last7Res),
    last30: parseOverviewMetrics(last30Res),
    topPages: parseTopPages(topPagesRes),
  };
}

