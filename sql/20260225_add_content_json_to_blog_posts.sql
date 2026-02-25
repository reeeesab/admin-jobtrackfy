alter table public.blog_posts
  add column if not exists content_json jsonb not null default '{"type":"doc","content":[]}'::jsonb;

update public.blog_posts
set content_json = jsonb_build_object(
  'type', 'doc',
  'content', jsonb_build_array(
    jsonb_build_object(
      'type', 'paragraph',
      'content', jsonb_build_array(
        jsonb_build_object('type', 'text', 'text', coalesce(nullif(excerpt, ''), left(coalesce(content, ''), 240), ''))
      )
    )
  )
)
where
  content_json is null
  or content_json = '{}'::jsonb
  or content_json = '{"type":"doc","content":[]}'::jsonb;
