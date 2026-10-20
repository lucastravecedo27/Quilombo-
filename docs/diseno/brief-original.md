# Quilombo — Brief de diseño de interfaz

> Para diseñar la interfaz (Claude Design u otra herramienta). Describe la marca, las 4 experiencias, cada pantalla con su contenido real y los flujos que hay que mostrar en la reunión.
> El código vive en `~/Desktop/QUILOMBO ` (la carpeta tiene un espacio al final). Para ver lo actual, doble clic en **Abrir Quilombo.command**.
> Las capturas de cómo se ve hoy están en la carpeta **Quilombo — capturas** (junto a este archivo).

---

## 1. Qué es Quilombo

La red social del pádel en Colombia, conectada con los clubes. Un jugador:
- tiene su **perfil de jugador**: categoría (1ª a 6ª), puntos de ranking, club base, ciudad, récord de victorias y derrotas;
- arma partidos con su gente, **reserva canchas** en su ciudad y las paga;
- se inscribe a **torneos** que organizan los clubes (paga con tarjeta o adjunta comprobante);
- reserva **clases con el profesor** que quiera;
- tiene **Saldo Quilombo** (recarga por PSE, tarjeta o Nequi) y con eso paga todo: cancha, bar, torneos y clases;
- tiene su **Tarjeta Quilombo**: un QR único y permanente. El mesero lo escanea y lo que pide se descuenta de su saldo (el "modo crucero");
- puede **pagar mitad y mitad o entre varios**: cada uno paga su parte con su saldo, desde la cancha hasta lo consumido;
- registra **resultados**. Solo cuentan si **los 4 jugadores confirman**; si alguno no está de acuerdo, el club lo resuelve. En torneos, el club digita el resultado oficial;
- sube en el **ranking nacional**.

El **club** (por ejemplo, Pádel Club La 70 en Medellín) contrata Quilombo y usa:
- un **panel en el computador** con agenda de canchas, bar, carta, torneos, caja, tarjetas y resultados en disputa;
- una **app de mesero** en el celular para tomar pedidos, escanear tarjetas y cobrar con saldo.

## 2. Las 4 experiencias

| Experiencia | Dispositivo | Quién | Dirección en la demo |
|---|---|---|---|
| **Jugador** | iPhone | cualquier persona | `/` |
| **Profesor** | iPhone (la misma app, con "modo profesor") | profe de pádel | `/` (Perfil → Usar la app como → un profe) |
| **Mesero** | iPhone | personal del club | `/mesero` |
| **Club (oficina)** | Mac o PC | administrador del club | `/club` |

Además está la **Sala de demo** (`/demo`), que muestra en el Mac las 3 apps a la vez (jugador y mesero en marcos de iPhone, y el club) y los QR para abrirlas en los iPhone.

## 3. Marca

- **Nombre:** QUILOMBO (siempre en mayúsculas en el logotipo).
- **Personalidad:** deportiva, con energía de transmisión deportiva, colombiana y cercana ("¿Jugamos?", "una chimba", "parce"), nunca corporativa. **No debe parecerse a Selffin**: nada de colores pastel, nada de píldoras flotantes, nada de esquinas muy redondas.
- **Tipografía:**
  - Títulos en **Barlow Condensed** 800–900, *itálica*, MAYÚSCULAS ("ASÍ VA EL CLUB HOY", "TUS RESERVAS").
  - Texto en **Barlow** 400–800.
  - Números grandes (precios, puntos, marcadores) en Barlow Condensed itálica.
- **Colores:**
  - Azul noche (tinta) `#0E1B33` · Noche oscura `#0A1226`
  - **Naranja Quilombo** `#FF5B1F`, el acento y lo seleccionado
  - Azul cancha `#1E7FD0` · Verde cancha `#18895B` · Dorado trofeo `#B98500` · Rojo marcador `#E8475B`
  - Fondo tiza `#F4F2EC` en la app del jugador (modo claro) · tarjetas blancas
  - El panel del club es oscuro, estilo transmisión: fondo `#0A1226`, tarjetas de vidrio, brillos de color
- **Formas:** esquinas de 10 a 16 px en tarjetas y 10 a 12 px en botones; los avatares son círculos.
- **Iconografía:** trazo limpio, 2 px. Los emoji se usan en productos (🍺 🥟 🎾) y en estados (✓ ⏳ 🔥).
- **Modos:** el jugador y el mesero tienen claro y oscuro. El club es oscuro.

## 4. App del JUGADOR (iPhone)

Barra inferior fija, a todo el ancho: **Social · Jugar · Chat · Perfil**. La pestaña activa va en naranja, con una rayita arriba.

### Social (inicio)
- Logotipo QUILOMBO, título "TU RED", botón de mensajes con contador.
- Historias de los amigos (círculos con la foto).
- Accesos: Foto · Resultado · Invitar a jugar · Buscar.
- **Avisos**: "Andrés propuso un resultado · confírmalo", "Juan te pide $60.000 de la cancha · Pagar mi parte".
- Tarjeta **Ranking nacional · Vas #N** con puntos y V–D.
- Solicitudes de amistad.
- Feed en 3 secciones: 📸 Fotos · 🎾 Partidos · 💬 Actividad. Las publicaciones tienen foto o marcador, reacciones (❤️ 🔥 🏆 🎾 😂 👏 😬) y comentarios.

### Jugar
- Encabezado "JUGAR", **chip de saldo** ($142.000) y botón "Invitar a jugar".
- Accesos: **Mi calendario · Tu tarjeta 🛳️ · Clases con profe**.
- **Tus reservas**: tarjetas con estado APARTADA (naranja, cuenta regresiva para pagar) o ✓ PAGADA (verde).
- Invitaciones: un partido de Juan con "Voy / No puedo".
- **Canchas libres**: ciudad (Bogotá / Cali / Medellín) → día (Hoy, Mañana, Mié 14…) → tarjetas con hora, club, cancha y precio. Al tocar una se abre la hoja **Reservar**.
- Torneos cerca.
- Si hay un pedido abierto en el bar: tarjeta con su estado.

### Hoja "Reservar cancha"
Club, dirección, día, hora de inicio y fin (90 min), cancha (techada / cristal / panorámica), precio y "¿Con quién juegas?" (opcional; se puede reservar solo). Botones: **Reservar y pagar** y **Apartar (pagas después)**.

### Partido / reserva (el "tiquete")
- Tiquete grande: estado (**⏳ APARTADA** "Tienes hasta las 4:30 p. m. · quedan 87 min" / **✓ PAGADA** "Reserva confirmada"), **código de reserva** (6 caracteres, por ejemplo ABA7CD), club y dirección, fecha, hora, cancha, precio y quiénes van.
- Jugadores: quién va, quién no y quién está en duda.
- La cancha: **Pagar** o **Dividir** (mitad y mitad / entre todos / montos). Cada parte muestra ✓ pagada, ⏳ pendiente o ✖ rechazada, con "Cubrir su parte".
- Bar del club: **Pedir a la cancha 🍹** y los pedidos con su estado (Recibido → Preparando → Entregado → Pagado ✓).
- Resultado: **Registrar resultado** o el resultado con sus confirmaciones.

### Pagar (hoja de pago)
Primero **Saldo Quilombo** ($X; si no alcanza: "Te faltan $Y · Recargar"); después Nequi, PSE y Tarjeta •••• 4242. Al pagar: "Procesando…" y luego "Pago aprobado" con referencia.

### Saldo (billetera)
Saldo grande, botón **Recargar** (50 / 100 / 200 / 500 mil u otro valor; PSE con selector de banco, tarjeta o Nequi) y los movimientos (+ recargas, − pagos, reembolsos).

### Tarjeta Quilombo (modo crucero)
- Una **tarjeta tipo membresía premium** (azul noche con naranja) con el logotipo QUILOMBO, nombre, categoría y ciudad, el **QR** y el **código de 6** (por ejemplo, Q7K2MX), más el **saldo**.
- "Muéstrale tu tarjeta al mesero: lo que pidas se descuenta de tu saldo."
- Consumos de hoy: cada pedido con "Pagado con saldo ✓" y su estado de entrega.
- Pedir desde aquí, poner un tope y dividir lo consumido.

### Calendario (desde Perfil)
Mes en cuadrícula (lunes a domingo) con puntos de colores: naranja para mis partidos, dorado para mis torneos, borde azul para torneos que me sirven. Debajo, la agenda del día y **"Torneos para ti"** con el botón **Yo voy**.

### Torneo y "Yo voy"
- Club organizador, fechas, categorías, cupos, precio, formato, premios y descripción.
- Hoja de inscripción: categoría, pareja (o "busco pareja") y pago con **💳 tarjeta** o **📎 comprobante**. El comprobante muestra la cuenta del club y el monto, y deja tomar una foto o elegir una captura.
- Estado: ⏳ Comprobante en revisión / ✓ Inscrito / ✕ Rechazado (con motivo y "Subir otro").

### Ranking nacional
Podio (top 3), luego la tabla: puesto, avatar, nombre, categoría, ciudad, racha 🔥, puntos, V–D y %. Filtros por categoría y ciudad. Mi fila resaltada y una barra fija **"Tu posición #N"**.

### Resultado
Las dos parejas, el marcador por sets, quién lo propuso y el estado de cada jugador (✓ confirmó / ⏳ falta / ✖ no está de acuerdo + motivo). Arriba un aviso con el estado: "Vale cuando los 4 confirmen", "Válido +19 pts", "En disputa · lo resuelve el club" u "Oficial". Botones "Confirmo" / "No estoy de acuerdo".

### Perfil (mío y de amigos)
Foto, nombre, @usuario, categoría, puntos, puesto nacional, club, ciudad, **récord** (V–D, %, racha, barra) y últimos resultados. Botones: **Tu tarjeta Quilombo**, **Saldo**, **Mi calendario**, **Ranking**. En el perfil de un amigo: Chat · Jugar · Cobrar, y "Tú y él" (partidos juntos, historia).

### Clases con profesor
- **Lista de profes**: foto, nombre, especialidad (Técnica y bandeja / Táctica / Iniciación…), niveles que enseña, ★ 4,9 (87), desde $50.000, clubes. Filtros por ciudad, nivel e individual o grupal.
- **Perfil del profe**: bio, años, certificaciones, idiomas, precios (individual / grupal), reseñas de alumnos y **horarios disponibles** (día, hora, club, cancha, individual o grupal con cupos "quedan 2").
- **Reservar clase**: resumen y pago con saldo. Queda en "Mis clases" y en el calendario.
- Después de la clase: reseña con estrellas.

## 5. Modo PROFESOR (la misma app)

En su Perfil, el profesor ve:
- **Mi agenda de clases** (hoy y la semana): alumnos inscritos, cupos e ingresos.
- **Abrir horario**: club → día → cancha libre → individual o grupal (cupos) → precio. La cancha queda apartada para la clase.
- **Cancelar un horario**: se le devuelve el saldo a los alumnos.
- Su perfil público (bio, precios, niveles), las reseñas y los ingresos de la semana.

## 6. App del MESERO (iPhone)

Encabezado azul noche (Pádel Club La 70 · nombre del mesero · botón **QR**). Barra inferior azul noche: **Pedidos · Canchas · Tarjetas · Nuevo**.
- **¿Quién eres?**: Camilo / Daniela.
- **Pedidos**: Nuevos (naranja, con pulso) → Preparando → Entregados. Cada tarjeta muestra la ubicación en grande (CANCHA 1), el número, el cliente, la marca 📱 App o 🛳️ Tarjeta, los productos con emoji y el total. Botones: Tomar pedido / Entregado / Cobrar. Cuando llega uno nuevo, un banner "¡PEDIDO NUEVO! CANCHA 1" con sonido.
- **Canchas**: las 4 canchas, quién juega ahora (hasta qué hora y cuánto le queda), si llegaron, la cuenta del bar y la próxima reserva (Pagada ✓ / Apartada · falta pago). Cuando entra una reserva nueva, se resalta.
- **Escanear tarjeta**: cámara con marco naranja, o el código de 6 en letras grandes, o la lista de tarjetas de hoy. Al leerla: nombre, foto, **saldo** y los productos para cargar. **"Cobrar $T con saldo"** muestra "Pagado ✓ · le quedan $X". Si no le alcanza: "Saldo insuficiente · que recargue" u otra forma de pago.
- **Dividir entre tarjetas**: se escanean 2 o más y se reparte (mitad y mitad / igual / montos).
- **Nuevo**: ubicación (Cancha 1–4, Barra, Terraza), a nombre de quién, la carta por categoría con − / +, una nota y "Enviar pedido $X".

## 7. Panel del CLUB (Mac/PC, oscuro tipo transmisión)

Barra lateral: logotipo **QUILOMBO CLUB**, Pádel Club La 70, secciones con contadores y abajo la administradora (Laura Gómez) y "Modo demo · Abrir en celulares". Columna derecha: **EN VIVO**, la actividad que va entrando.
- **Hoy**:
  - Vista aérea de las 4 canchas en vivo (las ocupadas brillan, con nombre y barra de tiempo).
  - Indicadores: ingresos (canchas / bar / torneos / clases / saldo), ocupación (anillo), reservas, pedidos abiertos y tarjetas.
  - Gráfico de ingresos por hora y "Reservas nuevas".
- **Agenda**: cuadrícula de turnos (6:00 a. m. a 9:00 p. m., cada 90 min) × 4 canchas, con 7 días.
  - Estados: Libre (punteado, con precio) / Apartada · falta pago (borde naranja, "vence 4:30") / Pagada (sólido) / Bloqueada (rayado). Marcas 📱 Quilombo y 📞 Club; las clases van como "Clase · Profe Diego".
  - Al tocar una franja se abre un cajón con los detalles y las acciones: reservar para un cliente, cobrar, llegaron, bloquear, liberar y precio.
- **Bar**: tablero Nuevos → Preparando → Entregados → Pagados.
- **Carta**: productos por categoría, **＋ Nuevo producto** (nombre, categoría, precio, emoji, disponible) y editar, duplicar o archivar.
- **Torneos**: calendario del club, crear torneo (formato, premios, descripción, cuenta para comprobantes). Por torneo: inscritos con estado, **revisar comprobante** (imagen grande, Aprobar / Rechazar con motivo) y registrar resultados oficiales.
- **Ranking**: resultados **en disputa** (el club decide quién ganó o anula), pendientes de confirmar y ranking del club.
- **Tarjetas Quilombo**: quién pagó con tarjeta hoy, consumo con saldo y pagos entre varios. **Cobrar con tarjeta en caja**: la cámara del Mac lee el QR.
- **Caja**: pagos del día por método (Saldo Quilombo, Tarjeta/PSE, Efectivo, Datáfono, Nequi) y por concepto.

## 8. Flujos para la reunión (2 iPhone + 1 Mac)

1. **Reservar y pagar:** el jugador reserva una cancha en La 70 y la paga con saldo. En el club entra "Nueva reserva" y "Pago recibido", y la agenda se ilumina.
2. **Pedir con la tarjeta:** el jugador muestra su tarjeta y el mesero la escanea, carga 2 cervezas y descuenta del saldo. El club lo ve en Caja.
3. **Mitad y mitad:** el jugador divide la cancha con Juan. Juan (el otro iPhone, "usar la app como Juan") paga su parte y la cancha pasa a PAGADA.
4. **Torneo:** en el calendario, "Yo voy" al Americano nocturno y se adjunta el comprobante. El club lo aprueba y al jugador le cambia a ✓ Inscrito.
5. **Resultado sin trampa:** Andrés propuso un resultado y el jugador lo confirma. Pasa a válido y los puntos se mueven en el ranking.
6. **Clase:** el jugador elige a la profe Mónica y reserva una clase con saldo. La cancha queda como "Clase · Mónica Arias" en la agenda del club.

## 9. Datos de ejemplo (para que los diseños se vean reales)

- **Jugador:** Demo Jugador · 4ª · 1.250 pts · Pádel Club La 70 · Medellín · saldo $142.000 · tarjeta de 6 letras.
- **Amigos:** Juan Pérez (pareja de juego), Caro López, Andrés Gómez (rival), Vale Ríos.
- **Clubes:** Pádel Club La 70 (Laureles, Cra. 70 #44-20), Envigado Pádel, Bogotá Pádel Usaquén, Cancha 93, Cali Pádel Club.
- **Precios:** cancha $120.000 (día) / $160.000 (desde las 4:30 p. m.); cerveza $9.000; michelada $12.000; empanadas ×3 $9.000; picada para 4 $48.000; tubo de pelotas $32.000.
- **Torneos:** Americano nocturno La 70 ($60.000), Liga La 70 · 4ª ($120.000), Open Medellín ($180.000).
- **Profesores:** Diego Salazar (Técnica y bandeja, desde $50.000), Mónica Arias (campeona nacional, Táctica), Carla Benítez (Clínicas y físico), Juanes Ortiz (Iniciación, Bogotá).
- **Personal del club:** Laura Gómez (administradora), Camilo y Daniela (meseros).

## 10. Lo que se necesita del diseño

1. **Logotipo y app icon** de QUILOMBO (el wordmark actual es Barlow Condensed 900 itálica en naranja).
2. **Pantallas del jugador** del punto 4, en claro y oscuro, a 393 × 852 (iPhone 15 Pro).
3. **La Tarjeta Quilombo**: es la pieza estrella y tiene que verse como una tarjeta de membresía premium.
4. **Pantallas del mesero** del punto 6: grandes, para usarlas rápido y con una mano.
5. **Panel del club** del punto 7 a 1440 × 900: oscuro, con energía de transmisión deportiva y legible en un proyector.
6. **Componentes:** botones, chips de estado (Apartada, Pagada, Pendiente, En disputa, Oficial, Pagado con saldo), tarjetas de reserva, de pedido y de profe, hojas inferiores y avisos.
