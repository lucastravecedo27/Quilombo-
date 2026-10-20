<script lang="ts">
  // Entrar o crear cuenta. Al crearla, el perfil de jugador queda listo y ya puede entrar a un torneo.
  import { sesion } from '$lib/app/sesion.svelte';

  let modo = $state<'entrar' | 'crear'>('entrar');
  let nombre = $state('');
  let email = $state('');
  let clave = $state('');
  function enviar(e: SubmitEvent) {
    e.preventDefault();
    if (modo === 'entrar') void sesion.entrar(email, clave);
    else void sesion.registrarse(nombre, email, clave);
  }
</script>

<main class="acceso">
  <div class="logo" aria-hidden="true">🎾</div>
  <h1>Quilombo</h1>
  <p class="lema">El pádel de Colombia: tu gente, tus partidos, tus canchas.</p>
  <form onsubmit={enviar}>
    {#if modo === 'crear'}<input class="q-input" placeholder="Tu nombre" autocomplete="name" bind:value={nombre} required aria-label="Tu nombre" />{/if}
    <input class="q-input" type="email" placeholder="Correo" autocomplete="email" bind:value={email} required aria-label="Correo" />
    <input class="q-input" type="password" placeholder="Contraseña" autocomplete={modo === 'crear' ? 'new-password' : 'current-password'} bind:value={clave} required aria-label="Contraseña" />
    {#if sesion.error}<p class="err">{sesion.error}</p>{/if}
    <button class="q-btn bloque" disabled={sesion.ocupado}>{sesion.ocupado ? '…' : modo === 'entrar' ? 'Entrar' : 'Crear cuenta'}</button>
  </form>
  <button class="cambiar" onclick={() => { modo = modo === 'entrar' ? 'crear' : 'entrar'; sesion.error = ''; }}>
    {modo === 'entrar' ? '¿Nuevo? Crea tu cuenta' : 'Ya tengo cuenta'}
  </button>
</main>

<style>
  .acceso { min-height: 100vh; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; gap: 10px; padding: 32px 24px; font-family: var(--q-font-fiesta); background: var(--q-bg); color: var(--q-tx); }
  .logo { width: 84px; height: 84px; border-radius: 16px; background: var(--q-fiesta-lima); display: flex; align-items: center; justify-content: center; font-size: 46px; }
  h1 { margin: 10px 0 0; font-family: var(--q-font-titulo); font-style: italic; text-transform: uppercase; font-size: 52px; font-weight: 900; line-height: 0.95; color: var(--q-acc); }
  .lema { margin: 0 0 14px; color: var(--q-tx2); font-size: 16px; font-weight: 700; }
  form { display: flex; flex-direction: column; gap: 10px; }
  .err { margin: 0; color: var(--q-alr); font-size: 14px; }
  .cambiar { margin-top: 6px; border: 0; background: none; color: var(--q-link); font-weight: 900; font-size: 15px; }
</style>
