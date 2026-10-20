// Señal de "ya leí este chat": cada vez que se marca una conversación como vista sube el número y todo lo que
// cuenta no leídos (barra de pestañas, lista de chats) se recalcula al instante.
export const leidos = $state({ v: 0 });
