insert into storage.buckets (id, name, public)
values ('blog-images', 'blog-images', true)
on conflict (id) do nothing;

-- Public read for blog images
drop policy if exists "Public read blog images" on storage.objects;
create policy "Public read blog images"
on storage.objects
for select
to public
using (bucket_id = 'blog-images');

-- Only service role should upload via admin API route
drop policy if exists "Service role upload blog images" on storage.objects;
create policy "Service role upload blog images"
on storage.objects
for insert
to service_role
with check (bucket_id = 'blog-images');
