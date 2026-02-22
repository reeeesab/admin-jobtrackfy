import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const FIRST_VALUE_EVENTS = [
  'extension_bookmark',
  'extension_application',
  'extension_contact',
  'ai_answer_generator',
  'ai_cover_letter',
  'ai_outreach',
  'ai_linkedin_profile',
  'ai_project_description',
  'ai_mock_interview_start',
  'ai_mock_interview_turn',
  'dashboard_view',
];

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY or URL not configured' }, { status: 500 });
  }

  const supabase = createClient(url, serviceRole);
  const now = new Date();
  const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

  try {
    const start1 = daysAgo(1);
    const start7 = daysAgo(7);
    const start30 = daysAgo(30);
    const start60 = daysAgo(60);

    const { data: marketing30 } = await supabase
      .from('marketing_events')
      .select('anon_id, created_at, metadata')
      .eq('event_name', 'home_view')
      .gte('created_at', start30)
      .limit(10000);

    const { data: marketing7 } = await supabase
      .from('marketing_events')
      .select('anon_id, created_at, metadata')
      .eq('event_name', 'home_view')
      .gte('created_at', start7)
      .limit(10000);

    const { data: users30 } = await supabase
      .from('users')
      .select('id, created_at')
      .gte('created_at', start30)
      .limit(10000);

    const { data: users60 } = await supabase
      .from('users')
      .select('id, created_at')
      .gte('created_at', start60)
      .limit(20000);

    const { data: events30 } = await supabase
      .from('feature_events')
      .select('user_id, event_name, created_at')
      .gte('created_at', start30)
      .limit(20000);

    const { data: events60 } = await supabase
      .from('feature_events')
      .select('user_id, event_name, created_at')
      .gte('created_at', start60)
      .limit(40000);

    const { data: activeSubs } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('status', 'active')
      .limit(20000);

    const { data: payments30 } = await supabase
      .from('payment_transactions')
      .select('amount, currency, status, created_at')
      .eq('status', 'success')
      .gte('created_at', start30)
      .limit(10000);

    const { data: paymentsAll } = await supabase
      .from('payment_transactions')
      .select('amount, currency, status, created_at')
      .eq('status', 'success')
      .limit(20000);

    const uniq = (rows: any[] | null, key: string) => {
      const set = new Set<string>();
      (rows || []).forEach((row) => {
        if (row?.[key]) set.add(row[key]);
      });
      return set.size;
    };

    const sumByCurrency = (rows: any[] | null) => {
      const totals: Record<string, number> = {};
      (rows || []).forEach((row) => {
        const currency = row.currency || 'USD';
        const amount = Number(row.amount || 0);
        totals[currency] = (totals[currency] || 0) + amount;
      });
      return totals;
    };

    const extractReferrerHost = (referrer: string) => {
      try {
        const urlObj = new URL(referrer);
        return urlObj.hostname.replace(/^www\./, '');
      } catch {
        return 'direct';
      }
    };

    const topReferrers = (rows: any[] | null) => {
      const counts: Record<string, number> = {};
      (rows || []).forEach((row) => {
        const ref = row?.metadata?.referrer || null;
        const host = ref ? extractReferrerHost(ref) : 'direct';
        counts[host] = (counts[host] || 0) + 1;
      });
      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([source, count]) => ({ source, count }));
    };

    const totalUsers = users60?.length || 0;
    const activeSubscribers = activeSubs?.length || 0;

    // Activation metrics (last 30 days cohort)
    const users30Map = new Map<string, string>();
    (users30 || []).forEach((u: any) => {
      if (u?.id && u?.created_at) users30Map.set(u.id, u.created_at);
    });

    const firstValueEvents = (events30 || []).filter((e: any) => FIRST_VALUE_EVENTS.includes(e.event_name));
    const firstEventByUser = new Map<string, string>();
    firstValueEvents.forEach((e: any) => {
      if (!e?.user_id || !e?.created_at) return;
      const existing = firstEventByUser.get(e.user_id);
      if (!existing || new Date(e.created_at) < new Date(existing)) {
        firstEventByUser.set(e.user_id, e.created_at);
      }
    });

    const activationDiffsHours: number[] = [];
    let activatedWithin24h = 0;
    users30Map.forEach((createdAt, userId) => {
      const firstEventAt = firstEventByUser.get(userId);
      if (!firstEventAt) return;
      const diffMs = new Date(firstEventAt).getTime() - new Date(createdAt).getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      if (diffHours >= 0) {
        activationDiffsHours.push(diffHours);
        if (diffHours <= 24) activatedWithin24h += 1;
      }
    });

    const avgTimeToFirstValueHours = activationDiffsHours.length
      ? activationDiffsHours.reduce((a, b) => a + b, 0) / activationDiffsHours.length
      : null;

    const sortedDiffs = [...activationDiffsHours].sort((a, b) => a - b);
    const medianTimeToFirstValueHours = sortedDiffs.length
      ? sortedDiffs[Math.floor(sortedDiffs.length / 2)]
      : null;

    const activationRate24h = users30Map.size
      ? Math.round((activatedWithin24h / users30Map.size) * 1000) / 10
      : 0;

    // Engagement metrics
    const dau = uniq((events30 || []).filter((e: any) => e.created_at >= start1), 'user_id');
    const wau = uniq((events30 || []).filter((e: any) => e.created_at >= start7), 'user_id');
    const mau = uniq(events30 || [], 'user_id');
    const stickiness = mau ? Math.round((dau / mau) * 1000) / 10 : 0;

    // Retention (cohort based on signup date)
    const usersFor7 = (users60 || []).filter((u: any) => u.created_at >= start30 && u.created_at < start7);
    const usersFor30 = (users60 || []).filter((u: any) => u.created_at >= start60 && u.created_at < start30);

    const eventsByUser = new Map<string, string[]>();
    (events60 || []).forEach((e: any) => {
      if (!e?.user_id || !e?.created_at) return;
      const arr = eventsByUser.get(e.user_id) || [];
      arr.push(e.created_at);
      eventsByUser.set(e.user_id, arr);
    });

    const retentionFor = (users: any[], days: number) => {
      if (!users.length) return 0;
      let retained = 0;
      users.forEach((u: any) => {
        const createdAt = new Date(u.created_at).getTime();
        const threshold = createdAt + days * 24 * 60 * 60 * 1000;
        const userEvents = eventsByUser.get(u.id) || [];
        const hasReturn = userEvents.some((ts) => new Date(ts).getTime() >= threshold);
        if (hasReturn) retained += 1;
      });
      return Math.round((retained / users.length) * 1000) / 10;
    };

    const retention7 = retentionFor(usersFor7, 7);
    const retention30 = retentionFor(usersFor30, 30);

    const acquisition = {
      last30: {
        homeViews: (marketing30 || []).length,
        uniqueVisitors: uniq(marketing30, 'anon_id'),
        signups: users30?.length || 0,
        signupConversion: (marketing30?.length || 0)
          ? Math.round(((users30?.length || 0) / uniq(marketing30, 'anon_id')) * 1000) / 10
          : 0,
        topReferrers: topReferrers(marketing30),
      },
      last7: {
        homeViews: (marketing7 || []).length,
        uniqueVisitors: uniq(marketing7, 'anon_id'),
        signups: (users30 || []).filter((u: any) => u.created_at >= start7).length,
        signupConversion: (marketing7?.length || 0)
          ? Math.round(((users30 || []).filter((u: any) => u.created_at >= start7).length / uniq(marketing7, 'anon_id')) * 1000) / 10
          : 0,
        topReferrers: topReferrers(marketing7),
      },
    };

    const activation = {
      activationRate24h,
      avgTimeToFirstValueHours,
      medianTimeToFirstValueHours,
      activatedUsers: activationDiffsHours.length,
      cohortSize: users30Map.size,
    };

    const engagement = {
      dau,
      wau,
      mau,
      stickiness,
    };

    const retention = {
      retention7,
      retention30,
    };

    const revenue = {
      activeSubscribers,
      conversionToPaid: totalUsers ? Math.round((activeSubscribers / totalUsers) * 1000) / 10 : 0,
      last30: sumByCurrency(payments30),
      allTime: sumByCurrency(paymentsAll),
    };

    return NextResponse.json({
      acquisition,
      activation,
      engagement,
      retention,
      revenue,
    });
  } catch (err) {
    console.error('admin analytics error:', err);
    return NextResponse.json({ error: 'unexpected error' }, { status: 500 });
  }
}
