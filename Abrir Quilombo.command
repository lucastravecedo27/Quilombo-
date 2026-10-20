#!/bin/zsh
# Lanzador de la demo de Quilombo: doble clic en el Finder.
# Prende el servidor en este Mac (jugador, mesero y club conectados en vivo) y abre la sala de demo.
# Para apagarlo: cierra esta ventana de Terminal (o Ctrl+C).
cd "$(dirname "$0")" || exit 1
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

URL="https://localhost:5180/demo"
echo ""
echo "  QUILOMBO · demo en vivo"
echo "  ───────────────────────"

if ! command -v npm >/dev/null 2>&1; then
  echo "  Falta Node.js. Instálalo desde https://nodejs.org y vuelve a abrir este lanzador."
  read -k 1 "?  Presiona una tecla para cerrar…"
  exit 1
fi
if [ ! -d node_modules ]; then
  echo "  Primera vez: instalando (tarda un par de minutos)…"
  npm install || { read -k 1 "?  No se pudo instalar. Presiona una tecla…"; exit 1; }
fi

# ¿Ya está prendido? Entonces solo abre la sala
if curl -sk -o /dev/null --max-time 2 "$URL"; then
  echo "  Ya estaba prendido. Abriendo la sala…"
  open "$URL"
  exit 0
fi
# Algo viejo ocupando el puerto (p. ej. una demo sin https): se apaga
lsof -ti tcp:5180 | xargs kill 2>/dev/null

IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
echo "  En este Mac:     $URL"
[ -n "$IP" ] && echo "  En los iPhone:   https://$IP:5180  (mesero: https://$IP:5180/mesero)"
echo ""
echo "  La primera vez el navegador dirá que la conexión no es privada (el certificado es de este Mac):"
echo "  · Safari: «Mostrar detalles» → «visitar este sitio web».  · Chrome: «Avanzado» → «Acceder»."
echo "  En los iPhone pasa lo mismo una vez. Así la cámara puede leer los QR."
echo ""
echo "  Deja esta ventana abierta mientras dure la demo."
echo ""

( for i in {1..60}; do curl -sk -o /dev/null --max-time 1 "$URL" && { open "$URL"; break; }; sleep 1; done ) &
npm run demo
