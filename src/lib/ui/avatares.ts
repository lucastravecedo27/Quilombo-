// Avatares dibujados para el perfil (dibujo propio, en vector): personajes redondos con ojitos tinta, del mismo
// estilo que el logo. Cada uno trae su fondo; se dibujan en una caja de 100 × 100.
const T = '#1a1033'; // tinta
const ojos = (y = 54, sep = 11, r = 4) => `<circle cx="${50 - sep}" cy="${y}" r="${r}" fill="${T}"/><circle cx="${50 + sep}" cy="${y}" r="${r}" fill="${T}"/>`;
const brillo = (y = 54, sep = 11) => `<circle cx="${50 - sep + 1.4}" cy="${y - 1.4}" r="1.3" fill="#fff"/><circle cx="${50 + sep + 1.4}" cy="${y - 1.4}" r="1.3" fill="#fff"/>`;
const mejillas = (y = 63, sep = 20, c = '#ff8fb1') => `<ellipse cx="${50 - sep}" cy="${y}" rx="5" ry="3" fill="${c}" opacity=".7"/><ellipse cx="${50 + sep}" cy="${y}" rx="5" ry="3" fill="${c}" opacity=".7"/>`;
const sonrisa = (y = 64, w = 6) => `<path d="M${50 - w} ${y} q${w} ${w * 0.9} ${w * 2} 0" fill="none" stroke="${T}" stroke-width="3" stroke-linecap="round"/>`;

export interface Avatar { id: string; nombre: string; fondo: string; svg: string }

export const AVATARES: Avatar[] = [
  {
    id: 'gato', nombre: 'Gato', fondo: '#c2410c',
    svg: `<path d="M24 40 L28 16 L44 31 Z" fill="#fff4e0"/><path d="M76 40 L72 16 L56 31 Z" fill="#fff4e0"/><path d="M29 34 L31 22 L39 30 Z" fill="#ff8fb1"/><path d="M71 34 L69 22 L61 30 Z" fill="#ff8fb1"/>
      <ellipse cx="50" cy="56" rx="31" ry="28" fill="#fff4e0"/>${ojos(53, 12)}${brillo(53, 12)}<path d="M46 61 h8 l-4 4 z" fill="#ff8fb1"/>
      <path d="M50 65 q-4 5 -9 2 M50 65 q4 5 9 2" fill="none" stroke="${T}" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M22 58 h12 M22 64 h12 M78 58 h-12 M78 64 h-12" stroke="${T}" stroke-width="1.8" stroke-linecap="round" opacity=".55"/>`
  },
  {
    id: 'perro', nombre: 'Perro', fondo: '#1e7fd0',
    svg: `<ellipse cx="50" cy="55" rx="30" ry="29" fill="#e9c79a"/><ellipse cx="22" cy="50" rx="10" ry="20" fill="#8a5a3c" transform="rotate(14 22 50)"/><ellipse cx="78" cy="50" rx="10" ry="20" fill="#8a5a3c" transform="rotate(-14 78 50)"/>
      <ellipse cx="50" cy="68" rx="15" ry="11" fill="#fff4e0"/>${ojos(50, 12)}${brillo(50, 12)}<ellipse cx="50" cy="62" rx="6" ry="4.5" fill="${T}"/>
      <path d="M50 66 v4 M44 72 q6 4 12 0" fill="none" stroke="${T}" stroke-width="2.4" stroke-linecap="round"/><ellipse cx="50" cy="76" rx="3.5" ry="4" fill="#ff6369"/>`
  },
  {
    id: 'zorro', nombre: 'Zorro', fondo: '#ff5b1f',
    svg: `<path d="M22 44 L26 14 L44 32 Z" fill="#f27a2e"/><path d="M78 44 L74 14 L56 32 Z" fill="#f27a2e"/><path d="M28 36 L29 22 L38 31 Z" fill="${T}" opacity=".85"/><path d="M72 36 L71 22 L62 31 Z" fill="${T}" opacity=".85"/>
      <path d="M50 86 C30 86 18 66 20 48 C24 34 38 28 50 28 C62 28 76 34 80 48 C82 66 70 86 50 86 Z" fill="#f27a2e"/>
      <path d="M50 86 C40 86 30 76 26 62 C36 60 44 66 50 72 C56 66 64 60 74 62 C70 76 60 86 50 86 Z" fill="#fff4e0"/>${ojos(52, 13)}${brillo(52, 13)}<ellipse cx="50" cy="73" rx="4.5" ry="3.5" fill="${T}"/>`
  },
  {
    id: 'oso', nombre: 'Oso', fondo: '#e8475b',
    svg: `<circle cx="27" cy="31" r="11" fill="#8a5a3c"/><circle cx="73" cy="31" r="11" fill="#8a5a3c"/><circle cx="27" cy="31" r="5.5" fill="#d9a77a"/><circle cx="73" cy="31" r="5.5" fill="#d9a77a"/>
      <circle cx="50" cy="56" r="30" fill="#a86f48"/><ellipse cx="50" cy="66" rx="14" ry="11" fill="#e9c79a"/>${ojos(51, 12)}${brillo(51, 12)}<ellipse cx="50" cy="62" rx="5" ry="3.8" fill="${T}"/>${sonrisa(68, 4)}`
  },
  {
    id: 'conejo', nombre: 'Conejo', fondo: '#3346a8',
    svg: `<ellipse cx="38" cy="22" rx="8" ry="22" fill="#fff" transform="rotate(-8 38 22)"/><ellipse cx="62" cy="22" rx="8" ry="22" fill="#fff" transform="rotate(8 62 22)"/>
      <ellipse cx="38" cy="22" rx="3.5" ry="15" fill="#ff8fb1" transform="rotate(-8 38 22)"/><ellipse cx="62" cy="22" rx="3.5" ry="15" fill="#ff8fb1" transform="rotate(8 62 22)"/>
      <circle cx="50" cy="60" r="27" fill="#fff"/>${ojos(57, 11)}${brillo(57, 11)}${mejillas(66, 18)}<path d="M47 64 h6 l-3 3 z" fill="#ff8fb1"/>${sonrisa(69, 3.5)}`
  },
  {
    id: 'panda', nombre: 'Panda', fondo: '#18895b',
    svg: `<circle cx="26" cy="32" r="11" fill="${T}"/><circle cx="74" cy="32" r="11" fill="${T}"/><circle cx="50" cy="56" r="30" fill="#fff"/>
      <ellipse cx="38" cy="54" rx="8" ry="10" fill="${T}" transform="rotate(20 38 54)"/><ellipse cx="62" cy="54" rx="8" ry="10" fill="${T}" transform="rotate(-20 62 54)"/>
      <circle cx="39" cy="53" r="3.2" fill="#fff"/><circle cx="61" cy="53" r="3.2" fill="#fff"/><ellipse cx="50" cy="66" rx="4.5" ry="3.2" fill="${T}"/>${sonrisa(70, 4)}${mejillas(68, 20)}`
  },
  {
    id: 'rana', nombre: 'Rana', fondo: '#b98500',
    svg: `<circle cx="33" cy="34" r="12" fill="#5fbf6a"/><circle cx="67" cy="34" r="12" fill="#5fbf6a"/><ellipse cx="50" cy="60" rx="34" ry="26" fill="#5fbf6a"/>
      <circle cx="33" cy="34" r="7" fill="#fff"/><circle cx="67" cy="34" r="7" fill="#fff"/><circle cx="34" cy="35" r="4" fill="${T}"/><circle cx="66" cy="35" r="4" fill="${T}"/>
      <path d="M30 64 q20 16 40 0" fill="none" stroke="${T}" stroke-width="3" stroke-linecap="round"/>${mejillas(60, 25)}`
  },
  {
    id: 'buho', nombre: 'Búho', fondo: '#1e7fd0',
    svg: `<path d="M24 34 L30 18 L40 28 M76 34 L70 18 L60 28" fill="#8a5a3c"/><path d="M50 88 C28 88 20 70 20 52 C20 34 34 24 50 24 C66 24 80 34 80 52 C80 70 72 88 50 88 Z" fill="#a86f48"/>
      <path d="M50 88 C38 88 32 78 32 70 C38 74 44 75 50 75 C56 75 62 74 68 70 C68 78 62 88 50 88 Z" fill="#e9c79a"/>
      <circle cx="37" cy="48" r="12" fill="#fff4e0"/><circle cx="63" cy="48" r="12" fill="#fff4e0"/><circle cx="37" cy="48" r="6" fill="${T}"/><circle cx="63" cy="48" r="6" fill="${T}"/>
      <circle cx="39" cy="46" r="2" fill="#fff"/><circle cx="65" cy="46" r="2" fill="#fff"/><path d="M45 58 h10 l-5 7 z" fill="#ffb35c"/>`
  },
  {
    id: 'pollito', nombre: 'Pollito', fondo: '#e8475b',
    svg: `<path d="M44 26 q4 -10 8 0 q4 -8 7 2" fill="none" stroke="#f2c230" stroke-width="5" stroke-linecap="round"/><circle cx="50" cy="58" r="31" fill="#ffd84a"/>
      ${ojos(52, 12)}${brillo(52, 12)}<path d="M43 61 L57 61 L50 70 Z" fill="#ff8a3c"/>${mejillas(64, 21)}`
  },
  {
    id: 'ballena', nombre: 'Ballena', fondo: '#ff5b1f',
    svg: `<path d="M50 30 q-6 -10 -12 -6 M50 30 q6 -10 12 -6 M50 30 v-8" fill="none" stroke="#7fd3ff" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M16 62 C16 44 32 34 50 34 C68 34 84 44 84 62 C84 78 68 84 50 84 C32 84 16 78 16 62 Z" fill="#4f8fd8"/>
      <path d="M22 70 C30 80 70 80 78 70 C72 78 62 82 50 82 C38 82 28 78 22 70 Z" fill="#cfe6ff"/>${ojos(56, 14)}${brillo(56, 14)}${sonrisa(64, 6)}${mejillas(64, 23)}`
  },
  {
    id: 'robot', nombre: 'Robot', fondo: '#3346a8',
    svg: `<path d="M50 26 v-10" stroke="${T}" stroke-width="3" stroke-linecap="round"/><circle cx="50" cy="14" r="5" fill="#ff6369"/>
      <rect x="20" y="28" width="60" height="54" rx="16" fill="#dde3ee"/><rect x="14" y="48" width="8" height="16" rx="4" fill="#9aa4b8"/><rect x="78" y="48" width="8" height="16" rx="4" fill="#9aa4b8"/>
      <rect x="28" y="38" width="44" height="28" rx="10" fill="${T}"/><circle cx="40" cy="52" r="5" fill="#c4f246"/><circle cx="60" cy="52" r="5" fill="#c4f246"/>
      <path d="M38 74 h24" stroke="#9aa4b8" stroke-width="4" stroke-linecap="round"/>`
  },
  {
    id: 'alien', nombre: 'Alien', fondo: '#c2410c',
    svg: `<path d="M36 28 L28 12 M64 28 L72 12" stroke="#5fbf6a" stroke-width="3.5" stroke-linecap="round"/><circle cx="28" cy="12" r="5" fill="#c4f246"/><circle cx="72" cy="12" r="5" fill="#c4f246"/>
      <path d="M50 88 C30 88 18 70 18 52 C18 34 32 24 50 24 C68 24 82 34 82 52 C82 70 70 88 50 88 Z" fill="#7ed957"/>
      <ellipse cx="36" cy="54" rx="9" ry="12" fill="${T}" transform="rotate(-18 36 54)"/><ellipse cx="64" cy="54" rx="9" ry="12" fill="${T}" transform="rotate(18 64 54)"/>
      <circle cx="38" cy="50" r="2.6" fill="#fff"/><circle cx="66" cy="50" r="2.6" fill="#fff"/>${sonrisa(74, 5)}`
  }
];
export const avatarDe = (id?: string | null) => AVATARES.find((a) => a.id === id) ?? null;

/** Los colores pastel de antes (perfiles ya guardados y fondos de avatar) pasados a los de la marca */
const MARCA: Record<string, string> = {
  '#c4f246': '#ff5b1f', '#7fd3ff': '#1e7fd0', '#ff8fb1': '#e8475b', '#ffb35c': '#c2410c',
  '#b69cff': '#3346a8', '#ffe08a': '#b98500', '#a8e6c1': '#18895b'
};
export const colorMarca = (c: string | null | undefined) => (c ? MARCA[c.toLowerCase()] ?? c : c);
