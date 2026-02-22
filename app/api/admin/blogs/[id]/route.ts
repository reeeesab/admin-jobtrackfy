import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin';

type BlogStatus = 'draft' | 'published';

type BlogUpdatePayload = {
  title?: unknown;
  slug?: unknown;
  excerpt?: unknown;
  content?: unknown;
  coverImageUrl?: unknown;
  authorName?: unknown;
  status?: unknown;
};

type RouteContext = {
  params: Promise<{ id: string }>;
};

function toSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

export async function GET(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from('blog_posts')
      .select('id, title, slug, excerpt, content, cover_image_url, author_name, status, published_at, created_at, updated_at')
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
    const inputSlug = typeof payload.slug === 'string' ? payload.slug.trim() : '';
    const excerpt = typeof payload.excerpt === 'string' ? payload.excerpt.trim() : '';
    const content = typeof payload.content === 'string' ? payload.content.trim() : '';
    const coverImageUrl = typeof payload.coverImageUrl === 'string' ? payload.coverImageUrl.trim() : '';
    const authorName = typeof payload.authorName === 'string' ? payload.authorName.trim() : '';

    if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    if (!content) return NextResponse.json({ error: 'Content is required' }, { status: 400 });

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

    const updatePayload: {
      title: string;
      slug: string;
      excerpt: string;
      content: string;
      cover_image_url: string | null;
      author_name: string;
      status: BlogStatus;
      published_at: string | null;
      updated_at: string;
    } = {
      title,
      slug,
      excerpt,
      content,
      cover_image_url: coverImageUrl || null,
      author_name: authorName || 'JobTrackfy Team',
      status,
      published_at: nextPublishedAt,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('blog_posts')
      .update(updatePayload)
      .eq('id', id)
      .select('id, title, slug, excerpt, content, cover_image_url, author_name, status, published_at, created_at, updated_at')
      .single();

    if (error) {
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
