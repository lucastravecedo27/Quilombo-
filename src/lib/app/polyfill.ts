// En el celular la demo se abre por la red local (http://192.168.x.x), que no es "contexto seguro": Safari no trae
// crypto.randomUUID ahí. Se completa con getRandomValues, que sí está.
if (typeof crypto !== 'undefined' && !crypto.randomUUID) {
  Object.defineProperty(crypto, 'randomUUID', {
    value: () => {
      const b = crypto.getRandomValues(new Uint8Array(16));
      b[6] = (b[6] & 0x0f) | 0x40;
      b[8] = (b[8] & 0x3f) | 0x80;
      const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
      return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
    }
  });
}
export {};
