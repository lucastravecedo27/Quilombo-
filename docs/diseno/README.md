# Handoff: Quilombo — rediseño de las 3 apps (Jugador, Mesero, Club)

## Overview
Rediseño completo de Quilombo, la red social del pádel en Colombia conectada con los clubes. Incluye:
1. **App del jugador** (iPhone, 393 × 852): Social · Jugar · Chat · Perfil, Tarjeta Quilombo, partido/tiquete, pagos, saldo, ranking, resultados, calendario, torneos, clases con profe y **modo profesor**.
2. **App del mesero** (iPhone, 393 × 852): ¿Quién eres? · Pedidos · Canchas · Tarjetas · Nuevo.
3. **Panel del club** (Mac/PC, 1440 × 900): Hoy · Agenda · Bar · Tarjetas · Clases · Torneos · Ranking · Carta · Caja + columna EN VIVO.

El código actual vive en `~/Desktop/QUILOMBO ` (Svelte 5 + Framework7 + Capacitor + Supabase + Dexie). Las rutas, dominios y datos de demo ya existen allí (`src/routes.ts`, `src/lib/social/**`, `src/mesero/**`, `src/club/**`, `src/lib/app/demo.ts`). Este paquete describe **cómo debe verse y comportarse**; la lógica de negocio ya está implementada en el repo.

## About the Design Files
Los archivos de `prototipos/` son **referencias de diseño hechas en HTML** (prototipos navegables con estado simulado), **no código de producción**. La tarea es **recrear estos diseños dentro del codebase existente** (Svelte 5 + Framework7, componentes en `src/lib/**/ui`, tokens en `src/styles/tokens.css`) siguiendo sus patrones: `$state`/`$derived`, `ui.navegar`, `ui.avisar`, hojas con `Hoja.svelte`, íconos con `Icon.svelte`. No copiar el HTML tal cual; los estilos inline del prototipo deben pasar a `<style>` de cada componente usando las variables `--q-*`.

Para verlos: abrir cualquier `.dc.html` en el navegador (necesitan `support.js`, `fonts/` e `img/` al lado). A la izquierda de cada teléfono hay un panel de demo con selector de acento y botones que disparan los flujos de la reunión.

## Fidelity
**Alta fidelidad (hi‑fi).** Colores, tipografía, espaciados, radios, copy y estados son finales. Recrear pixel‑perfect.

Decisiones abiertas del cliente:
- **Acento**: está parametrizado (azul cancha por defecto; también naranja, verde cancha y azul noche). El cliente no ha decidido si se queda el naranja. Implementar el acento como **una sola variable** (`--q-acc`) para poder cambiarlo.
- **Fondo claro** en las 3 apps (el cliente rechazó el panel oscuro). El modo oscuro del jugador/mesero se mantiene como opción.

---

## Design Tokens

### Colores base (modo claro, "tiza")
| Token | Hex | Uso |
|---|---|---|
| `--q-bg` | `#F4F2EC` | Fondo de pantallas |
| `--q-card` | `#FFFFFF` | Tarjetas, barra de pestañas, hojas |
| `--q-sub` | `#E9E6DE` | Chips/botones suaves, inputs, fondos de íconos |
| `--q-line` | `rgba(14,27,51,.10)` | Bordes de tarjetas, separadores |
| `--q-borde` | `rgba(14,27,51,.14)` | Bordes punteados, botones secundarios |
| `--q-tx` | `#0E1B33` | Texto principal (azul noche) |
| `--q-tx2` | `#5B6478` | Texto secundario |
| `--q-tx3` | `#9AA1B0` | Terciario, deshabilitado |
| `--q-ok` | `#18895B` | Pagado, confirmado |
| `--q-noche` | `#0E1B33` | Tarjetas "héroe" (tiquete, ranking, Tarjeta Quilombo, toasts) |

Modo oscuro (`html.dark`): bg `#0A1226`, card `#111C36`, sub `#1B2847`, line `rgba(220,230,255,.09)`, borde `rgba(220,230,255,.14)`, tx `#F1F4FA`, tx2 `#93A0BC`, tx3 `#5D6A86`, ok `#3CCF8E`.

### Acento (una variable, 4 opciones)
| Opción | `--acc` (fondos/bordes) | `--acct` (texto sobre claro) | `--accd` (sobre azul noche) | `--accs` (tinte) |
|---|---|---|---|---|
| **azul** (defecto) | `#1E7FD0` | `#1A6FB8` | `#2F8FE0` | `rgba(30,127,208,.12)` |
| naranja | `#FF5B1F` | `#E04A12` | `#FF5B1F` | `rgba(255,91,31,.12)` |
| verde | `#18895B` | `#147A50` | `#3CCF8E` | `rgba(24,137,91,.12)` |
| noche | `#0E1B33` | `#0E1B33` | `#F4F2EC` | `rgba(14,27,51,.08)` |

El acento se usa en: pestaña activa (texto + rayita de 36 × 3 px arriba), botones primarios, chips seleccionados, aro de historias, aro decorativo de tarjetas navy, código QR del mesero, borde de pedidos nuevos y franjas apartadas.

### Colores "fiesta" (fijos, no cambian con el acento)
Rojo marcador `#E8475B` (EN VIVO, contadores sin leer, derrota) · Dorado trofeo `#B98500` (resultado por confirmar, 1.º del podio) · Ladrillo `#C2410C` (Americano nocturno, 3.º) · Azul profundo/lila `#3346A8` (clases, profes, solicitudes) · Clase en panel `#5B4FD0` · Advertencia `#A86B00` sobre `#FFE9B8` · Error `#D42A3A`.

### Tipografía
Fuentes empaquetadas en `prototipos/fonts/` (las mismas de `@fontsource` del repo).
- **Títulos**: Barlow Condensed **900 italic**, MAYÚSCULAS. H1 de pestaña 50 px / line-height .9. Títulos de overlay 26 px. Secciones (h2) **800 italic 22 px**.
- **Números grandes** (precios, puntos, horas, marcadores): Barlow Condensed 900 italic (24–72 px).
- **Texto**: Barlow 400–800. Cuerpo 15 px; secundario 13–13.5 px; mínimo 11.5 px (overlines en mayúsculas, letter-spacing .08–.14em, weight 800).
- Barra de pestañas: Barlow Condensed 700, 12.5 px, uppercase, letter-spacing .06em.
- Wordmark: `QUILOMBO` en Barlow Condensed 900 italic, letter-spacing .14em (15 px sobre "TU RED").

### Radios / espaciado / sombras
- Tarjetas 14–16 px; tarjetas héroe 18–22 px; botones 10–12 px; chips 8–10 px; hojas inferiores 24 px arriba; avatares círculo.
- Margen lateral de pantalla 16 px (títulos 20 px). Gap entre tarjetas 8–12 px. Separación entre secciones 22–24 px.
- Botones: primario 52–54 px alto (60 px en mesero); chico 38–40 px; objetivos táctiles ≥ 44 px.
- Sombras: teléfono/tarjeta héroe `0 12px 30px rgba(14,27,51,.08)`; toast `0 14px 34px rgba(14,27,51,.35)`; botón Q central `0 10px 24px rgba(14,27,51,.35), 0 0 0 4px var(--card)`.
- Motivo gráfico de marca: **aro** (círculo con borde grueso 18–26 px en `--accd`) saliendo por la esquina de tarjetas navy.

### Animaciones
- Entrada de overlays: `translateY(22px)→0` + fade, 350 ms.
- Hojas inferiores: `translateY(105%)→0`, 380 ms `cubic-bezier(.32,.72,0,1)`; fondo `rgba(10,18,38,.45)` con fade 250 ms.
- Éxito (check de pago): pop `scale(.6)→1.08→1`, 500 ms (`--q-spring`).
- EN VIVO: punto parpadeando (`opacity 1↔.25`, 1.2 s). Ticker: `translateX(0→-50%)` lineal 34 s, lista duplicada.
- Brillo de la Tarjeta Quilombo: franja blanca 7 % rotada 20° que cruza cada 5 s.
- Mesero: banner de pedido nuevo baja con spring 350 ms y la campana se sacude 3 veces.
- Respetar `prefers-reduced-motion`.

---

## 1. App del JUGADOR — `prototipos/Quilombo Jugador.dc.html`

### Estructura global
- Barra inferior fija de 58 px + safe area, fondo `--q-card`, borde superior `--q-line`. **5 posiciones**: Social · Jugar · **[Q]** · Chat · Perfil. La activa en `--acct` con rayita 36 × 3 px arriba (transición de ancho 240 ms). Chat muestra un globo rojo con los no leídos.
- **Botón Q central** (nuevo): 62 × 62, radio 20, fondo `#0E1B33`, levantado 18 px, "Q" en Barlow Condensed 900 italic de 32 px con un aro de acento en la esquina. Abre la **Tarjeta Quilombo** desde cualquier pestaña.
- Las pantallas secundarias son overlays de pantalla completa con botón "volver" circular de 40 px (`--q-sub`) y título de 26 px. Al volver se regresa a la pantalla de origen (pila de 1 nivel: p. ej. Clases → Perfil del profe → volver a Clases).
- Toast arriba (debajo de la isla): fondo navy, check verde de 30 px, título 15 px y sub 13 px; dura 2,8 s.

### Social (inicio)
1. Encabezado: `QUILOMBO` (15 px, acento) sobre **"TU RED"** (50 px). A la derecha, botones circulares de 44 px: Buscar y Chats (con globo rojo "2").
2. **Ticker EN VIVO** (nuevo): franja de 34 px a todo el ancho, fondo navy; etiqueta roja "● EN VIVO" a la izquierda y movimientos de la red desplazándose ("Juan confirmó para hoy 7:30 p. m.", "Americano nocturno: quedan 6 cupos"…).
3. Historias: círculos de 64 px con aro cónico (acento → azul → rojo → dorado), el aro se vuelve gris al verla. La primera es "Comparte" con un "+".
4. **Tu próximo partido** (nuevo, héroe): tarjeta navy de radio 18. Overline "TU PRÓXIMO PARTIDO", día y hora en dos líneas de 54 px ("HOY" / "7:30 P. M."), club · cancha. Debajo de una línea punteada: caras de los 4 jugadores superpuestas y chip "⏳ 87:00 para pagar" (cuenta regresiva viva) o "✓ PAGADA" en verde. Toca → tiquete.
5. **Por resolver** (nuevo agrupador con contador): aviso dorado "Andrés propuso un resultado · 6-4 3-6 7-5 · Ver ›"; tarjeta blanca "Juan te pide $60.000" con botón **Pagar mi parte**; solicitud lila "Vale te agregó como pareja de juego" con **¡Sí!** / ✕.
6. Ranking: tarjeta blanca "RANKING NACIONAL" · **"VAS #148"** (40 px) · "1.250 pts · 23–14 · racha 🔥3" + mini gráfico de barras de los últimos 6 (G en acento, P en `--q-sub`).
7. Feed: segmentado de 3 (📸 Fotos · 🎾 Partidos · 💬 Actividad). Posts: autor, foto 4:3 o **marcador estilo TV** (tabla navy con sets; el set ganado al 100 % y el perdido al 45 %), texto y reacciones ❤️ 🔥 💬 que se pueden alternar.

### Jugar
- "JUGAR" + **chip de saldo** navy (cuadro "Q" de acento + "SALDO / $142.000") → Saldo.
- Botones: "📅 Invitar a jugar" (primario) y "＋ Recargar".
- 3 accesos: Mi calendario · **Tu tarjeta** (navy) · Clases con profe.
- **Tus reservas**: tarjeta‑tiquete con talón izquierdo de 84 px (navy si está apartada, verde si está pagada) que muestra día y hora; a la derecha el club, el chip ⏳ APARTADA / ✓ PAGADA, cancha · precio y una nota ("Paga antes de las 4:30 p. m. · quedan 86:12" o "Código ABA7CD").
- Te invitaron: partido de Juan con **Voy** / **No puedo**.
- **Canchas libres**: chips de ciudad (📍 Medellín / Bogotá / Cali), día en cajitas de 58 × 56 (Hoy 12, Mañ 13, Mié 14…; la elegida en navy), cuadrícula de 2 columnas: hora grande (30 px), club, cancha y "Reservar". Toca → hoja Reservar.
- Torneos cerca: tarjetas sólidas de color (ladrillo, lila, verde) con un botón blanco **Yo voy** / ✓ Inscrito / ⏳ Revisión. Al tocar la tarjeta se abre el detalle.

### Hoja "Reservar cancha"
Club · dirección; bloque navy con DÍA, hora (36 px), "hasta 9:00 p. m. · 90 min" y PRECIO a la derecha separado por una línea punteada; cancha (Techada / Cristal / Panorámica); "¿Con quién juegas? (opcional)" con avatares de 48 px que se pueden alternar (aro de acento). Botones: **Reservar y pagar · $160.000** y **Apartar (pagas después)**.

### Partido (tiquete)
- Banda superior: acento ("⏳ APARTADA · Tienes hasta las 4:30 p. m." + reloj **mm:ss** de 40 px) o verde ("✓ PAGADA · Reserva confirmada").
- "CÓDIGO DE RESERVA" con **ABA7CD** de 54 px y letter-spacing .12em; cuadrícula 2 × 3 (Club, Dirección, Fecha, Hora, Cancha, Precio); perforación con muescas circulares de 24 px a los lados; "Quiénes van": 4 avatares de 46 px con un mini badge ✓ / ❔.
- La cancha: total; **Pagar** / **✂️ Dividir**. Con la cancha dividida, se ven filas por jugador con ✓ Pagada / ⏳ Pendiente y **Cubrir su parte**. Cuando todas las partes quedan pagadas, la reserva pasa a PAGADA.
- Bar del club: botón navy "🍹 Pedir a la cancha".
- Resultado: botón punteado "🎾 Registrar resultado".

### Hojas Pagar / Dividir / Pedir
- **Pagar**: concepto (overline) + monto de 56 px; lista de métodos con radio: **Saldo Quilombo** (primero, con el disponible), Nequi, PSE, Tarjeta •••• 4242. Si no alcanza: aviso amarillo "Te faltan $Y" + **Recargar**, y el botón queda deshabilitado (opacidad .4). Al pagar: spinner "Procesando…" (~1,3 s) → check verde, **PAGO APROBADO**, método y referencia → **¡Listo!**.
- **Dividir**: Mitad y mitad / Entre los 4 / Por montos, una vista previa por persona y **Enviar cobros y pagar mi parte**. En el demo Juan paga a los 3 s (toast).
- **Pedir a la cancha**: carta con − / +; **Pagar $X con saldo**. Lo pedido aparece en Consumos de hoy de la tarjeta.

### Tarjeta Quilombo (pieza estrella)
Fondo de pantalla `#0A1226`. La tarjeta: radio 22, fondo `#0E1B33`, borde `rgba(220,230,255,.16)`, sombra `0 30px 60px rgba(0,0,0,.45)`, aro de 26 px de acento arriba a la derecha y el brillo animado. Contiene: `QUILOMBO` (26 px) / "TARJETA DE SOCIO"; **QR** de 176 px sobre un cuadro blanco de radio 16 (contenido `quilombo:tarjeta:Q7K2MX`, igual que `qrTarjeta()` en el repo); código **Q7K2MX** de 34 px con letter-spacing .32em; pie con el nombre, "4ª · Medellín · La 70" y SALDO (30 px). Debajo: "Muéstrale tu tarjeta al mesero: lo que pidas se descuenta de tu saldo.", 3 botones (🍹 Pedir · 🛑 Poner tope · ✂️ Dividir) y la lista "Consumos de hoy" ("Pagado con saldo ✓ · Entregado").

### Saldo
"DISPONIBLE" + monto de 72 px; recarga con 50 / 100 / 200 / 500 mil (cajas con borde de acento al elegirlas) y el botón **Recargar $X**, que abre Pagar sin la opción de saldo; movimientos (+ en verde, − en tinta).

### Ranking nacional
Podio de 3 columnas (2.º, 1.º, 3.º; alturas 92 / 120 / 72 px; dorado, gris y ladrillo), filtros (Todos, 4ª, ciudades), tabla con puesto, avatar, nombre, "4ª · Medellín · V–D", puntos y delta ▲ / ▼. Mi fila con fondo `--accs`. Barra navy fija abajo: **TU POSICIÓN #148** y pts · V–D · %.

### Resultado
Banner de estado (⏳ dorado-oscuro "Vale cuando los 4 confirmen", ✓ verde "Válido · +19 pts", ⚖️ rojo "En disputa · lo resuelve el club"); **marcador estilo TV** navy con S1 / S2 / S3 (el set ganado en `--accd`); "Lo propuso…"; lista de confirmaciones por jugador; botones **✓ Confirmo** (verde) / **No estoy de acuerdo**. Al confirmar se recalcula el ranking (subo de #148 a #146).

### Perfil
- Jugador: tarjeta con portada navy (aro de acento + "4ª" gigante al 10 %), avatar de 88 px superpuesto, nombre de 32 px, @usuario · club · ciudad, 4 stats (Puntos, Nacional, V–D, Racha); Récord con barra verde/roja y los últimos 4 resultados; botones Tu tarjeta / Saldo / Mi calendario / Ranking / Clases con profe.
- **Modo profesor** (en el demo, "Usar la app como → Profe Diego"): tarjeta lila `#3346A8` con "🎓 MODO PROFESOR", Diego Salazar, especialidad ★; 3 cifras (Esta semana $, Alumnos, Horarios); **＋ Abrir horario**, Editar perfil, Ver como alumno; "Mi agenda de clases" por día, con un borde izquierdo de 4 px (lila si está abierta, verde si está llena), los chips de alumnos y ✕ para cancelar (devuelve el saldo a los alumnos).

### Clases con profe / Perfil del profe
- Lista: intro lila "ELIGE CON QUIÉN MEJORAR", "Mis clases" (con Cancelar), filtros de ciudad, nivel (Iniciación, 6ª… "4ª · tú") y tipo; tarjeta de profe con borde superior lila de 4 px: avatar de 56, nombre de 22 px, 🎓 especialidad, ★ 4,9 (87) · años, chip de niveles, clubes y "desde $50.000 · Próxima: Mar 13 7:30 a. m.".
- Perfil del profe: portada lila centrada (avatar de 96, sello 🎓 PROFESOR, nombre de 36 px, chips de niveles, clubes, certificaciones e idiomas), bio, precios (individual / grupal), **horarios por día** en 2 columnas con chip Reservar / ✓ Reservada / Llena, y reseñas con estrellas.
- Hoja Reservar clase → Pagar (tipo clase). Al volver, aparece "★ Cuéntale a otros cómo te fue" → hoja de reseña (5 estrellas + texto).
- Hoja **Abrir horario** (profe): 1 · Club → 2 · Día → 3 · Cancha libre → 4 · Tipo (individual / grupal con cupos −/+) y precio → **Abrir horario**.

### Calendario
Mes en cuadrícula de lunes a domingo (celdas de 46 px; hoy con borde de tinta; el día elegido en navy). Puntos: acento = mis partidos, dorado = mis torneos, lila = clases; borde azul `#1E7FD0` = torneos que me sirven. Debajo, la agenda del día elegido y "Torneos para ti" con **Yo voy**.

### Torneo
Cabecera de pantalla completa con el color del torneo, el aro y el título de 46 px. Banner de estado (⏳ Comprobante en revisión / ✓ Inscrito / ✕ Rechazado + **Subir otro**), 3 cifras, organiza · formato · premios y la descripción; botón **Yo voy · $60.000 por pareja**. Hoja de inscripción: categoría, pareja (Juan / Vale / Caro / 🔎 Busco pareja), segmentado **💳 Tarjeta / 📎 Comprobante**. El comprobante muestra la cuenta del club (Bancolombia ahorros 031-458921-07) y el monto, con 📷 Tomar foto / 🖼️ Elegir captura y la miniatura del archivo adjunto → **Enviar comprobante**.

---

## 2. App del MESERO — `prototipos/Quilombo Mesero.dc.html`
Claro, letras grandes y botones de 48–60 px para usar con una mano.
- **¿Quién eres?**: overline "PÁDEL CLUB LA 70", título de 62 px, filas de 80 px con inicial en un cuadro de color de 52 px (Camilo naranja, Daniela verde).
- Encabezado blanco: `QUILOMBO` en acento + "Pádel Club La 70 · Bar", botón **QR** (acento, 46 px) y el chip del mesero.
- Barra inferior blanca: Pedidos (globo con los nuevos) · Canchas · Tarjetas · Nuevo. La activa en `--acct` sobre `--accs`.
- **Pedidos**: 3 contadores (Nuevos en acento, Preparando en navy, Por cobrar en blanco). Grupos Nuevos (punto parpadeando) → Preparando → Entregados. Cada tarjeta muestra la **UBICACIÓN de 40 px** (CANCHA 1), "#47 · cliente · hace 1 min", la marca 📱 App / 🛳️ Tarjeta / 🧾 Mesero, las líneas con emoji y cantidad de 24 px, el total de 28 px, "Pagado con saldo ✓" o "Por cobrar" (en rojo) y el botón de acción de 54 px: **Tomar pedido** → **Entregado** → **Cobrar** (hoja: Efectivo / Datáfono / Nequi / Tarjeta Quilombo) o **Archivar**.
- Banner **¡PEDIDO NUEVO! CANCHA 2** (acento) / **Nueva reserva · Cancha 4** (azul), que baja desde arriba durante 5,5 s. Sonido y vibración como en el repo (`timbre()`).
- **Canchas**: tarjeta por cancha con un cuadro de número de 58 px (acento si está ocupada, rojo si le quedan menos de 5 min, lila si es clase, gris si está libre), quién juega, horario, "QUEDAN 34 min", barra de avance, chips (✓ Llegaron, 🍹 Bar $), la próxima reserva con su estado y **＋ Pedido** (abre Nuevo con la cancha ya puesta). Una reserva nueva aparece con borde de acento.
- **Tarjetas**: visor de cámara de 280 px con esquinas de acento y una línea que escanea; el código de 6 en cajas de 58 px con teclado; "Tarjetas de hoy" (el saldo en rojo si es menor a $30.000); **✂️ Dividir entre tarjetas**.
- Hoja de **cuenta** (al leer la tarjeta): cabecera navy con avatar, 🛳️ código y SALDO de 32 px; 6 productos rápidos en cuadrícula con un badge de cantidad; **Cobrar $T con saldo** → "Cobrando…" → **PAGADO ✓** "$18.000 · le quedan $124.000". Si no alcanza: aviso amarillo "Saldo insuficiente · que recargue" y la opción de otro método.
- Hoja **Dividir entre tarjetas**: avatares que se pueden elegir, Mitad y mitad / Iguales / Montos, partes con ✓ Pagado con saldo / ✖ Saldo insuficiente.
- **Nuevo**: ubicación en 6 botones (Cancha 1–4, Barra, Terraza), a nombre de quién, categorías (Bebidas / Comida / Tienda), carta con − / + de 44 px, nota y un botón fijo **Enviar pedido · $X**.

## 3. Panel del CLUB — `prototipos/Quilombo Club.dc.html`
1440 × 900, **claro**. Rejilla `240px | 1fr | 300px`.
- **Barra lateral blanca**: raya de 3 px de acento arriba, `QUILOMBO CLUB` (32 px; "CLUB" en acento), Pádel Club La 70 · Laureles · Medellín, 9 secciones (la activa con fondo `--accs` + `inset 3px 0 0 var(--acc)`; globos de acento cuando hay algo urgente: bar nuevo, comprobantes, disputas). Abajo: **🛳️ Cobrar con tarjeta**, ＋ Nuevo producto, Laura Gómez · Administradora, "Modo demo · En vivo con los celulares".
- **Columna EN VIVO** (blanca): un punto rojo que parpadea; cada movimiento lleva un borde izquierdo de 3 px por tipo (reserva = acento, pago = verde, pedido = azul, torneo = dorado, clase = lila, disputa = rojo). Los que llegan se resaltan con `--accs` durante 4 s. Un aviso tipo transmisión baja desde arriba al centro (480 px) y lleva a su sección al tocarlo.
- **Hoy**: overline con fecha y hora, **"ASÍ VA EL CLUB HOY"** (52 px), chip rojo EN VIVO; 4 canchas vistas desde arriba (piso azul si está ocupada, lila si es clase, arena si está libre; con las líneas de la cancha, el número de 40 px, "34 MIN" y la barra de avance; la que está terminando pulsa); los indicadores: ingresos ($3.482.000, barra apilada por concepto), anillo de ocupación, pedidos abiertos y tarjetas activas; "Ingresos por hora" en barras apiladas (las horas futuras al 25 %); "Reservas nuevas".
- **Agenda**: 7 días × 11 turnos (6:00 a. m. a 9:00 p. m. cada 90 min) × 4 canchas. Estados: Libre (punteado, con el precio) / Apartada (borde de acento de 2 px, `--accs`, "Falta pago · vence 4:30") / Pagada (azul `#1E5FAE`→`#1A4A8A`, "✓ Llegaron") / Clase (lila) / Bloqueada (rayado). Marcas 📱 / 📞. La franja nueva brilla 3 veces. Tocar una abre un **cajón derecho de 400 px** con el estado, los datos, el precio con − / + y acciones según el estado (Reservar para un cliente, Bloquear, Cobrar, Liberar, 👋 Llegaron, Desbloquear).
- **Bar**: kanban de 4 columnas (Nuevos → Preparando → Entregados → Pagados) con un botón para pasar cada pedido a la siguiente.
- **Tarjetas Quilombo**: 3 indicadores y la tabla Jugador / Código / Consumo hoy / Saldo / Último. **Cobrar con tarjeta en caja**: un modal con el visor de la cámara del Mac → jugador y saldo → "Cobrar $32.000 con saldo" → "Pagado ✓ · le quedan…".
- **Clases**: indicadores, la lista de la semana (borde por estado) y los profes del club con sus ingresos.
- **Torneos**: 3 tarjetas de color (la elegida con un aro de tinta; "2 comprobantes por revisar" parpadea); la tabla de inscritos con el estado y **Revisar comprobante**, que abre un modal de 720 px con el comprobante Nequi grande a la izquierda y **✓ Aprobar** / **Rechazar con motivo** (El monto no coincide, Comprobante ilegible, Cuenta equivocada).
- **Ranking**: "En disputa" con el marcador navy, el motivo citado y las acciones Ganó A / Ganó B / Anular; "Pendientes de confirmar" y el ranking del club.
- **Carta**: categorías en una cuadrícula de 4, un switch de disponible (verde) y el modal **Nuevo producto** (emoji, nombre, categoría, precio).
- **Caja**: el total en el título; barras por método (Saldo Quilombo, Tarjeta/PSE, Efectivo, Datáfono, Nequi) y por concepto; la tabla de pagos del día.

---

## Interacciones clave (flujos de la reunión)
1. Reservar y pagar → la reserva queda PAGADA en Jugar y en la Agenda del club.
2. Tarjeta: el mesero escanea, carga 2 cervezas y cobra con saldo → baja el saldo del jugador → Caja.
3. Mitad y mitad → Juan paga su parte → la reserva pasa a PAGADA.
4. Torneo: Yo voy + comprobante → ⏳ en revisión → el club aprueba → ✓ Inscrito.
5. Resultado: confirmar → con los 4 confirmados queda válido → +19 pts y el ranking se mueve.
6. Clase con Mónica pagada con saldo → la franja queda como "Clase · Mónica Arias" en la Agenda.
7. Modo profesor: Diego abre un horario → aparece en su perfil público.

En los prototipos estos flujos están simulados con temporizadores (p. ej. "Juan pagó" a los 3 s, "el club aprobó" a los 4,5 s). En producción deben venir de la sincronización Supabase/Dexie que ya existe (`sync.ts`, `hub.ts`, `observar*` en `src/club/estado.svelte.ts`).

## State Management
Ya resuelto en el repo (`datos.svelte.ts`, `ui.svelte.ts`, `src/mesero/estado.svelte.ts`, `src/club/estado.svelte.ts`). Hay que añadir:
- `ui.tarjeta` (overlay de la Tarjeta desde el botón Q central).
- Una pila de 1 nivel para volver entre overlays (Clases → Profe).
- La preferencia de acento (`--q-acc`, guardada como el tema).

## Assets
- Fuentes: `prototipos/fonts/` (Barlow 400–800; Barlow Condensed 700, 800 italic y 900 italic), copiadas del build del repo.
- Imágenes del feed: `prototipos/img/cancha.svg`, `podio.svg`, `raquetas.svg` (de `public/demo-social/`).
- Íconos: los mismos trazos de 2 px de `src/lib/ui/icons.ts` (parche, estrella, chat, persona, buscar, chevron, cerrar, check, subir). El QR del mesero usa el ícono del repo.
- QR: en el prototipo se genera con `qrcode-generator` (CDN); en el repo usar `qrcode` como hoy.
- Pendiente: logotipo y app icon finales.

## Files
- `prototipos/Quilombo Jugador.dc.html`: app del jugador + modo profesor.
- `prototipos/Quilombo Mesero.dc.html`: app del mesero.
- `prototipos/Quilombo Club.dc.html`: panel del club.
- `prototipos/support.js`: el runtime necesario para abrir los prototipos.
- `brief-original.md`: el brief del cliente, con los datos de ejemplo (precios, nombres, clubes).
