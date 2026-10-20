import '$lib/app/polyfill';
import { iniciarAcento } from '$lib/ui/acento.svelte';
// Framework7 "lite": solo el núcleo y los módulos que usa la app
import Framework7 from 'framework7/lite';
import Dialog from 'framework7/components/dialog';
import Actions from 'framework7/components/actions';
import Sheet from 'framework7/components/sheet';
import Tabs from 'framework7/components/tabs';
import Framework7Svelte from 'framework7-svelte';
import { mount } from 'svelte';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import 'framework7/css';
import 'framework7/components/dialog/css';
import 'framework7/components/actions/css';
import 'framework7/components/sheet/css';
import 'framework7/components/tabs/css';
import './styles/tokens.css';
import './styles/app.css';
import App from './App.svelte';

iniciarAcento();

Framework7.use([Dialog, Actions, Sheet, Tabs, Framework7Svelte]);

const app = mount(App, { target: document.getElementById('app')! });

// App de iPhone: quita la pantalla de arranque cuando ya hay algo pintado (con tope por si algo falla)
if (Capacitor.isNativePlatform()) {
  const quitar = () => void SplashScreen.hide({ fadeOutDuration: 250 }).catch(() => undefined);
  requestAnimationFrame(() => requestAnimationFrame(quitar));
  setTimeout(quitar, 4000);
}
export default app;
