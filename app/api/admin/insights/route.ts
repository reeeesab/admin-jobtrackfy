import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
    const range = { start7: daysAgo(7), start30: daysAgo(30) };

    const { data: marketing30 } = await supabase
      .from('marketing_events')
      .select('anon_id, created_at')
      .eq('event_name', 'home_view')
      .gte('created_at', range.start30)
      .limit(5000);

    const { data: marketing7 } = await supabase
      .from('marketing_events')
      .select('anon_id, created_at')
      .eq('event_name', 'home_view')
      .gte('created_at', range.start7)
      .limit(5000);

    const { data: dashboard30 } = await supabase
      .from('feature_events')
      .select('user_id, created_at')
      .eq('event_name', 'dashboard_view')
      .gte('created_at', range.start30)
      .limit(5000);

    const { data: dashboard7 } = await supabase
      .from('feature_events')
      .select('user_id, created_at')
      .eq('event_name', 'dashboard_view')
      .gte('created_at', range.start7)
      .limit(5000);

    const { data: subs30 } = await supabase
      .from('subscriptions')
      .select('user_id, status, created_at, amount, currency')
      .gte('created_at', range.start30)
      .limit(5000);

    const { data: subs7 } = await supabase
      .from('subscriptions')
      .select('user_id, status, created_at, amount, currency')
      .gte('created_at', range.start7)
      .limit(5000);

    const { data: payments30 } = await supabase
      .from('payment_transactions')
      .select('amount, currency, status, created_at')
      .eq('status', 'success')
      .gte('created_at', range.start30)
      .limit(5000);

    const { data: paymentsAll } = await supabase
      .from('payment_transactions')
      .select('amount, currency, status, created_at')
      .eq('status', 'success')
      .limit(10000);

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

    const funnel = {
      last30: {
        homeViews: (marketing30 || []).length,
        uniqueVisitors: uniq(marketing30, 'anon_id'),
        dashboardUsers: uniq(dashboard30, 'user_id'),
        purchasers: uniq((subs30 || []).filter((s) => s.status === 'active'), 'user_id'),
      },
      last7: {
        homeViews: (marketing7 || []).length,
        uniqueVisitors: uniq(marketing7, 'anon_id'),
        dashboardUsers: uniq(dashboard7, 'user_id'),
        purchasers: uniq((subs7 || []).filter((s) => s.status === 'active'), 'user_id'),
      },
    };

    const revenue = {
      last30: sumByCurrency(payments30),
      allTime: sumByCurrency(paymentsAll),
    };

    return NextResponse.json({ funnel, revenue });
  } catch (err) {
    console.error('admin insights error:', err);
    return NextResponse.json({ error: 'unexpected error' }, { status: 500 });
  }
}
