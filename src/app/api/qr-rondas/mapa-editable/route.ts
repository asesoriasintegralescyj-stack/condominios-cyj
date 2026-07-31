import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/qr-rondas/mapa-editable
 *
 * Mapa con marcadores arrastrables. El admin puede:
 * 1. Arrastrar cada marcador a la posicion exacta
 * 2. Click "Guardar posiciones" para persistir en BD
 *
 * Se usa POST para evitar URI_TOO_LONG con muchos puntos.
 *
 * Body (JSON):
 *   - puntos: array de {id, name, code, lat, lng}
 *   - ruta: array de {lat, lng, num, name, time, guardia}
 *   - center: "lat,lng" del centro del mapa
 */
export async function POST(request: NextRequest) {
  let puntos: any[] = []
  let ruta: any[] = []
  let centerStr = '-33.32761,-70.75842'

  try {
    const body = await request.json()
    puntos = Array.isArray(body.puntos) ? body.puntos : []
    ruta = Array.isArray(body.ruta) ? body.ruta : []
    if (body.center) centerStr = body.center
  } catch {
    // Si falla el parseo, usar vacíos
  }

  const [centerLat, centerLng] = centerStr.split(',').map(Number)

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Editar Puntos GPS - Laguna Norte</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body, html { height: 100%; font-family: -apple-system, system-ui, sans-serif; }
    #map { height: calc(100% - 50px); width: 100%; }
    #bar { height: 50px; background: #0f2044; color: white; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; }
    #bar h1 { font-size: 14px; font-weight: bold; }
    #save-btn { background: #2563eb; color: white; border: none; padding: 8px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 13px; }
    #save-btn:hover { background: #1d4ed8; }
    #save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    #status { font-size: 12px; margin-left: 10px; }
    .leaflet-tooltip { background: #2563eb; color: white; border: none; border-radius: 4px; font-size: 10px; font-weight: bold; padding: 2px 6px; }
    .info-panel { position: absolute; bottom: 10px; left: 10px; z-index: 1000; background: white; padding: 10px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.2); font-size: 12px; max-width: 300px; }
    .info-panel b { color: #2563eb; }
  </style>
</head>
<body>
  <div id="bar">
    <div style="display:flex;align-items:center;">
      <h1>EDITAR PUNTOS GPS - Arrastra los marcadores a la posicion correcta</h1>
      <span id="status"></span>
    </div>
    <button id="save-btn" onclick="guardar()">Guardar posiciones</button>
  </div>
  <div id="map"></div>
  <div class="info-panel">
    <b>Instrucciones:</b><br>
    1. Arrastra cada marcador azul a la posicion real del punto<br>
    2. Los puntos verdes son la ruta del guardia (referencia)<br>
    3. Click "Guardar posiciones" cuando termines
  </div>
  <script>
    const map = L.map('map').setView([${centerLat}, ${centerLng}], 17);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: 'OpenStreetMap', maxZoom: 20
    }).addTo(map);
    const puntos = ${JSON.stringify(puntos)};
    const ruta = ${JSON.stringify(ruta)};
    const changes = {};
    ruta.forEach((p) => {
      if (p.lat && p.lng) {
        L.circleMarker([p.lat, p.lng], { radius: 6, color: '#16a34a', fillColor: '#16a34a', fillOpacity: 0.8 })
          .addTo(map).bindPopup('<b>Ruta #' + p.num + '</b><br>' + p.name + '<br>' + p.time);
      }
    });
    if (ruta.length > 1) {
      const rc = ruta.filter(p => p.lat && p.lng).map(p => [p.lat, p.lng]);
      if (rc.length > 1) L.polyline(rc, { color: '#16a34a', weight: 3, opacity: 0.5, dashArray: '8, 4' }).addTo(map);
    }
    puntos.forEach((p) => {
      const lat = p.lat != null ? p.lat : ${centerLat};
      const lng = p.lng != null ? p.lng : ${centerLng};
      const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
      marker.bindTooltip(p.name, { permanent: true, direction: 'top' });
      marker.bindPopup('<b>' + p.name + '</b><br>Codigo: ' + p.code + '<br>Arrastra para reposicionar');
      marker.on('dragend', function(e) {
        const ll = e.target.getLatLng();
        changes[p.id] = { lat: ll.lat, lng: ll.lng };
        document.getElementById('status').textContent = ' (' + Object.keys(changes).length + ' cambios sin guardar)';
      });
    });
    const all = [
      ...puntos.map(p => [p.lat != null ? p.lat : ${centerLat}, p.lng != null ? p.lng : ${centerLng}]),
      ...ruta.filter(p => p.lat && p.lng).map(p => [p.lat, p.lng])
    ];
    if (all.length > 0) map.fitBounds(L.latLngBounds(all), { padding: [50, 50] });
    async function guardar() {
      const keys = Object.keys(changes);
      if (keys.length === 0) { alert('No hay cambios. Arrastra los marcadores primero.'); return; }
      const btn = document.getElementById('save-btn');
      btn.disabled = true; btn.textContent = 'Guardando...';
      let ok = 0, err = 0;
      for (const id of keys) {
        try {
          const res = await fetch('/api/qr-rondas/puntos-gps', {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, lat: changes[id].lat, lng: changes[id].lng })
          });
          if (res.ok) ok++; else err++;
        } catch (e) { err++; }
      }
      btn.disabled = false; btn.textContent = 'Guardar posiciones';
      alert(ok + ' puntos guardados!' + (err > 0 ? ' ' + err + ' errores.' : ''));
      document.getElementById('status').textContent = ' ' + ok + ' guardados';
      keys.forEach(k => delete changes[k]);
    }
  </script>
</body>
</html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}
