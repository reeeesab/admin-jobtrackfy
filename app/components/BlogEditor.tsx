'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

type BlogStatus = 'draft' | 'published';

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image_url: string | null;
  author_name: string;
  status: BlogStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

type BlogFormState = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImageUrl: string;
  authorName: string;
  status: BlogStatus;
};

const INITIAL_FORM: BlogFormState = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  coverImageUrl: '',
  authorName: 'JobTrackfy Team',
  status: 'draft',
};

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

export default function BlogEditor() {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [form, setForm] = useState<BlogFormState>(INITIAL_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filteredBlogs = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return blogs;
    return blogs.filter((blog) => {
      return blog.title.toLowerCase().includes(query) || blog.slug.toLowerCase().includes(query);
    });
  }, [blogs, search]);

  const loadBlogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/blogs', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load blogs');
      setBlogs(json.blogs || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load blogs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBlogs();
  }, []);

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setEditingId(null);
    setError(null);
  };

  const handleEdit = (blog: BlogPost) => {
    setEditingId(blog.id);
    setForm({
      title: blog.title,
      slug: blog.slug,
      excerpt: blog.excerpt || '',
      content: blog.content || '',
      coverImageUrl: blog.cover_image_url || '',
      authorName: blog.author_name || 'JobTrackfy Team',
      status: blog.status,
    });
    setError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = {
        title: form.title,
        slug: form.slug,
        excerpt: form.excerpt,
        content: form.content,
        coverImageUrl: form.coverImageUrl,
        authorName: form.authorName,
        status: form.status,
      };

      const isEdit = Boolean(editingId);
      const endpoint = isEdit ? `/api/admin/blogs/${editingId}` : '/api/admin/blogs';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to save blog post');

      await loadBlogs();
      if (!isEdit) {
        resetForm();
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save blog post');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm('Delete this blog post? This action cannot be undone.');
    if (!confirmed) return;

    setError(null);
    try {
      const res = await fetch(`/api/admin/blogs/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to delete blog post');
      await loadBlogs();
      if (editingId === id) resetForm();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete blog post');
    }
  };

  return (
    <div className="lg:col-span-2 space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Blog Editor</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Create, edit, publish, and delete blog posts.
            </p>
          </div>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 rounded-md text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"
            >
              New Post
            </button>
          )}
        </div>

        {error && (
          <div className="mt-4 rounded-md border border-red-300 bg-red-50 dark:bg-red-950/20 dark:border-red-700 p-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm text-gray-700 dark:text-gray-300">Title</span>
              <input
                required
                type="text"
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                placeholder="How to Stay Organized in Job Search"
              />
            </label>

            <label className="block">
              <span className="text-sm text-gray-700 dark:text-gray-300">Slug</span>
              <input
                type="text"
                value={form.slug}
                onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                placeholder="auto-generated-from-title-if-empty"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm text-gray-700 dark:text-gray-300">Author Name</span>
              <input
                type="text"
                value={form.authorName}
                onChange={(event) => setForm((prev) => ({ ...prev, authorName: event.target.value }))}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                placeholder="JobTrackfy Team"
              />
            </label>

            <label className="block">
              <span className="text-sm text-gray-700 dark:text-gray-300">Status</span>
              <select
                value={form.status}
                onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as BlogStatus }))}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-sm text-gray-700 dark:text-gray-300">Cover Image URL</span>
            <input
              type="url"
              value={form.coverImageUrl}
              onChange={(event) => setForm((prev) => ({ ...prev, coverImageUrl: event.target.value }))}
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
              placeholder="https://..."
            />
          </label>

          <label className="block">
            <span className="text-sm text-gray-700 dark:text-gray-300">Excerpt</span>
            <textarea
              value={form.excerpt}
              onChange={(event) => setForm((prev) => ({ ...prev, excerpt: event.target.value }))}
              rows={3}
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
              placeholder="Short summary for listing pages and SEO."
            />
          </label>

          <label className="block">
            <span className="text-sm text-gray-700 dark:text-gray-300">Content (Markdown supported)</span>
            <textarea
              required
              value={form.content}
              onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
              rows={14}
              className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
              placeholder="Write your blog post content..."
            />
          </label>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-md text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
            >
              {saving ? 'Saving...' : editingId ? 'Update Post' : 'Create Post'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 rounded-md text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Published & Draft Posts</h3>
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by title or slug..."
            className="w-full md:w-72 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
          />
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Loading blog posts...</p>
        ) : filteredBlogs.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">No blog posts found.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <th className="py-2 pr-4">Title</th>
                  <th className="py-2 pr-4">Slug</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Published At</th>
                  <th className="py-2 pr-4">Updated At</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBlogs.map((blog) => (
                  <tr key={blog.id} className="border-b border-gray-100 dark:border-gray-700/60 text-gray-800 dark:text-gray-100">
                    <td className="py-3 pr-4">{blog.title}</td>
                    <td className="py-3 pr-4 font-mono text-xs">{blog.slug}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          blog.status === 'published'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200'
                        }`}
                      >
                        {blog.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4">{formatDate(blog.published_at)}</td>
                    <td className="py-3 pr-4">{formatDate(blog.updated_at)}</td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(blog)}
                          className="px-2.5 py-1 rounded border border-gray-300 dark:border-gray-600 text-xs"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(blog.id)}
                          className="px-2.5 py-1 rounded border border-red-300 text-red-700 dark:text-red-300 text-xs"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
