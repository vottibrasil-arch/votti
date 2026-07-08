-- Foto opcional por opção de votação (ranking com bolha que cresce)
alter table public.options add column if not exists image_url text;
