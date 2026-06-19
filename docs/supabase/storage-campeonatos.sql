-- Storage para imagens de campeonatos personalizados (banner + escudos)
-- Execute no SQL Editor do Supabase APÓS migration-campeonatos-owner.sql

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'campeonatos-media',
  'campeonatos-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "campeonatos_media_public_read" on storage.objects;
create policy "campeonatos_media_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'campeonatos-media');

drop policy if exists "campeonatos_media_auth_upload" on storage.objects;
create policy "campeonatos_media_auth_upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'campeonatos-media'
    and (storage.foldername(name))[1] in ('banners', 'escudos', 'logos', 'times')
    and auth.uid()::text = (storage.foldername(name))[2]
  );

drop policy if exists "campeonatos_media_auth_update" on storage.objects;
create policy "campeonatos_media_auth_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'campeonatos-media'
    and auth.uid()::text = (storage.foldername(name))[2]
  );

drop policy if exists "campeonatos_media_auth_delete" on storage.objects;
create policy "campeonatos_media_auth_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'campeonatos-media'
    and auth.uid()::text = (storage.foldername(name))[2]
  );
