<script lang="ts">
  // Sala de demo (en el Mac): las tres apps a la vez —jugador y mesero en marcos de iPhone, y el panel del club—
  // conectadas en vivo por la central. El segundo celular puede ser el Mesero o el Profesor (Diego). A la izquierda, TODAS las pantallas de cada app y los flujos de la reunión:
  // al tocar una, esa app salta ahí (postMessage → $lib/app/sala.ts). Arriba, los QR para abrir en los iPhone.
  import QRCode from 'qrcode';
  import { onMount } from 'svelte';

  type App = 'jugador' | 'mesero' | 'profe' | 'club';
  interface Pantalla { app: App; destino: string; nombre: string; emoji: string }
  interface Flujo { n: number; titulo: string; pasos: string[]; ir: [App, string][] }

  const DEMO = '00000000-0000-4000-a000-000000000001';
  const DIEGO = '00000000-0000-4000-b300-000000000001';
  const PANTALLAS: Record<App, Pantalla[]> = {
    jugador: [
      { app: 'jugador', destino: 'social', nombre: 'Inicio · Tu red', emoji: '🏠' },
      { app: 'jugador', destino: 'jugar', nombre: 'Jugar', emoji: '🎾' },
      { app: 'jugador', destino: 'reservar', nombre: 'Reservar cancha', emoji: '📅' },
      { app: 'jugador', destino: 'partido', nombre: 'Tiquete de reserva', emoji: '🎟️' },
      { app: 'jugador', destino: 'tarjeta', nombre: 'Tarjeta Quilombo (QR)', emoji: '🛳️' },
      { app: 'jugador', destino: 'saldo', nombre: 'Saldo y recarga', emoji: '💰' },
      { app: 'jugador', destino: 'ranking', nombre: 'Ranking nacional', emoji: '🏆' },
      { app: 'jugador', destino: 'resultado', nombre: 'Resultado por confirmar', emoji: '⚖️' },
      { app: 'jugador', destino: 'calendario', nombre: 'Mi calendario', emoji: '🗓️' },
      { app: 'jugador', destino: 'torneo', nombre: 'Torneo · Yo voy', emoji: '🥇' },
      { app: 'jugador', destino: 'clases', nombre: 'Clases con profe', emoji: '🎓' },
      { app: 'jugador', destino: 'profesor', nombre: 'Perfil del profe · reservar', emoji: '👨‍🏫' },
      { app: 'jugador', destino: 'perfil', nombre: 'Mi perfil', emoji: '👤' },
      { app: 'jugador', destino: 'amigo', nombre: 'Perfil de un amigo', emoji: '🤝' },
      { app: 'jugador', destino: 'gente', nombre: 'Tu gente', emoji: '👥' },
      { app: 'jugador', destino: 'buscar', nombre: 'Buscar jugadores', emoji: '🔎' },
      { app: 'jugador', destino: 'chat', nombre: 'Chats', emoji: '💬' },
      { app: 'jugador', destino: 'conversacion', nombre: 'Conversación', emoji: '🗨️' }
    ],
    mesero: [
      { app: 'mesero', destino: 'quien', nombre: '¿Quién eres?', emoji: '🙋' },
      { app: 'mesero', destino: 'pedidos', nombre: 'Pedidos en vivo', emoji: '🧾' },
      { app: 'mesero', destino: 'canchas', nombre: 'Canchas ahora', emoji: '🎾' },
      { app: 'mesero', destino: 'cuentas', nombre: 'Tarjetas de hoy', emoji: '🛳️' },
      { app: 'mesero', destino: 'escanear', nombre: 'Escanear tarjeta', emoji: '📷' },
      { app: 'mesero', destino: 'nuevo', nombre: 'Nuevo pedido', emoji: '➕' }
    ],
    profe: [
      { app: 'profe', destino: 'perfil', nombre: 'Modo profesor · mi agenda', emoji: '🎓' },
      { app: 'profe', destino: 'abrir-horario', nombre: 'Abrir horario de clase', emoji: '➕' },
      { app: 'profe', destino: 'perfil-publico', nombre: 'Mi perfil público', emoji: '👨‍🏫' },
      { app: 'profe', destino: 'calendario', nombre: 'Mi calendario', emoji: '🗓️' },
      { app: 'profe', destino: 'saldo', nombre: 'Lo que gané (saldo)', emoji: '💰' }
    ],
    club: [
      { app: 'club', destino: 'hoy', nombre: 'Así va el club hoy', emoji: '📊' },
      { app: 'club', destino: 'agenda', nombre: 'Agenda de canchas', emoji: '📅' },
      { app: 'club', destino: 'bar', nombre: 'Bar y pedidos', emoji: '🍹' },
      { app: 'club', destino: 'cuentas', nombre: 'Tarjetas Quilombo', emoji: '🛳️' },
      { app: 'club', destino: 'clases', nombre: 'Clases con profe', emoji: '🎓' },
      { app: 'club', destino: 'torneos', nombre: 'Torneos y comprobantes', emoji: '🏆' },
      { app: 'club', destino: 'ranking', nombre: 'Ranking y disputas', emoji: '⚖️' },
      { app: 'club', destino: 'carta', nombre: 'Carta · productos', emoji: '📋' },
      { app: 'club', destino: 'caja', nombre: 'Caja del día', emoji: '💵' }
    ]
  };
  const FLUJOS: Flujo[] = [
    { n: 1, titulo: 'Reservar y pagar', pasos: ['Jugador: toca una cancha libre de La 70', 'Reservar y pagar con saldo', 'Club: entra "Nueva reserva" y la agenda se ilumina'], ir: [['jugador', 'jugar'], ['mesero', 'canchas'], ['club', 'agenda']] },
    { n: 2, titulo: 'Pedir con la tarjeta', pasos: ['Jugador: botón Q → su tarjeta', 'Mesero: escanea (o digita el código) y cobra 2 cervezas con saldo', 'Club: aparece en Tarjetas y Caja'], ir: [['jugador', 'tarjeta'], ['mesero', 'escanear'], ['club', 'cuentas']] },
    { n: 3, titulo: 'Mitad y mitad', pasos: ['Jugador: en su tiquete, ✂️ Dividir → Mitad y mitad con Juan', 'Juan paga su parte (solo o desde el otro iPhone)', 'La reserva pasa a PAGADA'], ir: [['jugador', 'partido'], ['club', 'agenda']] },
    { n: 4, titulo: 'Torneo · Yo voy', pasos: ['Jugador: Calendario → Americano nocturno → Yo voy', 'Adjunta el comprobante', 'Club: Revisar comprobante → Aprobar → al jugador le cambia a ✓ Inscrito'], ir: [['jugador', 'calendario'], ['club', 'torneos']] },
    { n: 5, titulo: 'Resultado sin trampa', pasos: ['Jugador: confirma el resultado que propuso Andrés', 'Con los 4 de acuerdo queda válido y suma puntos', 'Ranking: subes de puesto'], ir: [['jugador', 'resultado'], ['club', 'ranking']] },
    { n: 6, titulo: 'Clase con el profe', pasos: ['Jugador: en el perfil del Profe Diego toca un horario y paga con saldo', 'Profe (2º celular): le llega "Nuevo alumno" y lo ve en su agenda', 'Club: aviso "Clase reservada" y la cancha queda como clase'], ir: [['jugador', 'profesor'], ['profe', 'perfil'], ['club', 'clases']] },
    { n: 7, titulo: 'Modo profesor', pasos: ['Profe Diego (2º celular): ＋ Abrir horario', 'Elige club, día, cancha, tipo y precio', 'Aparece en su perfil público, al jugador y en el club'], ir: [['profe', 'abrir-horario'], ['jugador', 'profesor'], ['club', 'clases']] }
  ];
  const COMO: [string, string][] = [
    [DEMO, 'Demo Jugador'], ['00000000-0000-4000-b000-000000000001', 'Juan'], ['00000000-0000-4000-b000-000000000002', 'Caro'],
    ['00000000-0000-4000-b000-000000000003', 'Andrés'], ['00000000-0000-4000-b000-000000000004', 'Vale']
  ];
  const ACENTOS = [['naranja', '#ff5b1f'], ['azul', '#1e7fd0'], ['verde', '#18895b'], ['noche', '#0e1b33']] as const;

  let base = $state(location.origin);
  let qrJugador = $state('');
  let qrMesero = $state('');
  let qrProfe = $state('');
  let verQR = $state(false);
  let confirmar = $state(false);
  let k = $state(0); // para recargar los marcos
  let lista = $state<'pantallas' | 'flujos'>('pantallas');
  let vista = $state<'todo' | 'celulares' | 'club'>('todo');
  let activa = $state<string>('');
  let flujo = $state<number | null>(null);
  // Con quién entra el celular del jugador: lo decide la sala (?como=), no lo que haya quedado guardado
  let como = $state(DEMO);
  let acento = $state(localStorage.getItem('q-acento') ?? 'azul');
  const marcos: Record<App, HTMLIFrameElement | null> = $state({ jugador: null, mesero: null, profe: null, club: null });
  /** Qué es el segundo celular */
  let segundo = $state<'mesero' | 'profe'>('mesero');

  // El panel del club se escala para caber en su columna (se diseña a 1440 px)
  let anchoClub = $state(900);
  let altoClub = $state(600);
  const escalaClub = $derived(Math.min(1, anchoClub / 1440));

  onMount(async () => {
    // Un usuario guardado de antes (p. ej. de "Usar la app como") no debe colarse en la sala
    localStorage.removeItem('q-demo-uid');
    try {
      const r = await fetch('/__hub/red');
      if (r.ok) {
        const { urls } = (await r.json()) as { urls: string[] };
        if (urls?.length) base = urls[0];
      }
    } catch { /* sin central: se queda la dirección actual */ }
    qrJugador = await QRCode.toDataURL(`${base}/`, { margin: 1, width: 360, color: { dark: '#0e1b33', light: '#ffffff' } });
    qrMesero = await QRCode.toDataURL(`${base}/mesero`, { margin: 1, width: 360, color: { dark: '#0e1b33', light: '#ffffff' } });
    qrProfe = await QRCode.toDataURL(`${base}/?como=${DIEGO}`, { margin: 1, width: 360, color: { dark: '#0e1b33', light: '#ffffff' } });
  });

  function ir(app: App, destino: string) {
    if (app === 'mesero' || app === 'profe') segundo = app;
    marcos[app]?.contentWindow?.postMessage({ tipo: 'q-ir', destino }, location.origin);
  }
  function tocar(p: Pantalla) {
    activa = `${p.app}:${p.destino}`;
    // Si esa app no está a la vista, se muestra
    if ((p.app === 'club' && vista === 'celulares') || (p.app !== 'club' && vista === 'club')) vista = 'todo';
    ir(p.app, p.destino);
  }
  function usarComo(uid: string) {
    como = uid; // cambia el src del marco y el jugador vuelve a abrir como esa persona
  }
  function empezar(f: Flujo) {
    flujo = f.n;
    const quiero = DEMO;
    const cambia = como !== quiero;
    vista = 'todo';
    if (cambia) usarComo(quiero);
    // Si el jugador se recarga (otra persona), se espera a que vuelva a abrir
    setTimeout(() => f.ir.forEach(([a, d]) => ir(a, d)), cambia ? 3000 : 0);
  }
  async function elegirAcento(a: string) {
    acento = a;
    localStorage.setItem('q-acento', a);
    const fila = { id: 'acento', valor: a, updated_at: new Date().toISOString(), deleted_at: null };
    await fetch('/__hub/poner', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tabla: 'demo_prefs', filas: [['acento', fila]] }) }).catch(() => undefined);
  }
  async function reiniciar() {
    confirmar = false;
    flujo = null;
    activa = '';
    await fetch('/__hub/reiniciar', { method: 'POST' }).catch(() => undefined);
    setTimeout(() => k++, 300);
  }
  $effect(() => { document.documentElement.dataset.acento = acento; });
</script>

<div class="sala">
  <header>
    <div class="marca"><b>QUILOMBO</b><span>Sala de demo</span></div>
    <p class="ayuda">Toca una pantalla o un flujo y la app salta ahí. Lo que hagas en una app aparece al instante en las otras.</p>
    <div class="vistas" role="radiogroup" aria-label="Vista">
      <button role="radio" aria-checked={vista === 'todo'} class:on={vista === 'todo'} onclick={() => (vista = 'todo')}>Las 3</button>
      <button role="radio" aria-checked={vista === 'celulares'} class:on={vista === 'celulares'} onclick={() => (vista = 'celulares')}>Celulares</button>
      <button role="radio" aria-checked={vista === 'club'} class:on={vista === 'club'} onclick={() => (vista = 'club')}>Club grande</button>
    </div>
    <div class="acentos" role="radiogroup" aria-label="Color de acento">
      {#each ACENTOS as [id, color] (id)}
        <button role="radio" aria-checked={acento === id} aria-label={`Acento ${id}`} class:on={acento === id} style="--c:{color}" onclick={() => elegirAcento(id)}></button>
      {/each}
    </div>
    <div class="acciones">
      <button class="sec" onclick={() => (verQR = true)}>📱 Abrir en los iPhone</button>
      <a class="sec" href="/club" target="_blank">🖥️ Club en pestaña</a>
      <button class="peligro" onclick={() => (confirmar = true)}>↺ Reiniciar</button>
    </div>
  </header>

  <div class="cuerpo">
    <aside>
      <div class="seg" role="tablist">
        <button role="tab" aria-selected={lista === 'pantallas'} class:on={lista === 'pantallas'} onclick={() => (lista = 'pantallas')}>Pantallas</button>
        <button role="tab" aria-selected={lista === 'flujos'} class:on={lista === 'flujos'} onclick={() => (lista = 'flujos')}>Flujos de la reunión</button>
      </div>

      {#if lista === 'pantallas'}
        {#each [['jugador', 'Jugador', '1'], ['mesero', 'Mesero', '2'], ['profe', 'Profesor', '2'], ['club', 'Club', '3']] as const as [app, titulo, n] (app)}
          <h3><i>{n}</i>{titulo} <small>{PANTALLAS[app].length}</small></h3>
          <ul>
            {#each PANTALLAS[app] as p (p.destino)}
              <li><button class:on={activa === `${p.app}:${p.destino}`} onclick={() => tocar(p)}><span>{p.emoji}</span>{p.nombre}</button></li>
            {/each}
          </ul>
        {/each}
      {:else}
        <ol class="flujos">
          {#each FLUJOS as f (f.n)}
            <li>
              <button class="flujo" class:on={flujo === f.n} onclick={() => empezar(f)}>
                <b>{f.n}</b><span><strong>{f.titulo}</strong><small>{f.pasos[0]}</small></span>
              </button>
              {#if flujo === f.n}
                <ol class="pasos">{#each f.pasos as paso, i (i)}<li>{paso}</li>{/each}</ol>
              {/if}
            </li>
          {/each}
        </ol>
      {/if}

      <h3>Usar la app del jugador como</h3>
      <div class="como">
        {#each COMO as [uid, nombre] (uid)}
          <button class:on={como === uid} onclick={() => usarComo(uid)}>{nombre}</button>
        {/each}
      </div>
    </aside>

    {#key k}
      <main class="v-{vista}">
        <section class="tel" class:oculto={vista === 'club'}>
          <h2><i>1</i> Jugador</h2>
          <div class="marco"><iframe bind:this={marcos.jugador} title="App del jugador" src="/?como={como}"></iframe></div>
        </section>
        <section class="tel" class:oculto={vista === 'club'}>
          <div class="h2-seg">
            <h2><i>2</i></h2>
            <div class="seg2" role="radiogroup" aria-label="Segundo celular">
              <button role="radio" aria-checked={segundo === 'mesero'} class:on={segundo === 'mesero'} onclick={() => (segundo = 'mesero')}>Mesero</button>
              <button role="radio" aria-checked={segundo === 'profe'} class:on={segundo === 'profe'} onclick={() => (segundo = 'profe')}>Profe Diego</button>
            </div>
          </div>
          <!-- Los dos siguen conectados; solo se ve uno -->
          <div class="marco" class:oculto={segundo !== 'mesero'}><iframe bind:this={marcos.mesero} title="App del mesero" src="/mesero"></iframe></div>
          <div class="marco" class:oculto={segundo !== 'profe'}><iframe bind:this={marcos.profe} title="App del profesor" src="/?como={DIEGO}"></iframe></div>
        </section>
        <section class="club" class:oculto={vista === 'celulares'}>
          <h2><i>3</i> Club · Pádel Club La 70</h2>
          <div class="pantalla" bind:clientWidth={anchoClub} bind:clientHeight={altoClub}>
            <iframe bind:this={marcos.club} title="Panel del club" src="/club" style="transform: scale({escalaClub}); width: 1440px; height: {Math.ceil(altoClub / escalaClub)}px"></iframe>
          </div>
        </section>
      </main>
    {/key}
  </div>

  {#if verQR}
    <div class="velo" role="presentation" onclick={() => (verQR = false)}>
      <div class="modal" role="dialog" aria-label="Abrir en los iPhone" tabindex="-1" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.key === 'Escape' && (verQR = false)}>
        <h3>Escanea con la cámara del iPhone</h3>
        <div class="qrs">
          <figure>{#if qrJugador}<img src={qrJugador} alt="QR app del jugador" />{/if}<figcaption><b>Jugador</b><span>{base}/</span></figcaption></figure>
          <figure>{#if qrMesero}<img src={qrMesero} alt="QR app del mesero" />{/if}<figcaption><b>Mesero</b><span>{base}/mesero</span></figcaption></figure>
          <figure>{#if qrProfe}<img src={qrProfe} alt="QR app del profesor" />{/if}<figcaption><b>Profe Diego</b><span>La app del jugador, entrando como el profesor</span></figcaption></figure>
        </div>
        <p>La primera vez Safari dirá que la conexión no es privada: «Mostrar detalles» → «visitar este sitio web». Luego Compartir → «Agregar a inicio» para verla a pantalla completa.</p>
        <button class="pri" onclick={() => (verQR = false)}>Listo</button>
      </div>
    </div>
  {/if}
  {#if confirmar}
    <div class="velo" role="presentation" onclick={() => (confirmar = false)}>
      <div class="modal chico" role="dialog" aria-label="Reiniciar demo" tabindex="-1" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.key === 'Escape' && (confirmar = false)}>
        <h3>¿Reiniciar la demo?</h3>
        <p>Se borra lo que hicieron y todos los equipos vuelven a los datos de ejemplo.</p>
        <div class="fila"><button class="sec" onclick={() => (confirmar = false)}>Cancelar</button><button class="peligro" onclick={reiniciar}>Reiniciar</button></div>
      </div>
    </div>
  {/if}
</div>

<style>
  :global(html, body) { margin: 0; height: 100%; background: var(--q-bg); color: var(--q-tx); font-family: var(--q-font); }
  .sala { height: 100vh; display: flex; flex-direction: column; }
  header { display: flex; align-items: center; gap: 16px; padding: 12px 20px; background: var(--q-card); border-bottom: 1px solid var(--q-line); box-shadow: inset 0 3px 0 var(--q-acc); }
  .marca { display: flex; flex-direction: column; line-height: 1; }
  .marca b { font-family: var(--q-font-titulo); font-style: italic; font-weight: 900; font-size: 28px; color: var(--q-acct); letter-spacing: 0.04em; }
  .marca span { font-size: 11.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; color: var(--q-tx2); margin-top: 3px; }
  .ayuda { flex: 1; margin: 0; font-size: 13.5px; color: var(--q-tx2); }
  button, a.sec { font: inherit; font-weight: 700; font-size: 14px; height: 38px; padding: 0 14px; border-radius: 10px; border: 0; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; text-decoration: none; color: var(--q-tx); }
  .sec { background: var(--q-sub); }
  .pri { background: var(--q-acc); color: var(--q-acctx); }
  .peligro { background: var(--q-noche); color: #fff; }
  .acciones { display: flex; gap: 8px; }
  .vistas { display: flex; padding: 3px; border-radius: 12px; background: var(--q-sub); }
  .vistas button { height: 32px; background: none; color: var(--q-tx2); }
  .vistas button.on { background: var(--q-card); color: var(--q-tx); box-shadow: 0 1px 4px rgba(14, 27, 51, 0.12); }
  .acentos { display: flex; gap: 6px; padding: 4px; border-radius: 12px; background: var(--q-sub); }
  .acentos button { width: 28px; height: 28px; padding: 0; border-radius: 8px; background: var(--c); }
  .acentos button.on { box-shadow: 0 0 0 2px var(--q-card), 0 0 0 4px var(--q-tx); }

  .cuerpo { flex: 1; min-height: 0; display: flex; }
  aside { width: 270px; flex-shrink: 0; overflow-y: auto; padding: 14px 14px 24px; background: var(--q-card); border-right: 1px solid var(--q-line); box-sizing: border-box; }
  .seg { display: grid; grid-template-columns: 1fr 1fr; padding: 3px; border-radius: 12px; background: var(--q-sub); margin-bottom: 8px; }
  .seg button { height: 34px; justify-content: center; background: none; color: var(--q-tx2); font-size: 13px; padding: 0 6px; }
  .seg button.on { background: var(--q-card); color: var(--q-tx); box-shadow: 0 1px 4px rgba(14, 27, 51, 0.12); }
  h3 { margin: 16px 0 6px; display: flex; align-items: center; gap: 8px; font-family: var(--q-font-titulo); font-style: italic; font-weight: 800; text-transform: uppercase; font-size: 17px; }
  h3 i, h2 i { font-style: normal; width: 22px; height: 22px; border-radius: 6px; background: var(--q-acc); color: var(--q-acctx); display: inline-flex; align-items: center; justify-content: center; font-size: 13px; font-family: var(--q-font); font-weight: 800; }
  h3 small { font-family: var(--q-font); font-style: normal; font-size: 12px; color: var(--q-tx3); font-weight: 700; }
  ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
  ul button { width: 100%; height: 36px; padding: 0 10px; background: none; font-weight: 600; font-size: 14px; border-radius: 8px; text-align: left; }
  ul button span { width: 22px; text-align: center; }
  ul button:hover { background: var(--q-sub); }
  ul button.on { background: var(--q-accs); color: var(--q-acct); box-shadow: inset 3px 0 0 var(--q-acc); }
  .flujos { list-style: none; margin: 4px 0 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
  .flujo { width: 100%; height: auto; padding: 10px; align-items: flex-start; gap: 10px; background: var(--q-bg); border: 1px solid var(--q-line); border-radius: 12px; text-align: left; }
  .flujo.on { border-color: var(--q-acc); background: var(--q-accs); }
  .flujo b { font-family: var(--q-font-titulo); font-style: italic; font-weight: 900; font-size: 26px; line-height: 1; min-width: 18px; }
  .flujo span { display: flex; flex-direction: column; gap: 2px; }
  .flujo strong { font-size: 15px; }
  .flujo small { font-size: 12.5px; font-weight: 500; color: var(--q-tx2); }
  .pasos { margin: 6px 4px 4px 34px; padding: 0; font-size: 13px; color: var(--q-tx2); display: flex; flex-direction: column; gap: 4px; }
  .h2-seg { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
  .h2-seg h2 { margin: 0; }
  .seg2 { display: flex; padding: 2px; border-radius: 10px; background: var(--q-sub); }
  .seg2 button { height: 28px; font-size: 13px; padding: 0 10px; background: none; color: var(--q-tx2); font-family: var(--q-font-titulo); font-style: italic; font-weight: 800; text-transform: uppercase; }
  .seg2 button.on { background: var(--q-card); color: var(--q-tx); box-shadow: 0 1px 4px rgba(14, 27, 51, 0.12); }
  .como { display: flex; flex-wrap: wrap; gap: 6px; }
  .como button { height: 32px; font-size: 13px; background: var(--q-sub); }
  .como button.on { background: var(--q-noche); color: #fff; }

  main { flex: 1; min-width: 0; display: flex; gap: 20px; padding: 14px 20px 18px; }
  h2 { margin: 0 0 8px; font-family: var(--q-font-titulo); font-style: italic; font-weight: 800; text-transform: uppercase; font-size: 18px; display: flex; align-items: center; gap: 8px; }
  section { display: flex; flex-direction: column; min-height: 0; }
  /* Las apps no se desmontan al cambiar de vista (siguen conectadas): solo se esconden */
  .oculto { display: none; }
  /* iPhone 15 Pro (393 × 852) */
  .tel { --e: 0.72; }
  .v-celulares .tel { --e: 0.86; }
  .v-celulares { justify-content: center; gap: 48px; }
  .marco { width: calc(393px * var(--e) + 16px); height: calc(852px * var(--e) + 16px); border-radius: 44px; background: #0e1b33; padding: 8px; box-sizing: border-box; box-shadow: 0 0 0 1px var(--q-borde), 0 18px 40px rgba(14, 27, 51, 0.18); overflow: hidden; }
  .marco iframe { width: 393px; height: 852px; border: 0; border-radius: 38px; transform: scale(var(--e)); transform-origin: 0 0; background: var(--q-bg); }
  .club { flex: 1; min-width: 0; }
  .pantalla { flex: 1; min-height: 0; border-radius: 14px; overflow: hidden; background: var(--q-bg); box-shadow: 0 0 0 1px var(--q-borde), 0 18px 40px rgba(14, 27, 51, 0.12); position: relative; }
  .pantalla iframe { position: absolute; top: 0; left: 0; border: 0; transform-origin: 0 0; }

  .velo { position: fixed; inset: 0; background: rgba(10, 18, 38, 0.45); display: flex; align-items: center; justify-content: center; z-index: 10; }
  .modal { background: var(--q-card); color: var(--q-tx); border-radius: 18px; padding: 28px; max-width: 960px; text-align: center; box-shadow: 0 30px 60px rgba(14, 27, 51, 0.25); }
  .modal.chico { max-width: 420px; }
  .modal h3 { justify-content: center; margin: 0 0 18px; font-size: 28px; font-weight: 900; }
  .modal p { color: var(--q-tx2); }
  .qrs { display: flex; gap: 28px; justify-content: center; }
  figure { margin: 0; display: flex; flex-direction: column; align-items: center; gap: 8px; }
  figure { max-width: 250px; }
  figure img { width: 250px; height: 250px; }
  figcaption { display: flex; flex-direction: column; }
  figcaption b { font-size: 20px; }
  figcaption span { font-size: 13px; color: var(--q-tx2); }
  .fila { display: flex; gap: 10px; justify-content: center; }
</style>
