create extension if not exists pgcrypto;

create table if not exists public.blog_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

insert into public.blog_categories (name, slug, description)
values
  ('Uncategorized', 'uncategorized', 'Default category for uncategorized posts'),
  ('Job Application Tracking', 'job-application-tracking', 'Tracking systems, pipelines, and status workflows'),
  ('Freshers and Students', 'freshers-and-students', 'Student, fresher, and campus placement guidance'),
  ('ATS and Resume Optimization', 'ats-and-resume-optimization', 'Resume matching and ATS improvement strategies'),
  ('Interview Tracking and Follow-ups', 'interview-tracking-and-follow-ups', 'Interview process and follow-up workflows'),
  ('Productivity and Systems', 'productivity-and-systems', 'Execution systems and automation for job search')
on conflict (slug) do nothing;

alter table public.blog_posts
  add column if not exists category_id uuid;

update public.blog_posts
set category_id = (
  select id from public.blog_categories where slug = 'uncategorized' limit 1
)
where category_id is null;

alter table public.blog_posts
  alter column category_id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'blog_posts_category_id_fkey'
  ) then
    alter table public.blog_posts
      add constraint blog_posts_category_id_fkey
      foreign key (category_id)
      references public.blog_categories(id)
      on update cascade
      on delete restrict;
  end if;
end
$$;

create index if not exists blog_categories_slug_idx on public.blog_categories (slug);
create index if not exists blog_posts_category_id_idx on public.blog_posts (category_id);

create or replace function public.set_blog_categories_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_blog_categories_updated_at on public.blog_categories;
create trigger trg_blog_categories_updated_at
before update on public.blog_categories
for each row
execute function public.set_blog_categories_updated_at();

