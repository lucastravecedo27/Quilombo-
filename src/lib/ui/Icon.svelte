<script lang="ts">
  import { icons } from './icons';
  let { name, size = 24, stroke = 1.8, class: className = '' }: { name: string; size?: number; stroke?: number; class?: string } = $props();
</script>

<svg class={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width={stroke} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{@html icons[name] ?? icons.otros}</svg>
