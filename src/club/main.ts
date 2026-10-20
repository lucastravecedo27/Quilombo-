// Panel del club (el Mac de la recepción): agenda de canchas, bar, carta, torneos y caja, en vivo con la app y los meseros
import '$lib/app/polyfill';
import { iniciarAcento } from '$lib/ui/acento.svelte';
import { mount } from 'svelte';
import '../styles/tokens.css';
import './club.css';
import Club from './Club.svelte';

iniciarAcento();

const app = mount(Club, { target: document.getElementById('app')! });
export default app;
