import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin';

type CategoryPayload = {
  name?: unknown;
  slug?: unknown;
  description?: unknown;
};

function toSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export async function GET() {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('blog_categories')
      .select('id, name, slug, description')
      .order('name', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ categories: data || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as CategoryPayload;
    const name = typeof payload.name === 'string' ? payload.name.trim() : '';
    const inputSlug = typeof payload.slug === 'string' ? payload.slug.trim() : '';
    const description = typeof payload.description === 'string' ? payload.description.trim() : '';

    if (!name) return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    const slug = toSlug(inputSlug || name);
    if (!slug) return NextResponse.json({ error: 'Invalid category slug' }, { status: 400 });

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('blog_categories')
      .insert({ name, slug, description })
      .select('id, name, slug, description')
      .single();

    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'Category slug already exists' }, { status: 409 });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ category: data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

