import { NextResponse } from 'next/server';
import { fetchGaAnalytics } from '@/lib/googleAnalytics';
import { getAuthenticatedAdminUser } from '@/lib/adminAuth';

export async function GET() {
  const user = await getAuthenticatedAdminUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await fetchGaAnalytics();
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch Google Analytics data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

