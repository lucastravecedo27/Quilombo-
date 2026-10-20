-- Chat uno a uno entre jugadores conectados, con fotos y notas de voz, y presencia ("estoy mirando este chat").
-- Viene de parche_mensajes + chat_presencia + chat_adjuntos de Selffin, sin chats de fondos (financiero) ni de grupos.
-- Cada mensaje lleva un tipo (texto, foto o voz). El texto sigue siendo obligatorio (para foto/voz es "📷 Foto" o
-- "🎙️ Nota de voz" más una nota opcional): así las vistas previas y los avisos push funcionan sin cambios.

create table if not exists public.social_mensajes (
  id uuid primary key default gen_random_uuid(),
  relacion_id uuid not null references public.social_relaciones on delete cascade,
  autor uuid not null references auth.users on delete cascade,
  texto text not null check (char_length(texto) between 1 and 500),
  tipo text not null default 'texto',
  adjunto text,     -- <autor>/r-<relación>/<archivo> en el bucket "chat"
  duracion smallint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint social_mensajes_tipo_ok check (
    tipo in ('texto', 'foto', 'voz')
    and (tipo = 'texto') = (adjunto is null)
    and (duracion is null or duracion between 0 and 600)
  )
);
create index if not exists social_mensajes_rel on public.social_mensajes (relacion_id, created_at);
create index if not exists social_mensajes_upd on public.social_mensajes (updated_at);
create trigger sync before insert or update on public.social_mensajes for each row execute function public.tg_social_sync();

alter table public.social_mensajes enable row level security; alter table public.social_mensajes force row level security;
create policy social_mensajes_ver on public.social_mensajes for select to authenticated
  using (exists (select 1 from public.social_relaciones r where r.id = relacion_id and (select auth.uid()) in (r.user_a, r.user_b) and r.estado = 'activa'));
revoke all on public.social_mensajes from anon;
revoke insert, update, delete, truncate, trigger, references on public.social_mensajes from authenticated;
grant select on public.social_mensajes to authenticated;

-- ───────── Presencia: no avisar de un mensaje a quien ya tiene ese chat abierto ─────────
-- Mientras alguien mira un chat, la app renueva cada 30 s "estoy aquí hasta dentro de 60 s"; al salir lo borra.
-- La función social-aviso no le manda la notificación a quien tenga una marca vigente. sala = 'r/<relación>'.
create table if not exists public.social_chat_presencia (
  user_id uuid not null references auth.users on delete cascade,
  sala text not null check (sala ~ '^r/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
  hasta timestamptz not null,
  primary key (user_id, sala)
);
alter table public.social_chat_presencia enable row level security;
alter table public.social_chat_presencia force row level security;
-- Sin políticas: nadie la lee ni la escribe directo; solo chat_estoy() y la función del servidor (service role)
revoke all on public.social_chat_presencia from anon, authenticated;

create or replace function public.chat_estoy(p_sala text, p_aqui boolean)
returns void
language plpgsql volatile security definer
set search_path = ''
as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'no autorizado' using errcode = '42501'; end if;
  if p_sala !~ '^r/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception 'Sala inválida' using errcode = '22023'; end if;
  if p_aqui then
    insert into public.social_chat_presencia (user_id, sala, hasta) values (uid, p_sala, now() + interval '60 seconds')
    on conflict (user_id, sala) do update set hasta = excluded.hasta;
  else
    delete from public.social_chat_presencia where user_id = uid and sala = p_sala;
  end if;
  -- limpieza de marcas vencidas (de cualquiera), barata
  delete from public.social_chat_presencia where hasta < now() - interval '1 hour';
end;
$$;

/** ¿Estoy en esa sala de chat? (r-<relación activa>) */
create or replace function public.veo_sala_chat(p_sala text)
returns boolean
language plpgsql stable security definer
set search_path = ''
as $$
declare uid uuid := (select auth.uid()); x uuid;
begin
  if split_part(coalesce(p_sala, ''), '-', 1) <> 'r' then return false; end if;
  begin
    x := substr(p_sala, 3)::uuid;
  exception when others then
    return false;
  end;
  return exists (select 1 from public.social_relaciones r where r.id = x and uid in (r.user_a, r.user_b) and r.estado = 'activa' and r.deleted_at is null);
end;
$$;

-- ───────── Archivos: bucket privado "chat" (10 MB: fotos comprimidas y audios de hasta 10 min) ─────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat', 'chat', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'audio/mp4', 'audio/aac', 'audio/x-m4a', 'audio/webm', 'audio/mpeg', 'audio/ogg', 'audio/wav'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists social_chat_ver on storage.objects;
drop policy if exists social_chat_subir on storage.objects;
drop policy if exists social_chat_borrar on storage.objects;
create policy social_chat_ver on storage.objects for select to authenticated
  using (bucket_id = 'chat' and (
    (storage.foldername(name))[1] = (select auth.uid())::text or public.veo_sala_chat((storage.foldername(name))[2])
  ));
create policy social_chat_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'chat' and (storage.foldername(name))[1] = (select auth.uid())::text and public.veo_sala_chat((storage.foldername(name))[2]));
create policy social_chat_borrar on storage.objects for delete to authenticated
  using (bucket_id = 'chat' and (storage.foldername(name))[1] = (select auth.uid())::text);

/** Enviar un mensaje (texto, foto o voz) al chat de una relación activa. El adjunto debe ser un archivo mío de esa sala. */
create or replace function public.chat_enviar(p_relacion uuid, p_texto text, p_tipo text default 'texto', p_adjunto text default null, p_duracion smallint default null)
returns uuid
language plpgsql volatile security definer
set search_path = ''
as $$
declare uid uuid := (select auth.uid()); nuevo uuid; t text := trim(coalesce(p_texto, '')); tipo text := coalesce(p_tipo, 'texto');
begin
  if uid is null then raise exception 'no autorizado' using errcode = '42501'; end if;
  if char_length(t) = 0 or char_length(t) > 500 then raise exception 'Mensaje vacío o muy largo' using errcode = '22023'; end if;
  if tipo not in ('texto', 'foto', 'voz') or (tipo = 'texto') <> (p_adjunto is null) then raise exception 'Datos inválidos' using errcode = '22023'; end if;
  if p_adjunto is not null and p_adjunto not like uid::text || '/r-' || p_relacion::text || '/%' then raise exception 'Archivo inválido' using errcode = '22023'; end if;
  if not exists (select 1 from public.social_relaciones r where r.id = p_relacion and uid in (r.user_a, r.user_b) and r.estado = 'activa') then raise exception 'no autorizado' using errcode = '42501'; end if;
  insert into public.social_mensajes (relacion_id, autor, texto, tipo, adjunto, duracion) values (p_relacion, uid, t, tipo, p_adjunto, p_duracion) returning id into nuevo;
  return nuevo;
end;
$$;

/** Borrar un mensaje propio (queda "Mensaje eliminado") */
create or replace function public.chat_borrar(p_id uuid)
returns void
language plpgsql volatile security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'no autorizado' using errcode = '42501'; end if;
  update public.social_mensajes set deleted_at = now() where id = p_id and autor = (select auth.uid());
end;
$$;

-- Mensajes en tiempo real (respetan las reglas de quién ve qué)
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    execute 'alter publication supabase_realtime add table public.social_mensajes';
  end if;
exception when duplicate_object then null;
end $$;

do $$
declare f text;
begin
  foreach f in array array['chat_estoy(text, boolean)', 'veo_sala_chat(text)', 'chat_enviar(uuid, text, text, text, smallint)', 'chat_borrar(uuid)'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
