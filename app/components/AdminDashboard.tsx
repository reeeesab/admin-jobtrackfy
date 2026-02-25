"use client";

import { useEffect, useState } from 'react';
import BlogEditor from './BlogEditor';

type AdminTab = 'overview' | 'blogs';
type GaOverviewMetrics = {
  activeUsers: number;
  newUsers: number;
  sessions: number;
  screenPageViews: number;
};

type GaData = {
  last7: GaOverviewMetrics;
  last30: GaOverviewMetrics;
  topPages: Array<{ pagePath: string; views: number }>;
};

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [gaData, setGaData] = useState<GaData | null>(null);
  const [gaLoading, setGaLoading] = useState(false);
  const [gaError, setGaError] = useState<string | null>(null);
  const isGaServiceDisabled = gaError?.includes('SERVICE_DISABLED') || gaError?.includes('has not been used');
  const isGaPermissionError = gaError?.includes('PERMISSION_DENIED');
  const isGaEnvError = gaError?.includes('GA4 env missing');

  useEffect(() => {
    const loadGa = async () => {
      try {
        setGaLoading(true);
        setGaError(null);
        const res = await fetch('/api/admin/google-analytics', { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(typeof json?.error === 'string' ? json.error : 'Failed to load analytics');
        }
        setGaData(json as GaData);
      } catch (error) {
        setGaError(error instanceof Error ? error.message : 'Failed to load analytics');
      } finally {
        setGaLoading(false);
      }
    };

    if (activeTab === 'overview') {
      loadGa();
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
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
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">JobTrackfy Admin</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Administrative Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500 dark:text-gray-400">Admin Panel</span>
              <a
                href="/logout"
                className="text-sm font-medium text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
              >
                Logout
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Manage admin operations and blog content.</p>
          </div>

          <div className="mb-6 flex flex-wrap gap-2">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'blogs', label: 'Blogs' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AdminTab)}
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {activeTab === 'overview' && (
              <>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">System Status</h3>
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

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Google Analytics (GA4)</h3>
                  {gaLoading && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">Loading analytics...</p>
                  )}
                  {gaError && (
                    <div className="text-sm text-red-600 dark:text-red-400 space-y-1">
                      <p>{gaError}</p>
                      {isGaServiceDisabled && (
                        <p className="text-xs">
                          Enable the Google Analytics Data API in project `1078740431310`, then wait a few minutes and retry.
                        </p>
                      )}
                      {isGaPermissionError && !isGaServiceDisabled && (
                        <p className="text-xs">
                          Ensure the service account has GA4 property access (Viewer/Analyst) and the property ID is correct.
                        </p>
                      )}
                      {isGaEnvError && (
                        <p className="text-xs">Set `GA4_PROPERTY_ID`, `GA4_CLIENT_EMAIL`, and `GA4_PRIVATE_KEY` in env.</p>
                      )}
                    </div>
                  )}
                  {!gaLoading && !gaError && gaData && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {[
                          { label: '7d Active Users', value: gaData.last7.activeUsers },
                          { label: '7d Sessions', value: gaData.last7.sessions },
                          { label: '30d Active Users', value: gaData.last30.activeUsers },
                          { label: '30d Page Views', value: gaData.last30.screenPageViews },
                        ].map((item) => (
                          <div key={item.label} className="bg-gray-50 dark:bg-gray-700 rounded p-3">
                            <div className="text-gray-600 dark:text-gray-300">{item.label}</div>
                            <div className="text-xl font-bold text-gray-900 dark:text-white">{item.value}</div>
                          </div>
                        ))}
                      </div>

                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">Top pages (30 days)</div>
                        <div className="space-y-1 text-sm text-gray-900 dark:text-white">
                          {gaData.topPages.map((page) => (
                            <div key={page.pagePath} className="flex justify-between">
                              <span className="truncate pr-4">{page.pagePath}</span>
                              <span className="font-mono">{page.views}</span>
                            </div>
                          ))}
                          {gaData.topPages.length === 0 && (
                            <div className="text-gray-500">No page data</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {activeTab === 'blogs' && <BlogEditor />}
          </div>
        </div>
      </main>
    </div>
  );
}
