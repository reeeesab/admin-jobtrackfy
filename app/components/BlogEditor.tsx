'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { markdownToHtml, toSlug } from '@/lib/blogContent';

type BlogStatus = 'draft' | 'published';

type FaqItem = {
  question: string;
  answer: string;
};

type BlogCategory = {
  id: string;
  name: string;
  slug: string;
  description?: string;
};

type BlogPost = {
  id: string;
  category_id: string;
  category?: BlogCategory | null;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  content_markdown: string | null;
  content_html: string | null;
  cover_image_url: string | null;
  cover_image_alt: string;
  author_name: string;
  status: BlogStatus;
  published_at: string | null;
  meta_title: string;
  meta_description: string;
  canonical_url: string | null;
  og_image_url: string | null;
  og_image_alt: string;
  primary_keyword: string;
  secondary_keywords: string[];
  schema_faq: FaqItem[];
  reading_time_minutes: number;
  created_at: string;
  updated_at: string;
};

type BlogFormState = {
  categoryId: string;
  title: string;
  slug: string;
  excerpt: string;
  contentMarkdown: string;
  coverImageUrl: string;
  coverImageAlt: string;
  authorName: string;
  status: BlogStatus;
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  ogImageUrl: string;
  ogImageAlt: string;
  primaryKeyword: string;
  secondaryKeywordsText: string;
  schemaFaq: FaqItem[];
};

const INITIAL_FORM: BlogFormState = {
  categoryId: '',
  title: '',
  slug: '',
  excerpt: '',
  contentMarkdown: '',
  coverImageUrl: '',
  coverImageAlt: '',
  authorName: 'JobTrackfy Team',
  status: 'draft',
  metaTitle: '',
  metaDescription: '',
  canonicalUrl: '',
  ogImageUrl: '',
  ogImageAlt: '',
  primaryKeyword: '',
  secondaryKeywordsText: '',
  schemaFaq: [],
};

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function getMetaTitleDraft(form: BlogFormState) {
  return (form.metaTitle || form.title).trim();
}

function getMetaDescriptionDraft(form: BlogFormState) {
  return (form.metaDescription || form.excerpt || form.contentMarkdown.slice(0, 160)).trim();
}

export default function BlogEditor() {
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [form, setForm] = useState<BlogFormState>(INITIAL_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [previewMode, setPreviewMode] = useState<'write' | 'preview'>('write');
  const contentRef = useRef<HTMLTextAreaElement | null>(null);

  const filteredBlogs = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return blogs;
    return blogs.filter((blog) => {
      return blog.title.toLowerCase().includes(query) || blog.slug.toLowerCase().includes(query);
    });
  }, [blogs, search]);

  const metaTitleDraft = getMetaTitleDraft(form);
  const metaDescriptionDraft = getMetaDescriptionDraft(form);
  const seoTitleOk = metaTitleDraft.length > 0 && metaTitleDraft.length <= 60;
  const seoDescriptionOk = metaDescriptionDraft.length >= 120 && metaDescriptionDraft.length <= 160;

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

  const loadCategories = async () => {
    try {
      const res = await fetch('/api/admin/blog-categories', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load categories');
      setCategories(json.categories || []);
      if ((json.categories || []).length > 0) {
        setForm((prev) => prev.categoryId ? prev : { ...prev, categoryId: json.categories[0].id });
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load categories');
    }
  };

  useEffect(() => {
    void loadCategories();
    void loadBlogs();
  }, []);

  const resetForm = () => {
    setForm({
      ...INITIAL_FORM,
      categoryId: categories[0]?.id || '',
    });
    setEditingId(null);
    setError(null);
    setPreviewMode('write');
  };

  const insertAtCursor = (prefix: string, suffix = '', placeholder = 'text') => {
    const textarea = contentRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = form.contentMarkdown;
    const selected = value.slice(start, end) || placeholder;
    const nextValue = `${value.slice(0, start)}${prefix}${selected}${suffix}${value.slice(end)}`;

    setForm((prev) => ({ ...prev, contentMarkdown: nextValue }));

    requestAnimationFrame(() => {
      textarea.focus();
      const newStart = start + prefix.length;
      const newEnd = newStart + selected.length;
      textarea.setSelectionRange(newStart, newEnd);
    });
  };

  const addImageMarkdown = () => {
    const imageUrl = window.prompt('Image URL (https://...)');
    if (!imageUrl) return;
    const alt = window.prompt('Image alt text for SEO and accessibility') || 'Blog image';
    insertAtCursor(`\n![${alt}](${imageUrl})\n`, '', '');
  };

  const handleEdit = (blog: BlogPost) => {
    setEditingId(blog.id);
    setForm({
      categoryId: blog.category_id || '',
      title: blog.title,
      slug: blog.slug,
      excerpt: blog.excerpt || '',
      contentMarkdown: blog.content_markdown || blog.content || '',
      coverImageUrl: blog.cover_image_url || '',
      coverImageAlt: blog.cover_image_alt || '',
      authorName: blog.author_name || 'JobTrackfy Team',
      status: blog.status,
      metaTitle: blog.meta_title || '',
      metaDescription: blog.meta_description || '',
      canonicalUrl: blog.canonical_url || '',
      ogImageUrl: blog.og_image_url || '',
      ogImageAlt: blog.og_image_alt || '',
      primaryKeyword: blog.primary_keyword || '',
      secondaryKeywordsText: (blog.secondary_keywords || []).join(', '),
      schemaFaq: Array.isArray(blog.schema_faq) ? blog.schema_faq : [],
    });
    setError(null);
    setPreviewMode('write');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = {
        categoryId: form.categoryId,
        title: form.title,
        slug: form.slug,
        excerpt: form.excerpt,
        content: form.contentMarkdown,
        contentMarkdown: form.contentMarkdown,
        coverImageUrl: form.coverImageUrl,
        coverImageAlt: form.coverImageAlt,
        authorName: form.authorName,
        status: form.status,
        metaTitle: form.metaTitle,
        metaDescription: form.metaDescription,
        canonicalUrl: form.canonicalUrl,
        ogImageUrl: form.ogImageUrl,
        ogImageAlt: form.ogImageAlt,
        primaryKeyword: form.primaryKeyword,
        secondaryKeywords: form.secondaryKeywordsText,
        schemaFaq: form.schemaFaq,
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

  const handleCreateCategory = async () => {
    const name = window.prompt('Category name');
    if (!name) return;
    setError(null);

    try {
      const res = await fetch('/api/admin/blog-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to create category');
      await loadCategories();
      if (json?.category?.id) {
        setForm((prev) => ({ ...prev, categoryId: json.category.id }));
      }
    } catch (categoryError) {
      setError(categoryError instanceof Error ? categoryError.message : 'Failed to create category');
    }
  };

  const updateFaqItem = (index: number, field: keyof FaqItem, value: string) => {
    setForm((prev) => {
      const next = [...prev.schemaFaq];
      const current = next[index] || { question: '', answer: '' };
      next[index] = { ...current, [field]: value };
      return { ...prev, schemaFaq: next };
    });
  };

  const removeFaqItem = (index: number) => {
    setForm((prev) => ({ ...prev, schemaFaq: prev.schemaFaq.filter((_, idx) => idx !== index) }));
  };

  return (
    <div className="lg:col-span-2 space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Blog Editor</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Rich formatting, image support, and SEO metadata for marketing-ready posts.
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

        <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
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
              <div className="mt-1 flex gap-2">
                <input
                  type="text"
                  value={form.slug}
                  onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                  placeholder="auto-generated-from-title-if-empty"
                />
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, slug: toSlug(prev.title) }))}
                  className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-xs"
                >
                  Auto
                </button>
              </div>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm text-gray-700 dark:text-gray-300">Category</span>
              <div className="mt-1 flex gap-2">
                <select
                  required
                  value={form.categoryId}
                  onChange={(event) => setForm((prev) => ({ ...prev, categoryId: event.target.value }))}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                >
                  <option value="" disabled>Select category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleCreateCategory}
                  className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-xs"
                >
                  New
                </button>
              </div>
            </label>

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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <span className="text-sm text-gray-700 dark:text-gray-300">Cover Image Alt</span>
              <input
                type="text"
                value={form.coverImageAlt}
                onChange={(event) => setForm((prev) => ({ ...prev, coverImageAlt: event.target.value }))}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                placeholder="Descriptive alt text"
              />
            </label>
          </div>

          {form.coverImageUrl && (
            <div className="rounded-md border border-gray-200 dark:border-gray-700 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={form.coverImageUrl} alt={form.coverImageAlt || 'Cover preview'} className="max-h-44 rounded-md" />
            </div>
          )}

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

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Content Editor (Markdown)</span>
              <div className="inline-flex rounded-md border border-gray-300 dark:border-gray-600 overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => setPreviewMode('write')}
                  className={`px-3 py-1.5 ${previewMode === 'write' ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
                >
                  Write
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('preview')}
                  className={`px-3 py-1.5 ${previewMode === 'preview' ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
                >
                  Preview
                </button>
              </div>
            </div>

            {previewMode === 'write' && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 text-xs">
                  <button type="button" onClick={() => insertAtCursor('## ', '', 'Section title')} className="px-2.5 py-1.5 border rounded">H2</button>
                  <button type="button" onClick={() => insertAtCursor('### ', '', 'Subsection title')} className="px-2.5 py-1.5 border rounded">H3</button>
                  <button type="button" onClick={() => insertAtCursor('**', '**', 'bold text')} className="px-2.5 py-1.5 border rounded">Bold</button>
                  <button type="button" onClick={() => insertAtCursor('*', '*', 'italic text')} className="px-2.5 py-1.5 border rounded">Italic</button>
                  <button type="button" onClick={() => insertAtCursor('[', '](https://)', 'link text')} className="px-2.5 py-1.5 border rounded">Link</button>
                  <button type="button" onClick={() => insertAtCursor('\n- ', '', 'List item')} className="px-2.5 py-1.5 border rounded">List</button>
                  <button type="button" onClick={() => insertAtCursor('\n1. ', '', 'Step')} className="px-2.5 py-1.5 border rounded">Numbered</button>
                  <button type="button" onClick={() => insertAtCursor('\n```\n', '\n```', 'code block')} className="px-2.5 py-1.5 border rounded">Code</button>
                  <button type="button" onClick={addImageMarkdown} className="px-2.5 py-1.5 border rounded">Image</button>
                </div>
                <textarea
                  ref={contentRef}
                  required
                  value={form.contentMarkdown}
                  onChange={(event) => setForm((prev) => ({ ...prev, contentMarkdown: event.target.value }))}
                  rows={18}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                  placeholder="# Title\n\nStart writing..."
                />
              </div>
            )}

            {previewMode === 'preview' && (
              <div
                className="prose prose-sm max-w-none rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 text-gray-900 dark:text-gray-100"
                dangerouslySetInnerHTML={{ __html: markdownToHtml(form.contentMarkdown) }}
              />
            )}
          </section>

          <section className="rounded-md border border-gray-200 dark:border-gray-700 p-4 space-y-4">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">SEO Settings</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm text-gray-700 dark:text-gray-300">Meta Title ({metaTitleDraft.length}/60)</span>
                <input
                  type="text"
                  value={form.metaTitle}
                  onChange={(event) => setForm((prev) => ({ ...prev, metaTitle: event.target.value }))}
                  className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                  placeholder="Primary keyword in beginning"
                />
              </label>
              <label className="block">
                <span className="text-sm text-gray-700 dark:text-gray-300">Meta Description ({metaDescriptionDraft.length}/160)</span>
                <textarea
                  rows={3}
                  value={form.metaDescription}
                  onChange={(event) => setForm((prev) => ({ ...prev, metaDescription: event.target.value }))}
                  className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                  placeholder="Compelling 120-160 char summary"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm text-gray-700 dark:text-gray-300">Primary Keyword</span>
                <input
                  type="text"
                  value={form.primaryKeyword}
                  onChange={(event) => setForm((prev) => ({ ...prev, primaryKeyword: event.target.value }))}
                  className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                  placeholder="how to track job applications effectively"
                />
              </label>
              <label className="block">
                <span className="text-sm text-gray-700 dark:text-gray-300">Secondary Keywords (comma separated)</span>
                <input
                  type="text"
                  value={form.secondaryKeywordsText}
                  onChange={(event) => setForm((prev) => ({ ...prev, secondaryKeywordsText: event.target.value }))}
                  className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                  placeholder="keyword one, keyword two"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm text-gray-700 dark:text-gray-300">Canonical URL</span>
                <input
                  type="url"
                  value={form.canonicalUrl}
                  onChange={(event) => setForm((prev) => ({ ...prev, canonicalUrl: event.target.value }))}
                  className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                  placeholder="https://jobtrackfy.com/blog/your-slug"
                />
              </label>
              <label className="block">
                <span className="text-sm text-gray-700 dark:text-gray-300">OG Image URL</span>
                <input
                  type="url"
                  value={form.ogImageUrl}
                  onChange={(event) => setForm((prev) => ({ ...prev, ogImageUrl: event.target.value }))}
                  className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                  placeholder="https://..."
                />
              </label>
            </div>

            <label className="block">
              <span className="text-sm text-gray-700 dark:text-gray-300">OG Image Alt</span>
              <input
                type="text"
                value={form.ogImageAlt}
                onChange={(event) => setForm((prev) => ({ ...prev, ogImageAlt: event.target.value }))}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                placeholder="Open graph image alt text"
              />
            </label>

            <div className="text-xs text-gray-600 dark:text-gray-400">
              <p>SEO checks: Title {seoTitleOk ? 'OK' : 'needs 1-60 chars'} · Description {seoDescriptionOk ? 'OK' : 'target 120-160 chars'}</p>
            </div>
          </section>

          <section className="rounded-md border border-gray-200 dark:border-gray-700 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">FAQ Schema Items</h4>
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, schemaFaq: [...prev.schemaFaq, { question: '', answer: '' }] }))}
                className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-xs"
              >
                Add FAQ
              </button>
            </div>

            {form.schemaFaq.length === 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400">Add 4-6 FAQs for rich results and featured snippet opportunities.</p>
            )}

            <div className="space-y-3">
              {form.schemaFaq.map((item, index) => (
                <div key={`faq-${index}`} className="rounded-md border border-gray-200 dark:border-gray-700 p-3 space-y-2">
                  <input
                    type="text"
                    value={item.question}
                    onChange={(event) => updateFaqItem(index, 'question', event.target.value)}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                    placeholder="FAQ question"
                  />
                  <textarea
                    rows={3}
                    value={item.answer}
                    onChange={(event) => updateFaqItem(index, 'answer', event.target.value)}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                    placeholder="FAQ answer"
                  />
                  <button
                    type="button"
                    onClick={() => removeFaqItem(index)}
                    className="text-xs text-red-600 dark:text-red-400"
                  >
                    Remove FAQ
                  </button>
                </div>
              ))}
            </div>
          </section>

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
                  <th className="py-2 pr-4">Category</th>
                  <th className="py-2 pr-4">Slug</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Read</th>
                  <th className="py-2 pr-4">Updated At</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBlogs.map((blog) => (
                  <tr key={blog.id} className="border-b border-gray-100 dark:border-gray-700/60 text-gray-800 dark:text-gray-100">
                    <td className="py-3 pr-4">{blog.title}</td>
                    <td className="py-3 pr-4">{blog.category?.name || '—'}</td>
                    <td className="py-3 pr-4 font-mono text-xs">{blog.slug}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          blog.status === 'published'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                        }`}
                      >
                        {blog.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4">{blog.reading_time_minutes || 1} min</td>
                    <td className="py-3 pr-4">{formatDate(blog.updated_at)}</td>
                    <td className="py-3 space-x-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(blog)}
                        className="px-2.5 py-1.5 rounded-md border border-blue-300 text-blue-700 dark:border-blue-600 dark:text-blue-300"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(blog.id)}
                        className="px-2.5 py-1.5 rounded-md border border-red-300 text-red-700 dark:border-red-700 dark:text-red-300"
                      >
                        Delete
                      </button>
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
