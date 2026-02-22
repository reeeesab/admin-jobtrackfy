import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin';

type BlogStatus = 'draft' | 'published';

type BlogInsert = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image_url: string | null;
  author_name: string;
  status: BlogStatus;
  published_at: string | null;
};

type BlogPayload = {
  title?: unknown;
  slug?: unknown;
  excerpt?: unknown;
  content?: unknown;
  coverImageUrl?: unknown;
  authorName?: unknown;
  status?: unknown;
};

function toSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function validatePayload(payload: BlogPayload): { data?: BlogInsert; error?: string } {
  const title = typeof payload.title === 'string' ? payload.title.trim() : '';
  const inputSlug = typeof payload.slug === 'string' ? payload.slug.trim() : '';
  const excerpt = typeof payload.excerpt === 'string' ? payload.excerpt.trim() : '';
  const content = typeof payload.content === 'string' ? payload.content.trim() : '';
  const coverImageUrl = typeof payload.coverImageUrl === 'string' ? payload.coverImageUrl.trim() : '';
  const authorName = typeof payload.authorName === 'string' ? payload.authorName.trim() : '';
  const statusInput = payload.status === 'published' ? 'published' : 'draft';

  if (!title) return { error: 'Title is required' };
  if (!content) return { error: 'Content is required' };

  const slug = toSlug(inputSlug || title);
  if (!slug) return { error: 'Slug is invalid' };

  const nowIso = new Date().toISOString();
  const status = statusInput as BlogStatus;

  return {
    data: {
      title,
      slug,
      excerpt,
      content,
      cover_image_url: coverImageUrl || null,
      author_name: authorName || 'JobTrackfy Team',
      status,
      published_at: status === 'published' ? nowIso : null,
    },
  };
}

export async function GET() {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('blog_posts')
      .select('id, title, slug, excerpt, content, cover_image_url, author_name, status, published_at, created_at, updated_at')
      .order('updated_at', { ascending: false });

    if (error) {
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
      .select('id, title, slug, excerpt, content, cover_image_url, author_name, status, published_at, created_at, updated_at')
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
