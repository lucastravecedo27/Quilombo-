import '../styles/tokens.css';
import { mount } from 'svelte';
import Sala from './Sala.svelte';

export default mount(Sala, { target: document.getElementById('app')! });
