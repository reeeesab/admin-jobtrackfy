import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin';
import {
  BlogUpsertData,
  estimateReadingTimeMinutes,
  markdownToHtml,
  normalizeFaq,
  normalizeKeywords,
  toSlug,
} from '@/lib/blogContent';

type BlogUpdatePayload = {
  categoryId?: unknown;
  title?: unknown;
  slug?: unknown;
  excerpt?: unknown;
  content?: unknown;
  contentMarkdown?: unknown;
  coverImageUrl?: unknown;
  coverImageAlt?: unknown;
  authorName?: unknown;
  status?: unknown;
  metaTitle?: unknown;
  metaDescription?: unknown;
  canonicalUrl?: unknown;
  ogImageUrl?: unknown;
  ogImageAlt?: unknown;
  primaryKeyword?: unknown;
  secondaryKeywords?: unknown;
  schemaFaq?: unknown;
};

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from('blog_posts')
      .select('id, category_id, category:blog_categories(id, name, slug), title, slug, excerpt, content, content_markdown, content_html, cover_image_url, cover_image_alt, author_name, status, published_at, meta_title, meta_description, canonical_url, og_image_url, og_image_alt, primary_keyword, secondary_keywords, schema_faq, reading_time_minutes, created_at, updated_at')
      .eq('id', id)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Blog post not found' }, { status: 404 });

    return NextResponse.json({ blog: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const payload = (await request.json()) as BlogUpdatePayload;

    const title = typeof payload.title === 'string' ? payload.title.trim() : '';
    const categoryId = typeof payload.categoryId === 'string' ? payload.categoryId.trim() : '';
    const inputSlug = typeof payload.slug === 'string' ? payload.slug.trim() : '';
    const excerpt = typeof payload.excerpt === 'string' ? payload.excerpt.trim() : '';
    const contentMarkdownRaw =
      typeof payload.contentMarkdown === 'string'
        ? payload.contentMarkdown
        : typeof payload.content === 'string'
          ? payload.content
          : '';
    const contentMarkdown = contentMarkdownRaw.trim();
    const coverImageUrl = typeof payload.coverImageUrl === 'string' ? payload.coverImageUrl.trim() : '';
    const coverImageAlt = typeof payload.coverImageAlt === 'string' ? payload.coverImageAlt.trim() : '';
    const authorName = typeof payload.authorName === 'string' ? payload.authorName.trim() : '';
    const metaTitle = typeof payload.metaTitle === 'string' ? payload.metaTitle.trim() : '';
    const metaDescription = typeof payload.metaDescription === 'string' ? payload.metaDescription.trim() : '';
    const canonicalUrl = typeof payload.canonicalUrl === 'string' ? payload.canonicalUrl.trim() : '';
    const ogImageUrl = typeof payload.ogImageUrl === 'string' ? payload.ogImageUrl.trim() : '';
    const ogImageAlt = typeof payload.ogImageAlt === 'string' ? payload.ogImageAlt.trim() : '';
    const primaryKeyword = typeof payload.primaryKeyword === 'string' ? payload.primaryKeyword.trim() : '';
    const secondaryKeywords = normalizeKeywords(
      typeof payload.secondaryKeywords === 'string' || Array.isArray(payload.secondaryKeywords)
        ? payload.secondaryKeywords as string | string[]
        : undefined
    );
    const schemaFaq = normalizeFaq(payload.schemaFaq);

    if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    if (!categoryId) return NextResponse.json({ error: 'Category is required' }, { status: 400 });
    if (!contentMarkdown) return NextResponse.json({ error: 'Content is required' }, { status: 400 });

    const slug = toSlug(inputSlug || title);
    if (!slug) return NextResponse.json({ error: 'Slug is invalid' }, { status: 400 });

    const status = payload.status === 'published' ? 'published' : 'draft';
    const supabase = createSupabaseAdminClient();

    const slugExists = await supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', slug)
      .neq('id', id)
      .limit(1)
      .maybeSingle();

    if (slugExists.error) {
      return NextResponse.json({ error: slugExists.error.message }, { status: 500 });
    }

    if (slugExists.data) {
      return NextResponse.json({ error: 'Slug already exists. Use a different slug.' }, { status: 409 });
    }

    const existing = await supabase
      .from('blog_posts')
      .select('published_at')
      .eq('id', id)
      .maybeSingle();

    if (existing.error) {
      return NextResponse.json({ error: existing.error.message }, { status: 500 });
    }
    if (!existing.data) {
      return NextResponse.json({ error: 'Blog post not found' }, { status: 404 });
    }

    const nextPublishedAt =
      status === 'published'
        ? existing.data.published_at || new Date().toISOString()
        : null;

    const contentHtml = markdownToHtml(contentMarkdown);
    const readingTime = estimateReadingTimeMinutes(contentMarkdown);
    const computedMetaTitle = (metaTitle || title).slice(0, 60);
    const computedMetaDescription = (metaDescription || excerpt || contentMarkdown.slice(0, 160)).slice(0, 160);

    const updatePayload: BlogUpsertData & { updated_at: string } = {
      category_id: categoryId,
      title,
      slug,
      excerpt,
      content: contentMarkdown,
      content_markdown: contentMarkdown,
      content_html: contentHtml,
      cover_image_url: coverImageUrl || null,
      cover_image_alt: coverImageAlt,
      author_name: authorName || 'JobTrackfy Team',
      status,
      published_at: nextPublishedAt,
      meta_title: computedMetaTitle,
      meta_description: computedMetaDescription,
      canonical_url: canonicalUrl || null,
      og_image_url: ogImageUrl || coverImageUrl || null,
      og_image_alt: ogImageAlt || coverImageAlt,
      primary_keyword: primaryKeyword,
      secondary_keywords: secondaryKeywords,
      schema_faq: schemaFaq,
      reading_time_minutes: readingTime,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('blog_posts')
      .update(updatePayload)
      .eq('id', id)
      .select('id, category_id, category:blog_categories(id, name, slug), title, slug, excerpt, content, content_markdown, content_html, cover_image_url, cover_image_alt, author_name, status, published_at, meta_title, meta_description, canonical_url, og_image_url, og_image_alt, primary_keyword, secondary_keywords, schema_faq, reading_time_minutes, created_at, updated_at')
      .single();

    if (error) {
      if (error.code === '23503') {
        return NextResponse.json({ error: 'Invalid category selected' }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ blog: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = createSupabaseAdminClient();

    const { error } = await supabase.from('blog_posts').delete().eq('id', id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
