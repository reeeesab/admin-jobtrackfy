'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

type JobStatus = 'draft' | 'published' | 'archived';

type AdminJob = {
  id: string;
  company: string;
  position: string;
  location: string | null;
  job_url: string;
  description: string | null;
  employment_type: string | null;
  job_type: string | null;
  salary_range: string | null;
  status: JobStatus;
  posted_at: string;
  created_at: string;
  updated_at: string;
};

type JobFormState = {
  company: string;
  position: string;
  location: string;
  jobUrl: string;
  description: string;
  employmentType: string;
  jobType: string;
  salaryRange: string;
  status: JobStatus;
};

const INITIAL_FORM: JobFormState = {
  company: '',
  position: '',
  location: '',
  jobUrl: '',
  description: '',
  employmentType: '',
  jobType: '',
  salaryRange: '',
  status: 'published',
};

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function sanitizeErrorMessage(raw: string) {
  const withoutTags = raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return withoutTags || 'Request failed. Please try again.';
}

export default function AdminJobs() {
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [form, setForm] = useState<JobFormState>(INITIAL_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'all'>('all');

  const filteredJobs = useMemo(() => {
    const query = search.toLowerCase().trim();
    return jobs.filter((job) => {
      if (statusFilter !== 'all' && job.status !== statusFilter) return false;
      if (!query) return true;
      return (
        job.company.toLowerCase().includes(query) ||
        job.position.toLowerCase().includes(query) ||
        (job.location || '').toLowerCase().includes(query)
      );
    });
  }, [jobs, search, statusFilter]);

  const loadJobs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/jobs', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(sanitizeErrorMessage(json?.error || 'Failed to load jobs'));
      setJobs(json.jobs || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? sanitizeErrorMessage(loadError.message) : 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadJobs();
  }, []);

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setEditingId(null);
    setError(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        company: form.company,
        position: form.position,
        location: form.location,
        jobUrl: form.jobUrl,
        description: form.description,
        employmentType: form.employmentType,
        jobType: form.jobType,
        salaryRange: form.salaryRange,
        status: form.status,
      };

      const res = await fetch(editingId ? `/api/admin/jobs/${editingId}` : '/api/admin/jobs', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(sanitizeErrorMessage(json?.error || 'Failed to save job'));

      const nextJob = json.job as AdminJob;
      setJobs((prev) => {
        if (editingId) {
          return prev.map((job) => (job.id === nextJob.id ? nextJob : job));
        }
        return [nextJob, ...prev];
      });
      resetForm();
    } catch (saveError) {
      setError(saveError instanceof Error ? sanitizeErrorMessage(saveError.message) : 'Failed to save job');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (job: AdminJob) => {
    setEditingId(job.id);
    setForm({
      company: job.company,
      position: job.position,
      location: job.location || '',
      jobUrl: job.job_url,
      description: job.description || '',
      employmentType: job.employment_type || '',
      jobType: job.job_type || '',
      salaryRange: job.salary_range || '',
      status: job.status,
    });
    setError(null);
  };

  const handleDelete = async (jobId: string) => {
    if (!confirm('Delete this job posting?')) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(sanitizeErrorMessage(json?.error || 'Failed to delete job'));
      setJobs((prev) => prev.filter((job) => job.id !== jobId));
      if (editingId === jobId) resetForm();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? sanitizeErrorMessage(deleteError.message) : 'Failed to delete job');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">Job Board</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Create admin-curated job postings that appear in the dashboard job board.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              {editingId ? 'Edit Job' : 'New Job'}
            </h4>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Reset
              </button>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Company</label>
              <input
                value={form.company}
                onChange={(event) => setForm((prev) => ({ ...prev, company: event.target.value }))}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                placeholder="Company name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
              <input
                value={form.position}
                onChange={(event) => setForm((prev) => ({ ...prev, position: event.target.value }))}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                placeholder="e.g. Product Designer"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Location</label>
              <input
                value={form.location}
                onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                placeholder="Remote, Hybrid, or City"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Job URL</label>
              <input
                value={form.jobUrl}
                onChange={(event) => setForm((prev) => ({ ...prev, jobUrl: event.target.value }))}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                placeholder="https://company.com/jobs/role"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
              <textarea
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                className="mt-1 min-h-[120px] w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                placeholder="Short summary to show on the job board"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Employment Type</label>
                <input
                  value={form.employmentType}
                  onChange={(event) => setForm((prev) => ({ ...prev, employmentType: event.target.value }))}
                  className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  placeholder="Full-time"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Job Type</label>
                <input
                  value={form.jobType}
                  onChange={(event) => setForm((prev) => ({ ...prev, jobType: event.target.value }))}
                  className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  placeholder="Remote / Hybrid"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Salary Range</label>
                <input
                  value={form.salaryRange}
                  onChange={(event) => setForm((prev) => ({ ...prev, salaryRange: event.target.value }))}
                  className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  placeholder="$90k - $120k"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                <select
                  value={form.status}
                  onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as JobStatus }))}
                  className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                >
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-md bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2.5 transition disabled:opacity-60"
          >
            {saving ? 'Saving...' : editingId ? 'Update Job' : 'Publish Job'}
          </button>
        </form>

        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-md p-5 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">All Jobs</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {loading ? 'Loading jobs...' : `${filteredJobs.length} job${filteredJobs.length === 1 ? '' : 's'} shown`}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full sm:w-56 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                placeholder="Search roles or company"
              />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as JobStatus | 'all')}
                className="w-full sm:w-40 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
              >
                <option value="all">All status</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          {loading && (
            <div className="text-sm text-gray-500 dark:text-gray-400">Loading jobs...</div>
          )}

          {!loading && filteredJobs.length === 0 && (
            <div className="text-sm text-gray-500 dark:text-gray-400">No jobs found yet.</div>
          )}

          <div className="space-y-3">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 flex flex-col gap-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                      {job.position} · {job.company}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {job.location || 'Location not specified'} · {job.status.toUpperCase()}
                    </div>
                    <div className="text-[11px] text-gray-400 dark:text-gray-500">
                      Posted {formatDate(job.posted_at)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(job)}
                      className="px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-600 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(job.id)}
                      className="px-3 py-1.5 rounded-md border border-red-200 text-xs text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/20"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                {job.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{job.description}</p>
                )}
                {job.job_url && (
                  <a
                    href={job.job_url}
                    className="text-xs text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {job.job_url}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
