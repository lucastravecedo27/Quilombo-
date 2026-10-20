-- Quilombo · red social de pádel: perfiles de jugador, relaciones (amigo, pareja de juego, rival), bloqueos,
-- actividad (eventos) con reacciones, publicaciones (fotos y resultados) con comentarios, cobros para dividir la
-- cancha, reportes y el bucket privado "social".
-- Viene del módulo "El Parche" de Selffin (tablas parche_* → social_*), sin nada financiero.
-- Regla general: el cliente solo LEE (RLS); todo cambio va por funciones security definer.

-- ───────── Sincronización: updated_at lo pone el servidor (el cliente trae por cursor) ─────────
create or replace function public.tg_social_sync()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then new.created_at := old.created_at; end if;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

/** Minúsculas, sin tildes ni signos, espacios simples (búsquedas). Igual que clave() en src/lib/social/domain/social.ts */
create or replace function public.social_clave(t text)
returns text
language sql immutable
set search_path = ''
as $$
  select trim(regexp_replace(regexp_replace(translate(lower(coalesce(t, '')), 'áéíóúüñ', 'aeiouun'), '[^a-z0-9 ]', ' ', 'g'), '\s+', ' ', 'g'));
$$;

-- ───────── Perfil de jugador (lo que ve tu gente) ─────────
create table if not exists public.social_perfiles (
  user_id uuid primary key references auth.users on delete cascade,
  nombre text not null check (char_length(nombre) between 1 and 40),
  color text not null default '#b69cff' check (color ~ '^#[0-9a-fA-F]{6}$'),
  codigo text not null unique check (codigo ~ '^[a-z0-9]{10}$'),          -- para el link ?amigo=
  usuario text unique check (usuario is null or usuario ~ '^[a-z0-9._]{3,20}$'),
  buscable boolean not null default true,
  avatar text check (avatar is null or avatar ~ '^[a-z0-9-]{1,30}$'),     -- dibujo de la app (src/lib/ui/avatares.ts)
  foto text check (foto is null or char_length(foto) <= 200),              -- <yo>/perfil/<n>.jpg en el bucket "social"
  -- Pádel
  categoria smallint check (categoria is null or categoria between 1 and 6),
  puntos_ranking integer not null default 0 check (puntos_ranking >= 0),  -- solo lo cambia el servidor
  club_base text check (club_base is null or char_length(club_base) <= 60),
  ciudad text check (ciudad is null or char_length(ciudad) <= 40),
  terminos_en timestamptz,                                                -- aceptó las condiciones de la red
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists social_perfiles_upd on public.social_perfiles (updated_at);
create trigger sync before insert or update on public.social_perfiles for each row execute function public.tg_social_sync();

-- ───────── Relaciones: "user_b es mi <tipo>" (dicho por quien propone) ─────────
create table if not exists public.social_relaciones (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references auth.users on delete cascade, -- quien propone
  user_b uuid not null references auth.users on delete cascade,
  tipo text not null check (tipo in ('amigo', 'pareja_juego', 'rival')),
  etiqueta text check (etiqueta is null or char_length(etiqueta) between 1 and 30),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'activa', 'rechazada', 'terminada')),
  verificada boolean not null default false, -- se agregaron en persona (QR)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (user_a <> user_b)
);
create unique index if not exists social_relaciones_par on public.social_relaciones (least(user_a, user_b), greatest(user_a, user_b));
create index if not exists social_relaciones_a on public.social_relaciones (user_a, updated_at);
create index if not exists social_relaciones_b on public.social_relaciones (user_b, updated_at);
create trigger sync before insert or update on public.social_relaciones for each row execute function public.tg_social_sync();

-- ───────── Bloqueos ─────────
create table if not exists public.social_bloqueos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade, -- quien bloquea
  bloqueado uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, bloqueado),
  check (user_id <> bloqueado)
);
create trigger sync before insert or update on public.social_bloqueos for each row execute function public.tg_social_sync();

-- ───────── Actividad (eventos del feed) ─────────
create table if not exists public.social_eventos (
  id uuid primary key default gen_random_uuid(),
  actor uuid not null references auth.users on delete cascade,
  participantes uuid[] not null, -- quienes lo ven (incluye al actor)
  tipo text not null check (tipo in ('foto', 'resultado_partido', 'subio_ranking', 'torneo', 'partido', 'relacion', 'saludo', 'cobro', 'pago')),
  texto text not null check (char_length(texto) between 1 and 160),
  ref uuid,
  gesto text check (gesto is null or gesto in ('jugamos', 'nivel', 'fuerza', 'gracias', 'crack', 'pola')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists social_eventos_part on public.social_eventos using gin (participantes);
create index if not exists social_eventos_upd on public.social_eventos (updated_at);
create trigger sync before insert or update on public.social_eventos for each row execute function public.tg_social_sync();

create table if not exists public.social_reacciones (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.social_eventos on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  reaccion text not null check (reaccion in ('amor', 'fuego', 'crack', 'bandeja', 'jaja', 'aplauso', 'paila')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (evento_id, user_id)
);
create trigger sync before insert or update on public.social_reacciones for each row execute function public.tg_social_sync();

-- ───────── Publicaciones (fotos, resultados de partidos) y comentarios ─────────
create table if not exists public.social_publicaciones (
  id uuid primary key,                       -- lo genera el cliente (las fotos se suben antes, en <autor>/<id>/)
  autor uuid not null references auth.users on delete cascade,
  tipo text not null check (tipo in ('foto', 'resultado_partido', 'torneo')),
  texto text check (texto is null or char_length(texto) <= 300),
  fotos jsonb not null default '[]' check (jsonb_typeof(fotos) = 'array' and jsonb_array_length(fotos) <= 6),
  marcador jsonb check (marcador is null or (jsonb_typeof(marcador) = 'object' and pg_column_size(marcador) < 2000)),
  con uuid[] not null default '{}',          -- con quién jugó (pareja y rivales)
  audiencia uuid[] not null default '{}',    -- quiénes la ven (su gente al publicar)
  club text check (club is null or char_length(club) <= 60),
  ciudad text check (ciudad is null or char_length(ciudad) <= 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (tipo <> 'foto' or jsonb_array_length(fotos) > 0),
  check (tipo <> 'resultado_partido' or marcador is not null)
);
create index if not exists social_publicaciones_aud on public.social_publicaciones using gin (audiencia);
create index if not exists social_publicaciones_upd on public.social_publicaciones (updated_at);
create trigger sync before insert or update on public.social_publicaciones for each row execute function public.tg_social_sync();

create table if not exists public.social_comentarios (
  id uuid primary key default gen_random_uuid(),
  publicacion_id uuid not null references public.social_publicaciones on delete cascade,
  autor uuid not null references auth.users on delete cascade,
  texto text not null check (char_length(texto) between 1 and 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists social_comentarios_pub on public.social_comentarios (publicacion_id);
create trigger sync before insert or update on public.social_comentarios for each row execute function public.tg_social_sync();

-- ───────── Cobros entre jugadores (dividir la cancha) · pesos colombianos, sin decimales ─────────
create table if not exists public.social_cobros (
  id uuid primary key default gen_random_uuid(),
  acreedor uuid not null references auth.users on delete cascade,
  deudor uuid not null references auth.users on delete cascade,
  monto integer not null check (monto > 0 and monto <= 50000000),
  concepto text not null check (char_length(concepto) between 1 and 80),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'avisado', 'pagado', 'rechazado', 'cancelado')),
  grupo uuid,       -- cobros creados juntos
  partido_id uuid,  -- la cancha de un partido (llave foránea en *_social_jugar.sql)
  pagado_en timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (acreedor <> deudor)
);
create index if not exists social_cobros_acreedor on public.social_cobros (acreedor, updated_at);
create index if not exists social_cobros_deudor on public.social_cobros (deudor, updated_at);
create trigger sync before insert or update on public.social_cobros for each row execute function public.tg_social_sync();

-- ───────── Reportes (requisito de la App Store: reportar, bloquear y actuar en < 24 h) ─────────
create table if not exists public.social_reportes (
  id uuid primary key default gen_random_uuid(),
  reporta uuid not null references auth.users on delete cascade,
  tipo text not null check (tipo in ('publicacion', 'comentario', 'mensaje', 'persona')),
  ref uuid not null,
  acusado uuid references auth.users on delete cascade,
  motivo text not null check (motivo in ('ofensivo', 'acoso', 'spam', 'privado', 'otro')),
  detalle text check (detalle is null or char_length(detalle) <= 300),
  estado text not null default 'abierto' check (estado in ('abierto', 'ocultado', 'descartado')),
  resuelto_en timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists social_reportes_abiertos on public.social_reportes (estado, created_at);
create trigger sync before insert or update on public.social_reportes for each row execute function public.tg_social_sync();

-- ───────── Quién ve qué ─────────
/** ¿Hay relación (pendiente o activa) entre el usuario actual y otro? */
create or replace function public.tengo_relacion_con(otro uuid, solo_activa boolean default false)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.social_relaciones r
    where ((r.user_a = (select auth.uid()) and r.user_b = otro) or (r.user_b = (select auth.uid()) and r.user_a = otro))
      and r.deleted_at is null
      and (r.estado = 'activa' or (not solo_activa and r.estado = 'pendiente'))
  );
$$;

/** ¿Hay un bloqueo (en cualquier sentido) entre dos personas? */
create or replace function public.hay_bloqueo(a uuid, b uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.social_bloqueos x where x.deleted_at is null
    and ((x.user_id = a and x.bloqueado = b) or (x.user_id = b and x.bloqueado = a)));
$$;

/** ¿Puedo ver esta publicación? (soy el autor o estoy en su audiencia) */
create or replace function public.veo_publicacion(p_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.social_publicaciones p where p.id = p_id and p.deleted_at is null
    and ((select auth.uid()) = p.autor or (select auth.uid()) = any (p.audiencia)));
$$;

alter table public.social_perfiles enable row level security; alter table public.social_perfiles force row level security;
alter table public.social_relaciones enable row level security; alter table public.social_relaciones force row level security;
alter table public.social_bloqueos enable row level security; alter table public.social_bloqueos force row level security;
alter table public.social_eventos enable row level security; alter table public.social_eventos force row level security;
alter table public.social_reacciones enable row level security; alter table public.social_reacciones force row level security;
alter table public.social_publicaciones enable row level security; alter table public.social_publicaciones force row level security;
alter table public.social_comentarios enable row level security; alter table public.social_comentarios force row level security;
alter table public.social_cobros enable row level security; alter table public.social_cobros force row level security;
alter table public.social_reportes enable row level security; alter table public.social_reportes force row level security;

-- Perfiles: el mío y el de mi gente (la política de "comparto partido" se agrega en *_social_jugar.sql)
create policy social_perfiles_ver on public.social_perfiles for select to authenticated
  using (user_id = (select auth.uid()) or public.tengo_relacion_con(user_id));
create policy social_relaciones_ver on public.social_relaciones for select to authenticated
  using ((select auth.uid()) in (user_a, user_b));
create policy social_bloqueos_ver on public.social_bloqueos for select to authenticated
  using (user_id = (select auth.uid()));
create policy social_eventos_ver on public.social_eventos for select to authenticated
  using ((select auth.uid()) = any (participantes));
create policy social_reacciones_ver on public.social_reacciones for select to authenticated
  using (exists (select 1 from public.social_eventos e where e.id = evento_id and (select auth.uid()) = any (e.participantes)));
create policy social_publicaciones_ver on public.social_publicaciones for select to authenticated
  using (autor = (select auth.uid()) or (select auth.uid()) = any (audiencia));
create policy social_comentarios_ver on public.social_comentarios for select to authenticated
  using (public.veo_publicacion(publicacion_id));
create policy social_cobros_ver on public.social_cobros for select to authenticated
  using ((select auth.uid()) in (acreedor, deudor));
create policy social_reportes_ver on public.social_reportes for select to authenticated
  using (reporta = (select auth.uid()));

revoke all on public.social_perfiles, public.social_relaciones, public.social_bloqueos, public.social_eventos, public.social_reacciones,
  public.social_publicaciones, public.social_comentarios, public.social_cobros, public.social_reportes from anon;
revoke insert, update, delete, truncate, trigger, references on public.social_perfiles, public.social_relaciones, public.social_bloqueos,
  public.social_eventos, public.social_reacciones, public.social_publicaciones, public.social_comentarios, public.social_cobros, public.social_reportes from authenticated;
grant select on public.social_perfiles, public.social_relaciones, public.social_bloqueos, public.social_eventos, public.social_reacciones,
  public.social_publicaciones, public.social_comentarios, public.social_cobros, public.social_reportes to authenticated;

-- Con un bloqueo de por medio no se puede proponer ni reactivar la relación
create or replace function public.tg_relacion_sin_bloqueo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.estado in ('pendiente', 'activa') and public.hay_bloqueo(new.user_a, new.user_b) then
    raise exception 'No es posible conectar con esta persona' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger sin_bloqueo before insert or update on public.social_relaciones for each row execute function public.tg_relacion_sin_bloqueo();

-- ───────── Perfil: se crea solo con cada cuenta (nombre de los datos del registro o del correo) ─────────
create or replace function public._social_codigo()
returns text language plpgsql volatile set search_path = '' as $$
declare abc text := 'abcdefghjkmnpqrstuvwxyz23456789'; c text := '';
begin
  for i in 1..10 loop c := c || substr(abc, 1 + floor(random() * length(abc))::int, 1); end loop;
  return c;
end; $$;

/** @usuario libre a partir de un nombre: "Caro López" → caro.lopez (o caro.lopez2, caro.lopez3…) */
create or replace function public._social_usuario_libre(p_nombre text, p_uid uuid)
returns text
language plpgsql volatile security definer
set search_path = ''
as $$
declare base text; u text; n int := 1;
begin
  base := regexp_replace(replace(public.social_clave(p_nombre), ' ', '.'), '[^a-z0-9._]', '', 'g');
  base := trim(both '.' from regexp_replace(base, '\.{2,}', '.', 'g'));
  if char_length(base) < 3 then base := 'jugador'; end if;
  base := left(base, 17);
  u := base;
  while exists (select 1 from public.social_perfiles where usuario = u and user_id <> p_uid)
     or u in ('admin', 'quilombo', 'soporte', 'ayuda', 'oficial') loop
    n := n + 1;
    u := base || n::text;
  end loop;
  return u;
end;
$$;

/** Crea el perfil de una cuenta si no existe y le pone @usuario si no tiene */
create or replace function public._social_asegurar_perfil(p_uid uuid)
returns text
language plpgsql volatile security definer
set search_path = ''
as $$
declare nom text; c text; correo text;
begin
  select codigo into c from public.social_perfiles where user_id = p_uid;
  if c is null then
    select nullif(trim(u.raw_user_meta_data ->> 'nombre'), ''), u.email into nom, correo from auth.users u where u.id = p_uid;
    if nom is null then
      nom := initcap(trim(regexp_replace(split_part(coalesce(correo, ''), '@', 1), '[._+\-0-9]+', ' ', 'g')));
      if char_length(coalesce(nom, '')) < 2 then nom := 'Jugador'; end if;
    end if;
    loop
      c := public._social_codigo();
      exit when not exists (select 1 from public.social_perfiles where codigo = c);
    end loop;
    insert into public.social_perfiles (user_id, nombre, codigo) values (p_uid, left(nom, 40), c) on conflict (user_id) do nothing;
    select codigo into c from public.social_perfiles where user_id = p_uid;
  end if;
  update public.social_perfiles set usuario = public._social_usuario_libre(nombre, p_uid) where user_id = p_uid and usuario is null;
  return c;
end;
$$;

create or replace function public.tg_social_cuenta_nueva()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  perform public._social_asegurar_perfil(new.id);
  return new;
exception when others then
  return new; -- nunca bloquear la creación de una cuenta por esto
end;
$$;
drop trigger if exists social_cuenta_nueva on auth.users;
create trigger social_cuenta_nueva after insert on auth.users for each row execute function public.tg_social_cuenta_nueva();

/** Mi perfil (lo crea si falta) y, si vienen, nombre y color. Devuelve mi código para el link de amigo. */
create or replace function public.social_yo(p_nombre text default null, p_color text default null)
returns text
language plpgsql volatile security definer
set search_path = ''
as $$
declare uid uuid := (select auth.uid()); c text;
begin
  if uid is null then raise exception 'no autorizado' using errcode = '42501'; end if;
  c := public._social_asegurar_perfil(uid);
  if p_nombre is not null or p_color is not null then
    if p_color is not null and p_color !~ '^#[0-9a-fA-F]{6}$' then raise exception 'Color inválido' using errcode = '22023'; end if;
    update public.social_perfiles set nombre = left(coalesce(nullif(trim(p_nombre), ''), nombre), 40), color = coalesce(p_color, color) where user_id = uid;
  end if;
  return c;
end;
$$;

/** Vista previa de un código (link ?amigo=): nombre y color, para confirmar a quién agregas */
create or replace function public.social_ver(p_codigo text)
returns table (nombre text, color text, soy_yo boolean, ya_relacion text)
language sql stable security definer
set search_path = ''
as $$
  select p.nombre, p.color, p.user_id = (select auth.uid()),
    (select r.estado from public.social_relaciones r where least(r.user_a, r.user_b) = least(p.user_id, (select auth.uid())) and greatest(r.user_a, r.user_b) = greatest(p.user_id, (select auth.uid())) and r.deleted_at is null and r.estado in ('pendiente', 'activa'))
  from public.social_perfiles p
  where p.codigo = lower(trim(p_codigo)) and (select auth.uid()) is not null and not public.hay_bloqueo(p.user_id, (select auth.uid()));
$$;

/** Mi foto o mi dibujo (uno u otro; null en ambos = iniciales) */
create or replace function public.social_imagen(p_avatar text, p_foto text)
returns void
language plpgsql volatile security definer
set search_path = ''
as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'no autorizado' using errcode = '42501'; end if;
  if p_avatar is not null and p_avatar !~ '^[a-z0-9-]{1,30}$' then raise exception 'Dibujo inválido' using errcode = '22023'; end if;
  if p_foto is not null and p_foto !~ ('^' || uid::text || '/perfil/[0-9]{1,20}\.jpg$') then raise exception 'Foto inválida' using errcode = '22023'; end if;
  perform public._social_asegurar_perfil(uid);
  update public.social_perfiles set avatar = p_avatar, foto = p_foto where user_id = uid;
end;
$$;

/** Lo de pádel que pone cada quien: categoría (1ª–6ª), club base y ciudad. Los puntos de ranking no se editan aquí. */
create or replace function public.social_padel(p_categoria smallint, p_club text, p_ciudad text)
returns void
language plpgsql volatile security definer
set search_path = ''
as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'no autorizado' using errcode = '42501'; end if;
  if p_categoria is not null and p_categoria not between 1 and 6 then raise exception 'La categoría va de 1ª a 6ª' using errcode = '22023'; end if;
  perform public._social_asegurar_perfil(uid);
  update public.social_perfiles set categoria = p_categoria, club_base = left(nullif(trim(p_club), ''), 60), ciudad = left(nullif(trim(p_ciudad), ''), 40) where user_id = uid;
end;
$$;

/** Elegir (o cambiar) mi @usuario */
create or replace function public.social_usuario(p_usuario text)
returns text
language plpgsql volatile security definer
set search_path = ''
as $$
declare uid uuid := (select auth.uid()); u text := lower(trim(both '@ ' from coalesce(p_usuario, '')));
begin
  if uid is null then raise exception 'no autorizado' using errcode = '42501'; end if;
  if u !~ '^[a-z0-9._]{3,20}$' or u ~ '^[.]|[.]$|[.]{2}' then
    raise exception 'Usa de 3 a 20 letras, números, punto o guion bajo (sin tildes ni espacios)' using errcode = '22023';
  end if;
  if u in ('admin', 'quilombo', 'soporte', 'ayuda', 'oficial') then raise exception 'Ese usuario está reservado' using errcode = '22023'; end if;
  perform public._social_asegurar_perfil(uid);
  if exists (select 1 from public.social_perfiles where usuario = u and user_id <> uid) then raise exception 'Ese usuario ya está tomado' using errcode = '22023'; end if;
  update public.social_perfiles set usuario = u where user_id = uid;
  return u;
end;
$$;

create or replace function public.social_buscable(p_buscable boolean)
returns void
language plpgsql volatile security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'no autorizado' using errcode = '42501'; end if;
  perform public._social_asegurar_perfil((select auth.uid()));
  update public.social_perfiles set buscable = coalesce(p_buscable, true) where user_id = (select auth.uid());
end;
$$;

create or replace function public.social_aceptar_terminos()
returns void
language plpgsql volatile security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'no autorizado' using errcode = '42501'; end if;
  perform public._social_asegurar_perfil((select auth.uid()));
  update public.social_perfiles set terminos_en = coalesce(terminos_en, now()) where user_id = (select auth.uid());
end;
$$;

/** Buscar jugadores por @usuario (empieza por) o nombre (contiene, sin tildes). Máximo 20; mínimo 2 letras. */
create or replace function public.social_buscar(p_q text)
returns table (codigo text, nombre text, usuario text, color text, categoria smallint, ciudad text, estado text, en_comun integer)
language plpgsql stable security definer
set search_path = ''
as $$
declare uid uuid := (select auth.uid()); q text := public.social_clave(trim(both '@ ' from coalesce(p_q, ''))); qu text := lower(trim(both '@ ' from coalesce(p_q, '')));
begin
  if uid is null then raise exception 'no autorizado' using errcode = '42501'; end if;
  if char_length(qu) < 2 then return; end if;
  return query
  with mios as (
    select case when r.user_a = uid then r.user_b else r.user_a end as otro
    from public.social_relaciones r where uid in (r.user_a, r.user_b) and r.estado = 'activa' and r.deleted_at is null
  )
  select p.codigo, p.nombre, p.usuario, p.color, p.categoria, p.ciudad,
    (select r.estado from public.social_relaciones r where least(r.user_a, r.user_b) = least(p.user_id, uid) and greatest(r.user_a, r.user_b) = greatest(p.user_id, uid)
       and r.deleted_at is null and r.estado in ('pendiente', 'activa') limit 1),
    (select count(*)::integer from public.social_relaciones r2 where p.user_id in (r2.user_a, r2.user_b) and r2.estado = 'activa' and r2.deleted_at is null
       and (case when r2.user_a = p.user_id then r2.user_b else r2.user_a end) in (select otro from mios))
  from public.social_perfiles p
  where p.user_id <> uid and p.deleted_at is null and p.buscable
    and not public.hay_bloqueo(uid, p.user_id)
    and ((p.usuario is not null and p.usuario like replace(replace(qu, '_', '\_'), '%', '') || '%')
         or (char_length(q) >= 2 and public.social_clave(p.nombre) like '%' || q || '%'))
  order by (p.usuario = qu) desc, (p.usuario like qu || '%') desc nulls last, p.nombre
  limit 20;
end;
$$;

/** Jugadores que quizás conozcas: amigos de tu gente; si no tienes gente, buscables de tu ciudad */
create or replace function public.social_sugerencias()
returns table (codigo text, nombre text, usuario text, color text, categoria smallint, ciudad text, en_comun integer)
language plpgsql stable security definer
set search_path = ''
as $$
declare uid uuid := (select auth.uid()); mi_ciudad text;
begin
  if uid is null then raise exception 'no autorizado' using errcode = '42501'; end if;
  select p.ciudad into mi_ciudad from public.social_perfiles p where p.user_id = uid;
  return query
  with mios as (
    select case when r.user_a = uid then r.user_b else r.user_a end as otro
    from public.social_relaciones r where uid in (r.user_a, r.user_b) and r.estado = 'activa' and r.deleted_at is null
  ), candidatos as (
    select case when r.user_a = m.otro then r.user_b else r.user_a end as cand, count(*)::integer as n
    from mios m join public.social_relaciones r on m.otro in (r.user_a, r.user_b) and r.estado = 'activa' and r.deleted_at is null
    group by 1
    union all
    select p.user_id, 0 from public.social_perfiles p where mi_ciudad is not null and p.ciudad = mi_ciudad
  ), mejores as (select cand, max(n) as n from candidatos group by cand)
  select p.codigo, p.nombre, p.usuario, p.color, p.categoria, p.ciudad, c.n
  from mejores c join public.social_perfiles p on p.user_id = c.cand
  where c.cand <> uid and p.buscable and p.deleted_at is null
    and not exists (select 1 from public.social_relaciones r where least(r.user_a, r.user_b) = least(uid, c.cand) and greatest(r.user_a, r.user_b) = greatest(uid, c.cand) and r.deleted_at is null and r.estado in ('pendiente', 'activa'))
    and not public.hay_bloqueo(uid, c.cand)
  order by c.n desc, p.nombre
  limit 15;
end;
$$;

-- ───────── Relaciones ─────────
/** Proponer una relación a quien tiene ese código. Si la otra persona ya me había propuesto, queda activa. */
create or replace function public.relacion_proponer(p_codigo text, p_tipo text, p_etiqueta text default null, p_qr boolean default false)
returns uuid
language plpgsql volatile security definer
set search_path = ''
as $$
declare uid uuid := (select auth.uid()); otro uuid; r record; nuevo uuid;
begin
  if uid is null then raise exception 'no autorizado' using errcode = '42501'; end if;
  if p_tipo not in ('amigo', 'pareja_juego', 'rival') then raise exception 'Tipo de relación inválido' using errcode = '22023'; end if;
  perform public._social_asegurar_perfil(uid);
  select user_id into otro from public.social_perfiles where codigo = lower(trim(p_codigo));
  if otro is null then raise exception 'Ese código no existe' using errcode = '22023'; end if;
  if otro = uid then raise exception 'Ese código es el tuyo' using errcode = '22023'; end if;
  select * into r from public.social_relaciones where least(user_a, user_b) = least(uid, otro) and greatest(user_a, user_b) = greatest(uid, otro) for update;
  if r.id is not null and r.estado = 'activa' then raise exception 'Ya están conectados' using errcode = '22023'; end if;
  if r.id is not null and r.estado = 'pendiente' and r.user_b = uid then
    update public.social_relaciones set estado = 'activa', verificada = verificada or p_qr where id = r.id;
    nuevo := r.id;
  elsif r.id is not null then
    update public.social_relaciones set user_a = uid, user_b = otro, tipo = p_tipo, etiqueta = nullif(trim(p_etiqueta), ''), estado = 'pendiente', verificada = p_qr, deleted_at = null where id = r.id;
    nuevo := r.id;
  else
    insert into public.social_relaciones (user_a, user_b, tipo, etiqueta, verificada) values (uid, otro, p_tipo, nullif(trim(p_etiqueta), ''), p_qr) returning id into nuevo;
  end if;
  return nuevo;
end;
$$;

create or replace function public.relacion_responder(p_id uuid, p_aceptar boolean)
returns void
language plpgsql volatile security definer
set search_path = ''
as $$
declare uid uuid := (select auth.uid()); r record; na text; nb text;
begin
  if uid is null then raise exception 'no autorizado' using errcode = '42501'; end if;
  select * into r from public.social_relaciones where id = p_id and user_b = uid and estado = 'pendiente' for update;
  if r.id is null then raise exception 'La solicitud ya no está' using errcode = '22023'; end if;
  perform public._social_asegurar_perfil(uid);
  update public.social_relaciones set estado = case when p_aceptar then 'activa' else 'rechazada' end where id = p_id;
  if p_aceptar then
    select nombre into na from public.social_perfiles where user_id = r.user_a;
    select nombre into nb from public.social_perfiles where user_id = r.user_b;
    insert into public.social_eventos (actor, participantes, tipo, texto, ref)
    values (uid, array[r.user_a, r.user_b], 'relacion', left(coalesce(nb, 'Alguien') || ' y ' || coalesce(na, 'alguien') || ' ya están conectados', 160), p_id);
  end if;
end;
$$;

create or replace function public.relacion_terminar(p_id uuid)
returns void
language plpgsql volatile security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'no autorizado' using errcode = '42501'; end if;
  update public.social_relaciones set estado = 'terminada' where id = p_id and (select auth.uid()) in (user_a, user_b) and estado in ('pendiente', 'activa');
end;
$$;

/** Cambiar cómo llamo la relación — solo quien la propuso; la otra persona lo ve desde su lado */
create or replace function public.relacion_editar(p_id uuid, p_tipo text, p_etiqueta text default null)
returns void
language plpgsql volatile security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'no autorizado' using errcode = '42501'; end if;
  if p_tipo not in ('amigo', 'pareja_juego', 'rival') then raise exception 'Tipo de relación inválido' using errcode = '22023'; end if;
  update public.social_relaciones set tipo = p_tipo, etiqueta = nullif(trim(p_etiqueta), '') where id = p_id and user_a = (select auth.uid()) and estado in ('pendiente', 'activa');
end;
$$;

-- ───────── Gestos ─────────
create or replace function public.social_saludar(p_relacion uuid, p_gesto text)
returns uuid
language plpgsql volatile security definer
set search_path = ''
as $$
declare uid uuid := (select auth.uid()); r record; otro uuid; yo text; el text; frase text; nuevo uuid;
begin
  if uid is null then raise exception 'no autorizado' using errcode = '42501'; end if;
  select * into r from public.social_relaciones where id = p_relacion and uid in (user_a, user_b) and estado = 'activa' and deleted_at is null;
  if r.id is null then raise exception 'Solo con tu gente conectada' using errcode = '42501'; end if;
  otro := case when r.user_a = uid then r.user_b else r.user_a end;
  frase := case p_gesto
    when 'jugamos' then '🎾 ¿Jugamos?' when 'nivel' then '🔥 Qué nivel' when 'fuerza' then '💪 Fuerza'
    when 'gracias' then '🙏 Gracias' when 'crack' then '🏆 ¡Crack!' when 'pola' then '🍻 Una pola' end;
  if frase is null then raise exception 'Gesto desconocido' using errcode = '22023'; end if;
  -- Sin cadenas de spam: el mismo gesto a la misma persona, máximo uno cada 30 minutos
  if exists (select 1 from public.social_eventos where actor = uid and tipo = 'saludo' and gesto = p_gesto and ref = p_relacion and created_at > now() - interval '30 minutes') then
    raise exception 'Ya se lo mandaste hace un ratico' using errcode = '22023';
  end if;
  select nombre into yo from public.social_perfiles where user_id = uid;
  select nombre into el from public.social_perfiles where user_id = otro;
  insert into public.social_eventos (actor, participantes, tipo, texto, ref, gesto)
  values (uid, array[uid, otro], 'saludo', left(coalesce(yo, 'Alguien') || ' le mandó ' || frase || ' a ' || coalesce(el, 'alguien'), 160), p_relacion, p_gesto)
  returning id into nuevo;
  return nuevo;
end;
$$;

create or replace function public.social_reaccionar(p_evento uuid, p_reaccion text)
returns void
language plpgsql volatile security definer
set search_path = ''
as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'no autorizado' using errcode = '42501'; end if;
  if not exists (select 1 from public.social_eventos where id = p_evento and uid = any (participantes)) then raise exception 'no autorizado' using errcode = '42501'; end if;
  if p_reaccion is null then
    update public.social_reacciones set deleted_at = now() where evento_id = p_evento and user_id = uid;
  else
    insert into public.social_reacciones (evento_id, user_id, reaccion) values (p_evento, uid, p_reaccion)
    on conflict (evento_id, user_id) do update set reaccion = excluded.reaccion, deleted_at = null;
  end if;
end;
$$;

-- ───────── Publicaciones ─────────
/** Publicar para mi gente: fotos ya subidas a <yo>/<id>/ y, si es un resultado, el marcador. Crea su evento del feed. */
create or replace function public.publicacion_crear(p_id uuid, p_tipo text, p_texto text, p_fotos jsonb, p_marcador jsonb, p_con uuid[], p_club text, p_ciudad text)
returns uuid
language plpgsql volatile security definer
set search_path = ''
as $$
declare uid uuid := (select auth.uid()); aud uuid[]; yo text; f jsonb; c uuid;
begin
  if uid is null then raise exception 'no autorizado' using errcode = '42501'; end if;
  if p_tipo not in ('foto', 'resultado_partido') then raise exception 'Tipo inválido' using errcode = '22023'; end if;
  for f in select * from jsonb_array_elements(coalesce(p_fotos, '[]')) loop
    if (f ->> 'path') is null or (f ->> 'path') !~ ('^' || uid::text || '/' || p_id::text || '/[0-9]{1,2}\.jpg$') then raise exception 'Foto inválida' using errcode = '22023'; end if;
  end loop;
  foreach c in array coalesce(p_con, '{}') loop
    if c <> uid and not public.tengo_relacion_con(c, true) then raise exception 'Solo puedes etiquetar a tu gente' using errcode = '42501'; end if;
  end loop;
  -- Audiencia: mi gente conectada en este momento (sin bloqueos)
  select coalesce(array_agg(x), '{}') into aud from (
    select case when r.user_a = uid then r.user_b else r.user_a end as x
    from public.social_relaciones r where uid in (r.user_a, r.user_b) and r.estado = 'activa' and r.deleted_at is null
  ) g where not public.hay_bloqueo(uid, x);
  insert into public.social_publicaciones (id, autor, tipo, texto, fotos, marcador, con, audiencia, club, ciudad)
  values (p_id, uid, p_tipo, nullif(trim(p_texto), ''), coalesce(p_fotos, '[]'), p_marcador, coalesce(p_con, '{}'), aud, left(nullif(trim(p_club), ''), 60), left(nullif(trim(p_ciudad), ''), 40));
  select nombre into yo from public.social_perfiles where user_id = uid;
  insert into public.social_eventos (actor, participantes, tipo, texto, ref)
  values (uid, array_append(aud, uid), p_tipo, left(coalesce(yo, 'Alguien') || case when p_tipo = 'foto' then ' subió una foto' else ' publicó un resultado' end, 160), p_id);
  return p_id;
end;
$$;

create or replace function public.publicacion_borrar(p_id uuid)
returns void
language plpgsql volatile security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'no autorizado' using errcode = '42501'; end if;
  update public.social_publicaciones set deleted_at = now() where id = p_id and autor = (select auth.uid());
  update public.social_eventos set deleted_at = now() where ref = p_id and actor = (select auth.uid()) and tipo in ('foto', 'resultado_partido');
end;
$$;

create or replace function public.publicacion_comentar(p_publicacion uuid, p_texto text)
returns uuid
language plpgsql volatile security definer
set search_path = ''
as $$
declare uid uuid := (select auth.uid()); t text := trim(coalesce(p_texto, '')); nuevo uuid;
begin
  if uid is null then raise exception 'no autorizado' using errcode = '42501'; end if;
  if char_length(t) = 0 or char_length(t) > 300 then raise exception 'Comentario vacío o muy largo' using errcode = '22023'; end if;
  if not public.veo_publicacion(p_publicacion) then raise exception 'no autorizado' using errcode = '42501'; end if;
  insert into public.social_comentarios (publicacion_id, autor, texto) values (p_publicacion, uid, t) returning id into nuevo;
  return nuevo;
end;
$$;

/** Borrar un comentario: el mío, o cualquiera de una publicación mía */
create or replace function public.publicacion_borrar_comentario(p_id uuid)
returns void
language plpgsql volatile security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'no autorizado' using errcode = '42501'; end if;
  update public.social_comentarios c set deleted_at = now()
  where c.id = p_id and (c.autor = (select auth.uid()) or exists (select 1 from public.social_publicaciones p where p.id = c.publicacion_id and p.autor = (select auth.uid())));
end;
$$;

-- ───────── Cobros ─────────
/** Crear cobros (p. ej. la parte de la cancha de cada uno): cada deudor, con relación activa, lo ve en su app */
create or replace function public.cobro_crear(p_deudores uuid[], p_montos integer[], p_concepto text, p_partido uuid default null)
returns uuid
language plpgsql volatile security definer
set search_path = ''
as $$
declare uid uuid := (select auth.uid()); g uuid := gen_random_uuid(); i int; yo text;
begin
  if uid is null then raise exception 'no autorizado' using errcode = '42501'; end if;
  if coalesce(array_length(p_deudores, 1), 0) = 0 or array_length(p_deudores, 1) <> array_length(p_montos, 1) then raise exception 'Datos inválidos' using errcode = '22023'; end if;
  if array_length(p_deudores, 1) > 30 then raise exception 'Máximo 30 personas' using errcode = '22023'; end if;
  for i in 1..array_length(p_deudores, 1) loop
    if not public.tengo_relacion_con(p_deudores[i], true) then raise exception 'Solo puedes cobrarle a tu gente conectada' using errcode = '42501'; end if;
    insert into public.social_cobros (acreedor, deudor, monto, concepto, grupo, partido_id) values (uid, p_deudores[i], p_montos[i], left(trim(p_concepto), 80), g, p_partido);
  end loop;
  select nombre into yo from public.social_perfiles where user_id = uid;
  insert into public.social_eventos (actor, participantes, tipo, texto, ref)
  values (uid, array_append(p_deudores, uid), 'cobro', left(coalesce(yo, 'Alguien') || ' dividió "' || left(trim(p_concepto), 60) || '"', 160), g);
  return g;
end;
$$;

/** El deudor avisa que pagó (o dice que no es suyo); el acreedor confirma o cancela */
create or replace function public.cobro_accion(p_id uuid, p_accion text)
returns text
language plpgsql volatile security definer
set search_path = ''
as $$
declare uid uuid := (select auth.uid()); c record; quien text; otro text;
begin
  if uid is null then raise exception 'no autorizado' using errcode = '42501'; end if;
  select * into c from public.social_cobros where id = p_id and deleted_at is null for update;
  if c.id is null then raise exception 'Ese cobro ya no está' using errcode = '22023'; end if;
  if p_accion = 'pague' and c.deudor = uid and c.estado = 'pendiente' then
    update public.social_cobros set estado = 'avisado' where id = p_id;
  elsif p_accion = 'no_es_mio' and c.deudor = uid and c.estado in ('pendiente', 'avisado') then
    update public.social_cobros set estado = 'rechazado' where id = p_id;
  elsif p_accion = 'recibido' and c.acreedor = uid and c.estado in ('pendiente', 'avisado') then
    update public.social_cobros set estado = 'pagado', pagado_en = now() where id = p_id;
    select nombre into quien from public.social_perfiles where user_id = c.deudor;
    select nombre into otro from public.social_perfiles where user_id = c.acreedor;
    insert into public.social_eventos (actor, participantes, tipo, texto, ref)
    values (uid, array[c.acreedor, c.deudor], 'pago', left(coalesce(quien, 'Alguien') || ' le pagó a ' || coalesce(otro, 'alguien') || ' lo de "' || left(c.concepto, 60) || '"', 160), p_id);
  elsif p_accion = 'cancelar' and c.acreedor = uid and c.estado in ('pendiente', 'avisado', 'rechazado') then
    update public.social_cobros set estado = 'cancelado' where id = p_id;
  else
    raise exception 'No se puede hacer eso con este cobro' using errcode = '22023';
  end if;
  return (select estado from public.social_cobros where id = p_id);
end;
$$;

-- ───────── Bloquear y reportar ─────────
/** Bloquear: termina la relación, cancela lo pendiente entre los dos y deja de compartir publicaciones */
create or replace function public.social_bloquear(p_otro uuid)
returns void
language plpgsql volatile security definer
set search_path = ''
as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'no autorizado' using errcode = '42501'; end if;
  if p_otro is null or p_otro = uid then raise exception 'Datos inválidos' using errcode = '22023'; end if;
  insert into public.social_bloqueos (user_id, bloqueado) values (uid, p_otro)
  on conflict (user_id, bloqueado) do update set deleted_at = null;
  update public.social_relaciones set estado = 'terminada'
  where least(user_a, user_b) = least(uid, p_otro) and greatest(user_a, user_b) = greatest(uid, p_otro) and estado in ('pendiente', 'activa');
  update public.social_cobros set estado = 'cancelado'
  where estado in ('pendiente', 'avisado') and ((acreedor = uid and deudor = p_otro) or (acreedor = p_otro and deudor = uid));
  update public.social_publicaciones set audiencia = array_remove(audiencia, p_otro), con = array_remove(con, p_otro) where autor = uid;
  update public.social_publicaciones set audiencia = array_remove(audiencia, uid), con = array_remove(con, uid) where autor = p_otro;
end;
$$;

create or replace function public.social_desbloquear(p_otro uuid)
returns void
language plpgsql volatile security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'no autorizado' using errcode = '42501'; end if;
  update public.social_bloqueos set deleted_at = now() where user_id = (select auth.uid()) and bloqueado = p_otro;
end;
$$;

/** Reportar una publicación, un comentario, un mensaje o a una persona (solo lo que puedo ver) */
create or replace function public.social_reportar(p_tipo text, p_ref uuid, p_motivo text, p_detalle text)
returns uuid
language plpgsql volatile security definer
set search_path = ''
as $$
declare uid uuid := (select auth.uid()); quien uuid; nuevo uuid;
begin
  if uid is null then raise exception 'no autorizado' using errcode = '42501'; end if;
  if p_tipo = 'publicacion' then
    if not public.veo_publicacion(p_ref) then raise exception 'no autorizado' using errcode = '42501'; end if;
    select autor into quien from public.social_publicaciones where id = p_ref;
  elsif p_tipo = 'comentario' then
    select c.autor into quien from public.social_comentarios c where c.id = p_ref and public.veo_publicacion(c.publicacion_id);
  elsif p_tipo = 'mensaje' then
    -- social_mensajes llega en *_social_chat.sql; se consulta dinámico para no depender del orden
    execute 'select m.autor from public.social_mensajes m join public.social_relaciones r on r.id = m.relacion_id where m.id = $1 and $2 in (r.user_a, r.user_b)'
      into quien using p_ref, uid;
  elsif p_tipo = 'persona' then
    if exists (select 1 from public.social_perfiles where user_id = p_ref) then quien := p_ref; end if;
  else
    raise exception 'Datos inválidos' using errcode = '22023';
  end if;
  if quien is null then raise exception 'no autorizado' using errcode = '42501'; end if;
  if quien = uid then raise exception 'No puedes reportarte a ti' using errcode = '22023'; end if;
  if exists (select 1 from public.social_reportes where reporta = uid and tipo = p_tipo and ref = p_ref and estado = 'abierto') then
    raise exception 'Ya lo reportaste: lo estamos revisando' using errcode = '22023';
  end if;
  insert into public.social_reportes (reporta, tipo, ref, acusado, motivo, detalle)
  values (uid, p_tipo, p_ref, quien, p_motivo, nullif(trim(coalesce(p_detalle, '')), ''))
  returning id into nuevo;
  return nuevo;
end;
$$;

-- ───────── Ranking (solo el servidor: torneos y partidos verificados) ─────────
/** Pone los puntos de un jugador; si suben, su gente lo ve en el feed ("subio_ranking"). Solo service_role. */
create or replace function public.social_ranking_actualizar(p_user uuid, p_puntos integer)
returns void
language plpgsql volatile security definer
set search_path = ''
as $$
declare antes integer; nom text; gente uuid[];
begin
  select puntos_ranking, nombre into antes, nom from public.social_perfiles where user_id = p_user for update;
  if antes is null then raise exception 'Ese jugador no existe' using errcode = '22023'; end if;
  update public.social_perfiles set puntos_ranking = greatest(0, p_puntos) where user_id = p_user;
  if p_puntos > antes then
    select coalesce(array_agg(case when r.user_a = p_user then r.user_b else r.user_a end), '{}') into gente
    from public.social_relaciones r where p_user in (r.user_a, r.user_b) and r.estado = 'activa' and r.deleted_at is null;
    insert into public.social_eventos (actor, participantes, tipo, texto, ref)
    values (p_user, array_append(gente, p_user), 'subio_ranking', left(nom || ' subió a ' || to_char(p_puntos, 'FM999G999G999') || ' pts en el ranking 📈', 160), null);
  end if;
end;
$$;

-- ───────── Fotos: bucket privado "social" (publicaciones en <autor>/<publicación>/, perfil en <yo>/perfil/) ─────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('social', 'social', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists social_fotos_ver on storage.objects;
drop policy if exists social_fotos_subir on storage.objects;
drop policy if exists social_fotos_borrar on storage.objects;
-- Ver: lo mío, la foto de una publicación que puedo ver (carpeta 2 = id) o la foto de perfil de alguien de mi gente
create policy social_fotos_ver on storage.objects for select to authenticated
  using (bucket_id = 'social' and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (
      (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      and public.veo_publicacion(((storage.foldername(name))[2])::uuid)
    )
    or (
      (storage.foldername(name))[2] = 'perfil'
      and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      and public.tengo_relacion_con(((storage.foldername(name))[1])::uuid)
    )
  ));
create policy social_fotos_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'social' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy social_fotos_borrar on storage.objects for delete to authenticated
  using (bucket_id = 'social' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ───────── Permisos de las funciones ─────────
do $$
declare f text;
begin
  foreach f in array array[
    'social_yo(text, text)', 'social_ver(text)', 'social_imagen(text, text)', 'social_padel(smallint, text, text)',
    'social_usuario(text)', 'social_buscable(boolean)', 'social_aceptar_terminos()', 'social_buscar(text)', 'social_sugerencias()',
    'relacion_proponer(text, text, text, boolean)', 'relacion_responder(uuid, boolean)', 'relacion_terminar(uuid)', 'relacion_editar(uuid, text, text)',
    'social_saludar(uuid, text)', 'social_reaccionar(uuid, text)',
    'publicacion_crear(uuid, text, text, jsonb, jsonb, uuid[], text, text)', 'publicacion_borrar(uuid)', 'publicacion_comentar(uuid, text)', 'publicacion_borrar_comentario(uuid)',
    'cobro_crear(uuid[], integer[], text, uuid)', 'cobro_accion(uuid, text)',
    'social_bloquear(uuid)', 'social_desbloquear(uuid)', 'social_reportar(text, uuid, text, text)',
    'tengo_relacion_con(uuid, boolean)', 'veo_publicacion(uuid)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
revoke execute on function public._social_codigo() from public, anon, authenticated;
revoke execute on function public._social_usuario_libre(text, uuid) from public, anon, authenticated;
revoke execute on function public._social_asegurar_perfil(uuid) from public, anon, authenticated;
revoke execute on function public.hay_bloqueo(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.social_ranking_actualizar(uuid, integer) from public, anon, authenticated;
grant execute on function public.social_ranking_actualizar(uuid, integer) to service_role;
