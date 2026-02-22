"use client";

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import BlogEditor from './components/BlogEditor';

export default function AdminDashboard() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [locationStats, setLocationStats] = useState<Record<string, number>>({});
  const [weeklyActivity, setWeeklyActivity] = useState<number[]>([]);
  const [featureStats, setFeatureStats] = useState<any>(null);
  const [insights, setInsights] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'acquisition' | 'activation' | 'engagement' | 'retention' | 'revenue' | 'blogs'>('overview');

  useEffect(() => {
    const loadStats = async () => {
      try {
        // Try server-side admin route first (requires SUPABASE_SERVICE_ROLE_KEY)
        try {
          const res = await fetch('/api/admin/stats');
          if (res.ok) {
            const json = await res.json();
            if (json?.totalUsers !== undefined) {
              setTotalUsers(json.totalUsers);
            }
          }
        } catch (e) {
          // ignore and fallback to client-side queries
          console.warn('Admin stats route not available, falling back to client queries');
        }

        // Total users from profiles
        const { data: profiles, error: profErr, count } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: false });

        if (!profErr && (totalUsers === null)) {
          // Only set from profiles if server route didn't already set the count
          setTotalUsers((count as number) || (profiles ? profiles.length : 0));
        }

        // Fetch recent user sessions for location and activity
        const { data: sessions } = await supabase
          .from('user_sessions')
          .select('country, city, created_at')
          .order('created_at', { ascending: false })
          .limit(1000);

        // Aggregate locations
        const locAgg: Record<string, number> = {};
        const now = new Date();
        const days: Record<string, number> = {};
        for (let i = 0; i < 7; i++) {
          const d = new Date(now);
          d.setDate(now.getDate() - i);
          days[d.toISOString().slice(0,10)] = 0;
        }

        (sessions || []).forEach((s: any) => {
          const country = s.country || 'Unknown';
          locAgg[country] = (locAgg[country] || 0) + 1;

          const dateKey = s.created_at ? s.created_at.slice(0,10) : null;
          if (dateKey && days[dateKey] !== undefined) days[dateKey]++;
        });

        setLocationStats(locAgg);

        // Build weekly activity array ordered from 6 days ago -> today
        const weekly: number[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(now.getDate() - i);
          const key = d.toISOString().slice(0,10);
          weekly.push(days[key] || 0);
        }
        setWeeklyActivity(weekly);

        try {
          const res = await fetch('/api/admin/feature-stats');
          if (res.ok) {
            const json = await res.json();
            setFeatureStats(json);
          }
        } catch (e) {
          console.warn('Failed to load feature stats', e);
        }

        try {
          const res = await fetch('/api/admin/insights');
          if (res.ok) {
            const json = await res.json();
            setInsights(json);
          }
        } catch (e) {
          console.warn('Failed to load admin insights', e);
        }

        try {
          const res = await fetch('/api/admin/analytics');
          if (res.ok) {
            const json = await res.json();
            setAnalytics(json);
          }
        } catch (e) {
          console.warn('Failed to load admin analytics', e);
        }
      } catch (err) {
        console.error('Failed to load admin stats:', err);
      }
    };

    loadStats();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-600 rounded-md flex items-center justify-center">
                  <span className="text-white font-bold text-sm">JT</span>
                </div>
              </div>
              <div className="ml-3">
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  JobTrackfy Admin
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Administrative Dashboard
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Admin Panel
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Page Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              Dashboard
            </h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Manage and test JobTrackfy systems and integrations.
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="mb-6 flex flex-wrap gap-2">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'acquisition', label: 'Acquisition' },
              { id: 'activation', label: 'Activation' },
              { id: 'engagement', label: 'Engagement' },
              { id: 'retention', label: 'Retention' },
              { id: 'revenue', label: 'Revenue' },
              { id: 'blogs', label: 'Blogs' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                  activeTab === tab.id
                    ? 'bg-green-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Stats: total users, locations, weekly activity */}
            {activeTab === 'overview' && (
              <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">User Statistics</h3>
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 bg-gray-50 dark:bg-gray-700 rounded p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-300">Total Users</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalUsers ?? '—'}</div>
                </div>

                <div className="flex-1 bg-gray-50 dark:bg-gray-700 rounded p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-300">Top Locations</div>
                  <div className="mt-2 text-sm text-gray-900 dark:text-white space-y-1">
                    {Object.entries(locationStats)
                      .sort((a,b) => b[1] - a[1])
                      .slice(0,5)
                      .map(([loc, count]) => (
                        <div key={loc} className="flex justify-between">
                          <span>{loc}</span>
                          <span className="font-mono">{count}</span>
                        </div>
                      ))}
                    {Object.keys(locationStats).length === 0 && (
                      <div className="text-sm text-gray-500">No location data</div>
                    )}
                  </div>
                </div>

                <div className="flex-1 bg-gray-50 dark:bg-gray-700 rounded p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-300">User Activity (last 7 days)</div>
                  <div className="mt-3">
                    {/* Simple sparkline SVG */}
                    <div className="w-full h-16">
                      <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-16">
                        {(() => {
                          const data = weeklyActivity.length ? weeklyActivity : [0,0,0,0,0,0,0];
                          const max = Math.max(...data, 1);
                          const points = data.map((v, i) => {
                            const x = (i/(data.length-1)) * 100;
                            const y = 30 - (v / max) * 28; // padding
                            return `${x},${y}`;
                          }).join(' ');
                          const area = data.map((v, i) => {
                            const x = (i/(data.length-1)) * 100;
                            const y = 30 - (v / max) * 28;
                            return `${x},${y}`;
                          }).join(' ');
                          return (
                            <>
                              <polyline fill="none" stroke="#10B981" strokeWidth="2" points={points} />
                              <polyline fill="rgba(16,185,129,0.12)" stroke="none" points={area + ' 100,30 0,30'} />
                            </>
                          );
                        })()}
                      </svg>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">Counts shown left→right: 6 days ago → today</div>
                  </div>
                </div>
              </div>
            </div>
            )}

            {activeTab === 'overview' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                System Status
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">API Status</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    Operational
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Database</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    Connected
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Webhook Service</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    Active
                  </span>
                </div>
              </div>
            </div>
            )}

            {activeTab === 'overview' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Feature Usage
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700 rounded p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-300">Last 7 days</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Active users: {featureStats?.last7?.activeUsers ?? '—'}
                  </div>
                  <div className="mt-3 space-y-1 text-sm text-gray-900 dark:text-white">
                    {(featureStats?.last7?.top || []).map((item: any) => (
                      <div key={`7-${item.event}`} className="flex justify-between">
                        <span>{item.event}</span>
                        <span className="font-mono">{item.count}</span>
                      </div>
                    ))}
                    {(!featureStats?.last7?.top || featureStats.last7.top.length === 0) && (
                      <div className="text-sm text-gray-500">No events yet</div>
                    )}
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-300">Last 30 days</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Active users: {featureStats?.last30?.activeUsers ?? '—'}
                  </div>
                  <div className="mt-3 space-y-1 text-sm text-gray-900 dark:text-white">
                    {(featureStats?.last30?.top || []).map((item: any) => (
                      <div key={`30-${item.event}`} className="flex justify-between">
                        <span>{item.event}</span>
                        <span className="font-mono">{item.count}</span>
                      </div>
                    ))}
                    {(!featureStats?.last30?.top || featureStats.last30.top.length === 0) && (
                      <div className="text-sm text-gray-500">No events yet</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            )}

            {activeTab === 'overview' && (
              <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Funnel Overview
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {['last7', 'last30'].map((range) => (
                  <div key={range} className="bg-gray-50 dark:bg-gray-700 rounded p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {range === 'last7' ? 'Last 7 days' : 'Last 30 days'}
                    </div>
                    <div className="mt-3 space-y-2 text-sm text-gray-900 dark:text-white">
                      <div className="flex justify-between">
                        <span>Home Views</span>
                        <span className="font-mono">{insights?.funnel?.[range]?.homeViews ?? '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Unique Visitors</span>
                        <span className="font-mono">{insights?.funnel?.[range]?.uniqueVisitors ?? '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Dashboard Users</span>
                        <span className="font-mono">{insights?.funnel?.[range]?.dashboardUsers ?? '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Purchasers</span>
                        <span className="font-mono">{insights?.funnel?.[range]?.purchasers ?? '—'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            )}

            {activeTab === 'overview' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Revenue
              </h3>
              <div className="space-y-4 text-sm text-gray-900 dark:text-white">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">Last 30 days</div>
                  <div className="mt-2 space-y-1">
                    {insights?.revenue?.last30
                      ? Object.entries(insights.revenue.last30).map(([currency, amount]) => (
                          <div key={`rev30-${currency}`} className="flex justify-between">
                            <span>{currency}</span>
                            <span className="font-mono">{Number(amount).toFixed(2)}</span>
                          </div>
                        ))
                      : <div className="text-sm text-gray-500">—</div>}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">All time</div>
                  <div className="mt-2 space-y-1">
                    {insights?.revenue?.allTime
                      ? Object.entries(insights.revenue.allTime).map(([currency, amount]) => (
                          <div key={`revall-${currency}`} className="flex justify-between">
                            <span>{currency}</span>
                            <span className="font-mono">{Number(amount).toFixed(2)}</span>
                          </div>
                        ))
                      : <div className="text-sm text-gray-500">—</div>}
                  </div>
                </div>
              </div>
            </div>
            )}

            {activeTab === 'overview' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Recent Activity
              </h3>
              <div className="space-y-3">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <p>No recent webhook tests</p>
                  <p className="text-xs mt-1">Use the webhook tester above to test integrations</p>
                </div>
              </div>
            </div>
            )}

            {activeTab === 'acquisition' && (
              <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Acquisition (Last 30 Days)</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Home Views', value: analytics?.acquisition?.last30?.homeViews ?? '—' },
                    { label: 'Unique Visitors', value: analytics?.acquisition?.last30?.uniqueVisitors ?? '—' },
                    { label: 'Signups', value: analytics?.acquisition?.last30?.signups ?? '—' },
                    { label: 'Signup Conversion %', value: analytics?.acquisition?.last30?.signupConversion ?? '—' },
                  ].map((card) => (
                    <div key={card.label} className="bg-gray-50 dark:bg-gray-700 rounded p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-300">{card.label}</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-300">Top Referrers (Last 30 days)</div>
                    <div className="mt-3 space-y-1 text-sm text-gray-900 dark:text-white">
                      {(analytics?.acquisition?.last30?.topReferrers || []).map((item: any) => (
                        <div key={`ref30-${item.source}`} className="flex justify-between">
                          <span>{item.source}</span>
                          <span className="font-mono">{item.count}</span>
                        </div>
                      ))}
                      {(!analytics?.acquisition?.last30?.topReferrers || analytics.acquisition.last30.topReferrers.length === 0) && (
                        <div className="text-sm text-gray-500">No referrer data</div>
                      )}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-300">Last 7 Days Snapshot</div>
                    <div className="mt-3 space-y-2 text-sm text-gray-900 dark:text-white">
                      <div className="flex justify-between">
                        <span>Home Views</span>
                        <span className="font-mono">{analytics?.acquisition?.last7?.homeViews ?? '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Unique Visitors</span>
                        <span className="font-mono">{analytics?.acquisition?.last7?.uniqueVisitors ?? '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Signups</span>
                        <span className="font-mono">{analytics?.acquisition?.last7?.signups ?? '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Signup Conversion %</span>
                        <span className="font-mono">{analytics?.acquisition?.last7?.signupConversion ?? '—'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'activation' && (
              <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Activation (Last 30 Days Cohort)</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Activation within 24h %', value: analytics?.activation?.activationRate24h ?? '—' },
                    { label: 'Avg Time to First Value (hrs)', value: analytics?.activation?.avgTimeToFirstValueHours !== null ? Number(analytics.activation.avgTimeToFirstValueHours).toFixed(1) : '—' },
                    { label: 'Median Time to First Value (hrs)', value: analytics?.activation?.medianTimeToFirstValueHours !== null ? Number(analytics.activation.medianTimeToFirstValueHours).toFixed(1) : '—' },
                    { label: 'Activated Users / Cohort', value: analytics?.activation ? `${analytics.activation.activatedUsers}/${analytics.activation.cohortSize}` : '—' },
                  ].map((card) => (
                    <div key={card.label} className="bg-gray-50 dark:bg-gray-700 rounded p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-300">{card.label}</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                  Activation = first core action (AI/extension/dashboard view) after signup.
                </p>
              </div>
            )}

            {activeTab === 'engagement' && (
              <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Engagement</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[
                    { label: 'DAU', value: analytics?.engagement?.dau ?? '—' },
                    { label: 'WAU', value: analytics?.engagement?.wau ?? '—' },
                    { label: 'MAU', value: analytics?.engagement?.mau ?? '—' },
                    { label: 'Stickiness % (DAU/MAU)', value: analytics?.engagement?.stickiness ?? '—' },
                  ].map((card) => (
                    <div key={card.label} className="bg-gray-50 dark:bg-gray-700 rounded p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-300">{card.label}</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 bg-gray-50 dark:bg-gray-700 rounded p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-300">Top Features (Last 30 days)</div>
                  <div className="mt-3 space-y-1 text-sm text-gray-900 dark:text-white">
                    {(featureStats?.last30?.top || []).map((item: any) => (
                      <div key={`eng-${item.event}`} className="flex justify-between">
                        <span>{item.event}</span>
                        <span className="font-mono">{item.count}</span>
                      </div>
                    ))}
                    {(!featureStats?.last30?.top || featureStats.last30.top.length === 0) && (
                      <div className="text-sm text-gray-500">No events yet</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'retention' && (
              <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Retention</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: '7-day Retention %', value: analytics?.retention?.retention7 ?? '—' },
                    { label: '30-day Retention %', value: analytics?.retention?.retention30 ?? '—' },
                  ].map((card) => (
                    <div key={card.label} className="bg-gray-50 dark:bg-gray-700 rounded p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-300">{card.label}</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                  Retention = users who return after the 7/30 day mark with any feature event.
                </p>
              </div>
            )}

            {activeTab === 'revenue' && (
              <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Revenue</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { label: 'Active Subscribers', value: analytics?.revenue?.activeSubscribers ?? '—' },
                    { label: 'Conversion to Paid %', value: analytics?.revenue?.conversionToPaid ?? '—' },
                    { label: 'Total Users', value: totalUsers ?? '—' },
                  ].map((card) => (
                    <div key={card.label} className="bg-gray-50 dark:bg-gray-700 rounded p-4">
                      <div className="text-sm text-gray-600 dark:text-gray-300">{card.label}</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-300">Revenue (Last 30 days)</div>
                    <div className="mt-3 space-y-1 text-sm text-gray-900 dark:text-white">
                      {analytics?.revenue?.last30
                        ? Object.entries(analytics.revenue.last30).map(([currency, amount]) => (
                            <div key={`rev30-${currency}`} className="flex justify-between">
                              <span>{currency}</span>
                              <span className="font-mono">{Number(amount).toFixed(2)}</span>
                            </div>
                          ))
                        : <div className="text-sm text-gray-500">—</div>}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded p-4">
                    <div className="text-sm text-gray-600 dark:text-gray-300">Revenue (All time)</div>
                    <div className="mt-3 space-y-1 text-sm text-gray-900 dark:text-white">
                      {analytics?.revenue?.allTime
                        ? Object.entries(analytics.revenue.allTime).map(([currency, amount]) => (
                            <div key={`revall-${currency}`} className="flex justify-between">
                              <span>{currency}</span>
                              <span className="font-mono">{Number(amount).toFixed(2)}</span>
                            </div>
                          ))
                        : <div className="text-sm text-gray-500">—</div>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'blogs' && <BlogEditor />}
          </div>
        </div>
      </main>
    </div>
  );
}
