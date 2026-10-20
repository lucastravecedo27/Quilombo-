import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import { demoHub } from './vite/demoHub.ts';
import basicSsl from '@vitejs/plugin-basic-ssl';

/**
 * Correcciones a framework7-svelte 9 con Svelte 5 (se aplican al compilar; node_modules no se toca):
 * 1. view.svelte: la lista de páginas era $state (proxy profundo) y el router no siempre veía `page.el`.
 *    Con $state.raw la lista guarda los objetos tal cual.
 * 2. components-router.js: al volver atrás el router quita la página de la lista, pero Svelte no siempre
 *    retira su elemento del DOM (F7 mueve las páginas). La página "huérfana" se quedaba y las siguientes
 *    navegaciones de esa pestaña se descuadraban (listas duplicadas, detalle que no se cierra).
 *    Tras actualizar la lista, si el elemento sigue en el DOM y ya no pertenece a ninguna página, se retira.
 */
function f7Correcciones(): Plugin {
  const parches: [RegExp, string, string][] = [
    [/framework7-svelte[\\/]components[\\/]view\.svelte$/,
      'let pages = $state(initialPage ? [initialPage] : []);',
      'let pages = $state.raw(initialPage ? [initialPage] : []);'],
    [/framework7-svelte[\\/]shared[\\/]components-router\.js$/,
      `          viewRouter.pages.splice(index, 1);
          viewRouter.setPages(viewRouter.pages);`,
      `          viewRouter.pages.splice(index, 1);
          viewRouter.setPages(viewRouter.pages);
          setTimeout(() => {
            if (pageEl.isConnected && !viewRouter.pages.some((p) => p.el === pageEl)) pageEl.remove();
          }, 0);`]
  ];
  return {
    name: 'q-f7-correcciones',
    enforce: 'pre',
    transform(code, id) {
      const archivo = id.split('?')[0];
      for (const [patron, original, nuevo] of parches) {
        if (!patron.test(archivo)) continue;
        if (!code.includes(original)) throw new Error(`framework7-svelte cambió: revisar el parche de ${archivo}`);
        return code.replace(original, nuevo);
      }
    }
  };
}

export default defineConfig({
  resolve: { alias: { $lib: fileURLToPath(new URL('./src/lib', import.meta.url)) } },
  plugins: [
    f7Correcciones(),
    svelte(),
    demoHub(),
    // `npm run demo:https`: certificado propio para que los iPhone puedan usar la cámara (escanear QR)
    ...(process.env.QUILOMBO_HTTPS === '1' ? [basicSsl()] : [])
  ],
  // Tres apps: el jugador (index), el panel del club (club.html) y el mesero (mesero.html); demo.html las reúne con QR
  build: {
    rollupOptions: {
      input: {
        index: fileURLToPath(new URL('./index.html', import.meta.url)),
        club: fileURLToPath(new URL('./club.html', import.meta.url)),
        mesero: fileURLToPath(new URL('./mesero.html', import.meta.url)),
        demo: fileURLToPath(new URL('./demo.html', import.meta.url))
      }
    }
  },
  // view.svelte se compila desde node_modules (no se pre-empaqueta) para que el parche aplique también en desarrollo
  optimizeDeps: { exclude: ['framework7-svelte'] },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node'
  }
});
