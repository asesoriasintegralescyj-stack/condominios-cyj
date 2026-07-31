import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/qr-rondas/mapa
 *
 * Sirve una pagina HTML con Leaflet (OpenStreetMap) que muestra
 * los marcadores y la ruta del guardia.
 *
 * Body (JSON):
 *   - markers: array de {lat, lng, num, name, time, guardia}
 *   - polyline: string con coordenadas para la linea
 *   - center: "lat,lng" del centro del mapa
 *   - fijos: array de {id, name, code, gpsLat, gpsLng}
 *
 * Se usa POST en lugar de GET para evitar URI_TOO_LONG cuando
 * hay muchos puntos GPS (113+ puntos generan URLs >15KB).
 */
export async function POST(request: NextRequest) {
  let markers: any[] = []
  let polyline: number[][] = []
  let fijos: any[] = []
  let centerStr = '-33.32761,-70.75842'

  try {
    const body = await request.json()
    markers = Array.isArray(body.markers) ? body.markers : []
    if (typeof body.polyline === 'string' && body.polyline) {
      try { polyline = JSON.parse(`[${body.polyline}]`) } catch { polyline = [] }
    } else if (Array.isArray(body.polyline)) {
      polyline = body.polyline
    }
    fijos = Array.isArray(body.fijos) ? body.fijos : []
    if (body.center) centerStr = body.center
  } catch {
    // Si falla el parseo del body, usar valores vacíos
  }

  const [centerLat, centerLng] = centerStr.split(',').map(Number)

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ruta del Guardia</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body, html { height: 100%; font-family: -apple-system, system-ui, sans-serif; }
    #map { height: 100%; width: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const map = L.map('map').setView([${centerLat}, ${centerLng}], 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: 'OpenStreetMap',
      maxZoom: 19
    }).addTo(map);

    const markers = ${JSON.stringify(markers)};
    const polyline = ${JSON.stringify(polyline)};
    const fijos = ${JSON.stringify(fijos)};

    // Dibujar puntos fijos guardados (azul, no arrastrables)
    fijos.forEach((f) => {
      if (f.lat != null && f.lng != null) {
        const m = L.marker([f.lat, f.lng]).addTo(map);
        m.bindPopup('<b>Punto fijo</b><br>' + f.name + '<br>Codigo: ' + f.code);
        m.bindTooltip(f.name, { permanent: true, direction: 'top', className: 'fijo-tooltip' });
      }
    });

    // Dibujar linea de ruta
    if (polyline.length > 1) {
      L.polyline(polyline, {
        color: '#16a34a',
        weight: 4,
        opacity: 0.7,
        dashArray: '10, 5'
      }).addTo(map);
    }

    // Dibujar marcadores numerados de la ruta (verde)
    markers.forEach((m) => {
      const marker = L.circleMarker([m.lat, m.lng], {
        radius: 8, color: '#16a34a', fillColor: '#16a34a', fillOpacity: 0.8
      }).addTo(map);
      marker.bindPopup(
        '<div style="font-family: sans-serif;">' +
        '<b>Ruta #' + m.num + '</b><br>' +
        '<b>Ubicacion:</b> ' + m.name + '<br>' +
        '<b>Hora:</b> ' + m.time + '<br>' +
        '<b>Guardia:</b> ' + m.guardia +
        '</div>'
      );
      marker.bindTooltip('#' + m.num, { permanent: true, direction: 'top', className: 'num-tooltip' });
    });

    // Ajustar zoom para ver todos los puntos
    const allPoints = [
      ...markers.map(m => [m.lat, m.lng]),
      ...fijos.filter(f => f.lat != null && f.lng != null).map(f => [f.lat, f.lng])
    ];
    if (allPoints.length > 0) {
      map.fitBounds(L.latLngBounds(allPoints), { padding: [50, 50] });
    }

    // Estilos
    const style = document.createElement('style');
    style.textContent = '.num-tooltip { background: #16a34a; color: white; border: none; border-radius: 50%; font-weight: bold; font-size: 11px; padding: 2px 6px; } .fijo-tooltip { background: #2563eb; color: white; border: none; border-radius: 4px; font-weight: bold; font-size: 10px; padding: 2px 6px; }';
    document.head.appendChild(style);
  </script>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
