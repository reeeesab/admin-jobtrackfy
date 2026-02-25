create extension if not exists pgcrypto;

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text not null default '',
  content text not null,
  cover_image_url text null,
  author_name text not null default 'JobTrackfy Team',
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.blog_posts
  add column if not exists content_markdown text,
  add column if not exists content_html text,
  add column if not exists cover_image_alt text not null default '',
  add column if not exists meta_title text not null default '',
  add column if not exists meta_description text not null default '',
  add column if not exists canonical_url text null,
  add column if not exists og_image_url text null,
  add column if not exists og_image_alt text not null default '',
  add column if not exists primary_keyword text not null default '',
  add column if not exists secondary_keywords text[] not null default '{}',
  add column if not exists schema_faq jsonb not null default '[]'::jsonb,
  add column if not exists reading_time_minutes integer not null default 1;

update public.blog_posts
set
  content_markdown = coalesce(nullif(content_markdown, ''), content),
  content_html = coalesce(nullif(content_html, ''), content),
  meta_title = coalesce(nullif(meta_title, ''), title),
  meta_description = coalesce(nullif(meta_description, ''), left(coalesce(excerpt, content), 160)),
  og_image_url = coalesce(og_image_url, cover_image_url),
  canonical_url = coalesce(canonical_url, 'https://jobtrackfy.com/blog/' || slug)
where true;

alter table public.blog_posts
  alter column content_markdown set not null,
  alter column content_html set not null;

create index if not exists blog_posts_slug_idx on public.blog_posts (slug);
create index if not exists blog_posts_primary_keyword_idx on public.blog_posts (primary_keyword);
create index if not exists blog_posts_secondary_keywords_gin_idx on public.blog_posts using gin (secondary_keywords);

create or replace function public.set_blog_posts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_blog_posts_updated_at on public.blog_posts;
create trigger trg_blog_posts_updated_at
before update on public.blog_posts
for each row
execute function public.set_blog_posts_updated_at();
