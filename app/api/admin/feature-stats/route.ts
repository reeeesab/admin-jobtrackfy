import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY or URL not configured' }, { status: 500 });
  }

  const supabase = createClient(url, serviceRole);

  try {
    const now = new Date();
    const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data: events30 } = await supabase
      .from('feature_events')
      .select('event_name, user_id, created_at')
      .gte('created_at', daysAgo(30))
      .limit(5000);

    const { data: events7 } = await supabase
      .from('feature_events')
      .select('event_name, user_id, created_at')
      .gte('created_at', daysAgo(7))
      .limit(5000);

    const summarize = (rows: any[] | null) => {
      const byEvent: Record<string, number> = {};
      const users = new Set<string>();
      (rows || []).forEach((row) => {
        if (row.event_name) {
          byEvent[row.event_name] = (byEvent[row.event_name] || 0) + 1;
        }
        if (row.user_id) users.add(row.user_id);
      });
      const top = Object.entries(byEvent)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([event, count]) => ({ event, count }));
      return {
        totalEvents: rows ? rows.length : 0,
        activeUsers: users.size,
        top,
      };
    };

    return NextResponse.json({
      last30: summarize(events30),
      last7: summarize(events7),
    });
  } catch (err) {
    console.error('feature-stats error:', err);
    return NextResponse.json({ error: 'unexpected error' }, { status: 500 });
  }
}
