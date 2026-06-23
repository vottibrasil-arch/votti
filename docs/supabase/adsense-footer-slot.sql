-- AdSense no rodapé: leitura pública do slot (valor não sensível).
-- Rode após apoiadores.sql. Substitua SEU_SLOT pelo ID da unidade Display no painel AdSense.

begin;

insert into public.app_settings (key, value)
values ('adsense_footer_slot', '"SEU_SLOT_AQUI"'::jsonb)
on conflict (key) do nothing;

drop policy if exists "app_settings_select_adsense_footer" on public.app_settings;
create policy "app_settings_select_adsense_footer"
  on public.app_settings
  for select
  to anon, authenticated
  using (key = 'adsense_footer_slot');

commit;
