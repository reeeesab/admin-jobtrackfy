import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin';
import {
  BlogUpsertData,
  estimateReadingTimeMinutes,
  estimateReadingTimeFromText,
  htmlToPlainText,
  markdownToHtml,
  normalizeEditorJson,
  normalizeFaq,
  normalizeKeywords,
  toSlug,
} from '@/lib/blogContent';

type BlogPayload = {
  categoryId?: unknown;
  title?: unknown;
  slug?: unknown;
  excerpt?: unknown;
  content?: unknown;
  contentMarkdown?: unknown;
  contentHtml?: unknown;
  contentJson?: unknown;
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

function validatePayload(payload: BlogPayload): { data?: BlogUpsertData; error?: string } {
  const title = typeof payload.title === 'string' ? payload.title.trim() : '';
  const categoryId = typeof payload.categoryId === 'string' ? payload.categoryId.trim() : '';
  const inputSlug = typeof payload.slug === 'string' ? payload.slug.trim() : '';
  const excerpt = typeof payload.excerpt === 'string' ? payload.excerpt.trim() : '';
  const contentHtmlInput = typeof payload.contentHtml === 'string' ? payload.contentHtml.trim() : '';
  const contentJson = normalizeEditorJson(payload.contentJson);
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
  const statusInput = payload.status === 'published' ? 'published' : 'draft';
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

  if (!title) return { error: 'Title is required' };
  if (!categoryId) return { error: 'Category is required' };
  if (!contentMarkdown && !contentHtmlInput) return { error: 'Content is required' };

  const slug = toSlug(inputSlug || title);
  if (!slug) return { error: 'Slug is invalid' };
  const computedMetaTitle = (metaTitle || title).slice(0, 60);
  const contentHtml = contentHtmlInput || markdownToHtml(contentMarkdown);
  const plainTextContent = htmlToPlainText(contentHtml) || contentMarkdown;
  const computedMetaDescription = (metaDescription || excerpt || plainTextContent.slice(0, 160)).slice(0, 160);

  const nowIso = new Date().toISOString();
  const readingTime = contentMarkdown
    ? estimateReadingTimeMinutes(contentMarkdown)
    : estimateReadingTimeFromText(plainTextContent);

  return {
    data: {
      category_id: categoryId,
      title,
      slug,
      excerpt,
      content: contentMarkdown || plainTextContent,
      content_markdown: contentMarkdown || plainTextContent,
      content_html: contentHtml,
      content_json: contentJson,
      cover_image_url: coverImageUrl || null,
      cover_image_alt: coverImageAlt,
      author_name: authorName || 'JobTrackfy Team',
      status: statusInput,
      published_at: statusInput === 'published' ? nowIso : null,
      meta_title: computedMetaTitle,
      meta_description: computedMetaDescription,
      canonical_url: canonicalUrl || null,
      og_image_url: ogImageUrl || coverImageUrl || null,
      og_image_alt: ogImageAlt || coverImageAlt,
      primary_keyword: primaryKeyword,
      secondary_keywords: secondaryKeywords,
      schema_faq: schemaFaq,
      reading_time_minutes: readingTime,
    },
  };
}

export async function GET() {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('blog_posts')
      .select('id, category_id, category:blog_categories(id, name, slug), title, slug, excerpt, content, content_markdown, content_html, content_json, cover_image_url, cover_image_alt, author_name, status, published_at, meta_title, meta_description, canonical_url, og_image_url, og_image_alt, primary_keyword, secondary_keywords, schema_faq, reading_time_minutes, created_at, updated_at')
      .order('updated_at', { ascending: false });

    if (error) {
      if (error.code === '23503') {
        return NextResponse.json({ error: 'Invalid category selected' }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ blogs: data || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as BlogPayload;
    const parsed = validatePayload(payload);
    if (!parsed.data) {
      return NextResponse.json({ error: parsed.error || 'Invalid payload' }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    const slugExists = await supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', parsed.data.slug)
      .limit(1)
      .maybeSingle();

    if (slugExists.error) {
      return NextResponse.json({ error: slugExists.error.message }, { status: 500 });
    }

    if (slugExists.data) {
      return NextResponse.json({ error: 'Slug already exists. Use a different slug.' }, { status: 409 });
    }

    const { data, error } = await supabase
      .from('blog_posts')
      .insert(parsed.data)
      .select('id, category_id, category:blog_categories(id, name, slug), title, slug, excerpt, content, content_markdown, content_html, content_json, cover_image_url, cover_image_alt, author_name, status, published_at, meta_title, meta_description, canonical_url, og_image_url, og_image_alt, primary_keyword, secondary_keywords, schema_faq, reading_time_minutes, created_at, updated_at')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ blog: data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
