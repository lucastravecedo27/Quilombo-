// Al profesor le llega el aviso en vivo cuando un alumno le reserva una clase (y cuando alguien cancela).
// Lo que ya estaba al abrir la app no avisa.
import { datos } from '$lib/data/datos.svelte';
import { ui } from '$lib/app/ui.svelte';
import { toque } from '$lib/ui/tema.svelte';
import { cuando } from '../domain/jugar';
import type { Clase } from '../domain/clases';
import { nombreDe, yo } from './vinculos';

export function vigilarAlumnos() {
  const desde = Date.now() + 3000;
  let previo = new Map<string, string[]>();
  $effect.root(() => {
    $effect(() => {
      const mias = (datos.clases as Clase[]).filter((c) => c.profesor === yo());
      const ahora = new Map(mias.map((c) => [c.id, [...c.alumnos]]));
      if (Date.now() > desde) {
        for (const c of mias) {
          const antes = previo.get(c.id);
          if (!antes) continue;
          const llegan = c.alumnos.filter((a) => !antes.includes(a));
          const se_van = antes.filter((a) => !c.alumnos.includes(a));
          const club = (datos.clubes as { id: string; nombre: string }[]).find((x) => x.id === c.club_id)?.nombre ?? '';
          if (llegan.length) {
            toque(18);
            ui.avisar({ titulo: `🎓 Nuevo alumno: ${llegan.map((a) => nombreDe(a).split(' ')[0]).join(', ')}`, sub: `Reservó tu clase · ${cuando(c.inicio)} · ${club} · ${c.alumnos.length}/${c.cupos}`, icono: 'check' }, 6);
          } else if (se_van.length) {
            ui.avisar({ titulo: `${se_van.map((a) => nombreDe(a).split(' ')[0]).join(', ')} canceló su clase`, sub: `${cuando(c.inicio)} · se le devolvió el saldo`, icono: 'info' }, 5);
          }
        }
      }
      previo = ahora;
    });
  });
}
