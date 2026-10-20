-- Datos de arranque para desarrollo: clubes y canchas de ejemplo en las ciudades con más pádel, su agenda de 14 días
-- y un par de torneos. (Los clubes reales se cargan desde el panel de administración: pendiente.)
insert into public.social_clubes (nombre, ciudad, zona) values
  ('Pádel Club La 70', 'Medellín', 'Laureles'), ('Envigado Pádel', 'Medellín', 'Envigado'),
  ('Bogotá Pádel Usaquén', 'Bogotá', 'Usaquén'), ('Cancha 93', 'Bogotá', 'Chicó'),
  ('Cali Pádel Club', 'Cali', 'Ciudad Jardín'), ('Barranquilla Pádel', 'Barranquilla', 'Alto Prado')
on conflict do nothing;
insert into public.social_canchas (club_id, nombre, techada, tipo)
select c.id, 'Cancha ' || k, k = 1, case when k = 1 then 'cristal' else 'muro' end
from public.social_clubes c cross join generate_series(1, 2) k;
select public.social_generar_franjas(14);
insert into public.social_torneos (nombre, ciudad, club_id, inicio, fin, cierre, categorias, cupos, precio)
select 'Open ' || c.ciudad, c.ciudad, c.id, now() + interval '12 days', now() + interval '14 days', now() + interval '9 days', '{4,5}', 32, 180000
from public.social_clubes c where c.nombre in ('Pádel Club La 70', 'Bogotá Pádel Usaquén');
