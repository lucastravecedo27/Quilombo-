-- Jugar: invitar a jugar (partidos/citas), canchas disponibles por ciudad, apartar, pagar y torneos.
-- Clubes, canchas y torneos son catálogo (los ve cualquier usuario); las franjas (horas de cancha) se piden por
-- ciudad y día con jugar_disponibles(); los partidos los ven quien los armó y sus invitados.

-- ───────── Catálogo: clubes y canchas ─────────
create table if not exists public.social_clubes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(nombre) between 2 and 60),
  ciudad text not null check (char_length(ciudad) between 2 and 40),
  zona text,
  direccion text,
  lat numeric(9, 6),
  lng numeric(9, 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists social_clubes_ciudad on public.social_clubes (ciudad);
create trigger sync before insert or update on public.social_clubes for each row execute function public.tg_social_sync();

create table if not exists public.social_canchas (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.social_clubes on delete cascade,
  nombre text not null check (char_length(nombre) between 1 and 40),
  techada boolean not null default false,
  tipo text not null default 'cristal' check (tipo in ('cristal', 'muro')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists social_canchas_club on public.social_canchas (club_id);
create trigger sync before insert or update on public.social_canchas for each row execute function public.tg_social_sync();

-- ───────── Partidos (la cita) y respuestas ─────────
create table if not exists public.social_partidos (
  id uuid primary key default gen_random_uuid(),
  creador uuid not null references auth.users on delete cascade,
  cuando timestamptz not null,
  ciudad text not null check (char_length(ciudad) between 2 and 40),
  club_id uuid references public.social_clubes on delete set null,
  franja_id uuid, -- llave foránea abajo (franjas ↔ partidos se referencian entre sí)
  invitados uuid[] not null check (cardinality(invitados) between 1 and 11),
  cupos smallint not null default 4 check (cupos between 2 and 12),
  nota text check (nota is null or char_length(nota) <= 80),
  estado text not null default 'abierto' check (estado in ('abierto', 'confirmado', 'jugado', 'cancelado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists social_partidos_inv on public.social_partidos using gin (invitados);
create index if not exists social_partidos_upd on public.social_partidos (updated_at);
create trigger sync before insert or update on public.social_partidos for each row execute function public.tg_social_sync();

create table if not exists public.social_partido_respuestas (
  id uuid primary key default gen_random_uuid(),
  partido_id uuid not null references public.social_partidos on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  respuesta text not null check (respuesta in ('voy', 'quizas', 'no')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (partido_id, user_id)
);
create trigger sync before insert or update on public.social_partido_respuestas for each row execute function public.tg_social_sync();

-- ───────── Franjas: una hora (o 90 min) de una cancha. libre → apartada (con plazo) → pagada ─────────
create table if not exists public.social_franjas (
  id uuid primary key default gen_random_uuid(),
  cancha_id uuid not null references public.social_canchas on delete cascade,
  inicio timestamptz not null,
  fin timestamptz not null,
  precio integer not null check (precio >= 0), -- pesos colombianos por la cancha
  estado text not null default 'libre' check (estado in ('libre', 'apartada', 'pagada')),
  partido_id uuid references public.social_partidos on delete set null,
  apartada_hasta timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (fin > inicio),
  unique (cancha_id, inicio)
);
create index if not exists social_franjas_inicio on public.social_franjas (inicio);
create trigger sync before insert or update on public.social_franjas for each row execute function public.tg_social_sync();
alter table public.social_partidos add constraint social_partidos_franja_fk foreign key (franja_id) references public.social_franjas on delete set null;
alter table public.social_cobros add constraint social_cobros_partido_fk foreign key (partido_id) references public.social_partidos on delete set null;

-- ───────── Pagos de cancha (pasarela pendiente: Wompi/PSE) ─────────
create table if not exists public.social_pagos (
  id uuid primary key default gen_random_uuid(),
  partido_id uuid not null references public.social_partidos on delete cascade,
  franja_id uuid not null references public.social_franjas on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  monto integer not null check (monto > 0),
  referencia text not null unique,
  proveedor text, -- 'wompi' cuando se conecte la pasarela
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aprobado', 'rechazado', 'en_club')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger sync before insert or update on public.social_pagos for each row execute function public.tg_social_sync();

-- ───────── Torneos e inscripciones ─────────
create table if not exists public.social_torneos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(nombre) between 3 and 80),
  ciudad text not null,
  club_id uuid references public.social_clubes on delete set null,
  inicio timestamptz not null,
  fin timestamptz not null,
  cierre timestamptz not null, -- último momento para inscribirse
  categorias smallint[] not null default '{}',
  cupos integer not null check (cupos > 0),
  inscritos integer not null default 0 check (inscritos >= 0),
  precio integer not null default 0 check (precio >= 0), -- por pareja
  estado text not null default 'inscripciones' check (estado in ('inscripciones', 'en_juego', 'terminado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create trigger sync before insert or update on public.social_torneos for each row execute function public.tg_social_sync();

create table if not exists public.social_inscripciones (
  id uuid primary key default gen_random_uuid(),
  torneo_id uuid not null references public.social_torneos on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  pareja uuid references auth.users on delete set null,
  categoria smallint not null check (categoria between 1 and 6),
  estado text not null default 'inscrito' check (estado in ('inscrito', 'pendiente_pago', 'cancelada')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (torneo_id, user_id)
);
create trigger sync before insert or update on public.social_inscripciones for each row execute function public.tg_social_sync();

-- ───────── Quién ve qué ─────────
create or replace function public.veo_partido(p_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.social_partidos p where p.id = p_id and ((select auth.uid()) = p.creador or (select auth.uid()) = any (p.invitados)));
$$;

alter table public.social_clubes enable row level security; alter table public.social_clubes force row level security;
alter table public.social_canchas enable row level security; alter table public.social_canchas force row level security;
alter table public.social_franjas enable row level security; alter table public.social_franjas force row level security;
alter table public.social_partidos enable row level security; alter table public.social_partidos force row level security;
alter table public.social_partido_respuestas enable row level security; alter table public.social_partido_respuestas force row level security;
alter table public.social_pagos enable row level security; alter table public.social_pagos force row level security;
alter table public.social_torneos enable row level security; alter table public.social_torneos force row level security;
alter table public.social_inscripciones enable row level security; alter table public.social_inscripciones force row level security;

create policy social_clubes_ver on public.social_clubes for select to authenticated using (true);
create policy social_canchas_ver on public.social_canchas for select to authenticated using (true);
create policy social_torneos_ver on public.social_torneos for select to authenticated using (true);
-- Franjas: solo las de mis partidos por consulta directa; las libres se piden con jugar_disponibles()
create policy social_franjas_ver on public.social_franjas for select to authenticated using (partido_id is not null and public.veo_partido(partido_id));
create policy social_partidos_ver on public.social_partidos for select to authenticated using (public.veo_partido(id));
create policy social_respuestas_ver on public.social_partido_respuestas for select to authenticated using (public.veo_partido(partido_id));
create policy social_pagos_ver on public.social_pagos for select to authenticated using (user_id = (select auth.uid()));
create policy social_inscripciones_ver on public.social_inscripciones for select to authenticated using ((select auth.uid()) in (user_id, pareja));
-- Perfiles: también el de quienes juegan un partido conmigo aunque no seamos gente conectada
create policy social_perfiles_partido on public.social_perfiles for select to authenticated
  using (exists (select 1 from public.social_partidos p
    where ((select auth.uid()) = p.creador or (select auth.uid()) = any (p.invitados))
      and (user_id = p.creador or user_id = any (p.invitados))));

revoke all on public.social_clubes, public.social_canchas, public.social_franjas, public.social_partidos, public.social_partido_respuestas,
  public.social_pagos, public.social_torneos, public.social_inscripciones from anon;
revoke insert, update, delete, truncate, trigger, references on public.social_clubes, public.social_canchas, public.social_franjas, public.social_partidos,
  public.social_partido_respuestas, public.social_pagos, public.social_torneos, public.social_inscripciones from authenticated;
grant select on public.social_clubes, public.social_canchas, public.social_franjas, public.social_partidos, public.social_partido_respuestas,
  public.social_pagos, public.social_torneos, public.social_inscripciones to authenticated;

-- ───────── Funciones ─────────
/** Libera las franjas apartadas cuyo plazo para pagar ya venció (se llama antes de consultar o apartar) */
create or replace function public._liberar_franjas_vencidas()
returns void
language sql volatile security definer
set search_path = ''
as $$
  update public.social_franjas set estado = 'libre', partido_id = null, apartada_hasta = null
  where estado = 'apartada' and apartada_hasta is not null and apartada_hasta < now();
$$;

/** Canchas libres de una ciudad un día (hora de Colombia) y, además, las franjas de mis partidos */
create or replace function public.jugar_disponibles(p_ciudad text, p_dia date)
returns setof public.social_franjas
language plpgsql volatile security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'no autorizado' using errcode = '42501'; end if;
  perform public._liberar_franjas_vencidas();
  return query
  select f.* from public.social_franjas f
  join public.social_canchas c on c.id = f.cancha_id and c.deleted_at is null
  join public.social_clubes cl on cl.id = c.club_id and cl.deleted_at is null
  where f.deleted_at is null and f.estado = 'libre' and cl.ciudad = p_ciudad
    and (f.inicio at time zone 'America/Bogota')::date = p_dia and f.inicio > now()
  union
  select f.* from public.social_franjas f where f.partido_id is not null and public.veo_partido(f.partido_id)
  order by 3
  limit 300;
end;
$$;

/** Aparta una franja libre para un partido (lo puede hacer quien lo armó o un invitado que va). Plazo para pagar: 2 h. */
create or replace function public.franja_apartar(p_franja uuid, p_partido uuid)
returns void
language plpgsql volatile security definer
set search_path = ''
as $$
declare uid uuid := (select auth.uid()); p record; f record; club uuid;
begin
  if uid is null then raise exception 'no autorizado' using errcode = '42501'; end if;
  select * into p from public.social_partidos where id = p_partido and estado in ('abierto', 'confirmado') for update;
  if p.id is null or not (uid = p.creador or uid = any (p.invitados)) then raise exception 'no autorizado' using errcode = '42501'; end if;
  if p.franja_id is not null then raise exception 'Este partido ya tiene cancha' using errcode = '22023'; end if;
  perform public._liberar_franjas_vencidas();
  select * into f from public.social_franjas where id = p_franja and deleted_at is null for update;
  if f.id is null or f.estado <> 'libre' or f.inicio < now() then raise exception 'Esa cancha ya la apartaron. Elige otra hora.' using errcode = '22023'; end if;
  select c.club_id into club from public.social_canchas c where c.id = f.cancha_id;
  update public.social_franjas set estado = 'apartada', partido_id = p_partido, apartada_hasta = least(f.inicio, now() + interval '2 hours') where id = p_franja;
  update public.social_partidos set franja_id = p_franja, club_id = club, cuando = f.inicio where id = p_partido;
end;
$$;

/** Invitar a jugar: crea el partido (y aparta la franja si viene), el creador va de una, y los invitados lo ven */
create or replace function public.partido_crear(p_cuando timestamptz, p_ciudad text, p_invitados uuid[], p_cupos smallint default 4, p_nota text default null, p_franja uuid default null)
returns uuid
language plpgsql volatile security definer
set search_path = ''
as $$
declare uid uuid := (select auth.uid()); nuevo uuid; i uuid; yo text; donde text;
begin
  if uid is null then raise exception 'no autorizado' using errcode = '42501'; end if;
  if coalesce(cardinality(p_invitados), 0) = 0 then raise exception 'Invita al menos a una persona' using errcode = '22023'; end if;
  if p_cuando < now() - interval '1 hour' then raise exception 'Esa hora ya pasó' using errcode = '22023'; end if;
  foreach i in array p_invitados loop
    if i = uid or not public.tengo_relacion_con(i, true) then raise exception 'Solo puedes invitar a tu gente conectada' using errcode = '42501'; end if;
  end loop;
  insert into public.social_partidos (creador, cuando, ciudad, invitados, cupos, nota)
  values (uid, p_cuando, left(trim(p_ciudad), 40), (select array_agg(distinct x) from unnest(p_invitados) x), coalesce(p_cupos, 4), nullif(trim(p_nota), ''))
  returning id into nuevo;
  insert into public.social_partido_respuestas (partido_id, user_id, respuesta) values (nuevo, uid, 'voy');
  if p_franja is not null then perform public.franja_apartar(p_franja, nuevo); end if;
  select nombre into yo from public.social_perfiles where user_id = uid;
  select coalesce(' en ' || cl.nombre, '') into donde from public.social_partidos p left join public.social_clubes cl on cl.id = p.club_id where p.id = nuevo;
  insert into public.social_eventos (actor, participantes, tipo, texto, ref)
  values (uid, array_append(p_invitados, uid), 'partido', left(coalesce(yo, 'Alguien') || ' armó partido' || coalesce(donde, ''), 160), nuevo);
  return nuevo;
end;
$$;

create or replace function public.partido_responder(p_partido uuid, p_respuesta text)
returns void
language plpgsql volatile security definer
set search_path = ''
as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'no autorizado' using errcode = '42501'; end if;
  if p_respuesta not in ('voy', 'quizas', 'no') then raise exception 'Datos inválidos' using errcode = '22023'; end if;
  if not exists (select 1 from public.social_partidos where id = p_partido and uid = any (invitados) and estado in ('abierto', 'confirmado')) then
    raise exception 'Ese partido ya no está abierto' using errcode = '22023';
  end if;
  insert into public.social_partido_respuestas (partido_id, user_id, respuesta) values (p_partido, uid, p_respuesta)
  on conflict (partido_id, user_id) do update set respuesta = excluded.respuesta, deleted_at = null;
end;
$$;

/** Cancelar (solo quien lo armó): la cancha apartada vuelve a quedar libre; una pagada la resuelve el club */
create or replace function public.partido_cancelar(p_partido uuid)
returns void
language plpgsql volatile security definer
set search_path = ''
as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'no autorizado' using errcode = '42501'; end if;
  update public.social_partidos set estado = 'cancelado' where id = p_partido and creador = uid and estado in ('abierto', 'confirmado');
  if not found then raise exception 'Solo quien armó el partido puede cancelarlo' using errcode = '42501'; end if;
  update public.social_franjas set estado = 'libre', partido_id = null, apartada_hasta = null where partido_id = p_partido and estado = 'apartada';
end;
$$;

/**
 * Pagar la cancha de un partido. Registra el pago (referencia única) y devuelve la URL de checkout de la pasarela
 * cuando esté configurada. PENDIENTE: integrar Wompi (firma de integridad con la llave secreta del comercio, en una
 * Edge Function) y su webhook para pasar el pago a 'aprobado' y la franja a 'pagada'. Mientras tanto devuelve url = null.
 */
create or replace function public.pago_crear(p_partido uuid)
returns table (referencia text, monto integer, url text)
language plpgsql volatile security definer
set search_path = ''
as $$
declare uid uuid := (select auth.uid()); p record; f record; ref text;
begin
  if uid is null then raise exception 'no autorizado' using errcode = '42501'; end if;
  select * into p from public.social_partidos where id = p_partido and (uid = creador or uid = any (invitados));
  if p.id is null then raise exception 'no autorizado' using errcode = '42501'; end if;
  select * into f from public.social_franjas where id = p.franja_id;
  if f.id is null then raise exception 'Primero aparta una cancha' using errcode = '22023'; end if;
  if f.estado = 'pagada' then raise exception 'Esta cancha ya está pagada' using errcode = '22023'; end if;
  ref := 'Q-' || replace(gen_random_uuid()::text, '-', '');
  insert into public.social_pagos (partido_id, franja_id, user_id, monto, referencia, estado) values (p.id, f.id, uid, f.precio, ref, 'pendiente');
  -- Sin pasarela: el plazo del apartado se extiende hasta la hora del partido (se paga en el club)
  update public.social_franjas set apartada_hasta = f.inicio where id = f.id and estado = 'apartada';
  return query select ref, f.precio, null::text;
end;
$$;

/** Inscribirme a un torneo (con mi pareja si la tengo). Valida cierre, cupos y categoría. */
create or replace function public.torneo_inscribirse(p_torneo uuid, p_categoria smallint, p_pareja uuid default null)
returns uuid
language plpgsql volatile security definer
set search_path = ''
as $$
declare uid uuid := (select auth.uid()); t record; nuevo uuid; yo text; el text;
begin
  if uid is null then raise exception 'no autorizado' using errcode = '42501'; end if;
  select * into t from public.social_torneos where id = p_torneo and deleted_at is null for update;
  if t.id is null then raise exception 'Ese torneo ya no está' using errcode = '22023'; end if;
  if t.estado <> 'inscripciones' or t.cierre < now() then raise exception 'Inscripciones cerradas' using errcode = '22023'; end if;
  if t.inscritos >= t.cupos then raise exception 'Sin cupos' using errcode = '22023'; end if;
  if cardinality(t.categorias) > 0 and not (p_categoria = any (t.categorias)) then raise exception 'Esa categoría no juega en este torneo' using errcode = '22023'; end if;
  if p_pareja is not null and (p_pareja = uid or not public.tengo_relacion_con(p_pareja, true)) then raise exception 'Tu pareja debe ser de tu gente' using errcode = '42501'; end if;
  if exists (select 1 from public.social_inscripciones i where i.torneo_id = p_torneo and i.estado <> 'cancelada' and (uid in (i.user_id, i.pareja) or (p_pareja is not null and p_pareja in (i.user_id, i.pareja)))) then
    raise exception 'Ya estás inscrito' using errcode = '22023';
  end if;
  insert into public.social_inscripciones (torneo_id, user_id, pareja, categoria, estado)
  values (p_torneo, uid, p_pareja, p_categoria, case when t.precio > 0 then 'pendiente_pago' else 'inscrito' end)
  returning id into nuevo;
  update public.social_torneos set inscritos = inscritos + 1 where id = p_torneo;
  select nombre into yo from public.social_perfiles where user_id = uid;
  select nombre into el from public.social_perfiles where user_id = p_pareja;
  insert into public.social_eventos (actor, participantes, tipo, texto, ref)
  values (uid, case when p_pareja is null then array[uid] else array[uid, p_pareja] end, 'torneo',
    left(coalesce(yo, 'Alguien') || coalesce(' y ' || el, '') || ' se inscribió en ' || t.nombre || ' (' || p_categoria || 'ª)', 160), p_torneo);
  return nuevo;
end;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'veo_partido(uuid)', 'jugar_disponibles(text, date)', 'franja_apartar(uuid, uuid)',
    'partido_crear(timestamptz, text, uuid[], smallint, text, uuid)', 'partido_responder(uuid, text)', 'partido_cancelar(uuid)',
    'pago_crear(uuid)', 'torneo_inscribirse(uuid, smallint, uuid)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
revoke execute on function public._liberar_franjas_vencidas() from public, anon, authenticated;

/** Abre la agenda de todas las canchas para los próximos p_dias (horas 6–22, 90 min). Solo service_role (cron diario). */
create or replace function public.social_generar_franjas(p_dias integer default 14, p_precio_dia integer default 120000, p_precio_noche integer default 160000)
returns integer
language plpgsql volatile security definer
set search_path = ''
as $$
declare n integer;
begin
  insert into public.social_franjas (cancha_id, inicio, fin, precio)
  select c.id, t, t + interval '90 minutes', case when extract(hour from t at time zone 'America/Bogota') >= 18 then p_precio_noche else p_precio_dia end
  from public.social_canchas c
  cross join generate_series(0, p_dias - 1) d
  cross join generate_series(6, 21, 1) h
  cross join lateral (select ((current_date + d)::timestamp + make_interval(hours => h)) at time zone 'America/Bogota' as t) x
  where c.deleted_at is null and t > now()
  on conflict (cancha_id, inicio) do nothing;
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke execute on function public.social_generar_franjas(integer, integer, integer) from public, anon, authenticated;
grant execute on function public.social_generar_franjas(integer, integer, integer) to service_role;
