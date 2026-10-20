// App del mesero (demo): pedidos del bar en vivo, canchas en juego y tomar pedidos. Sin Framework7.
import '$lib/app/polyfill';
import { iniciarAcento } from '$lib/ui/acento.svelte';
import { mount } from 'svelte';
import '../styles/tokens.css';
import './mesero.css';
import Mesero from './Mesero.svelte';

iniciarAcento();

export default mount(Mesero, { target: document.getElementById('app')! });
