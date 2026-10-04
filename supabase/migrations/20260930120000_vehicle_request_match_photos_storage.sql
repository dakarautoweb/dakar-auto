-- Manual found-vehicle photos are uploaded only by the trusted server-side
-- service-role client. Keep the bucket private and serve objects with signed
-- URLs; no authenticated storage.objects write policies are required.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'vehicle-request-match-photos',
  'vehicle-request-match-photos',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
