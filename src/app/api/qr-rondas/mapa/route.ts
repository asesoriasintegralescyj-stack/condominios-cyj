import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/qr-rondas/mapa
 *
 * Sirve una pagina HTML con Leaflet (OpenStreetMap) que muestra
 * los marcadores y la ruta del guardia.
 *
 * Query params:
 *   - markers: JSON array de {lat, lng, num, name, time, guardia}
 *   - polyline: string con coordenadas para la linea
 *   - center: "lat,lng" del centro del mapa
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const markersStr = searchParams.get('markers') || '[]'
  const polylineStr = searchParams.get('polyline') || ''
  const centerStr = searchParams.get('center') || '-33.32761,-70.75842'
  const fijosStr = searchParams.get('fijos') || '[]'

  let markers: any[] = []
  try {
    markers = JSON.parse(markersStr)
  } catch {
    markers = []
  }

  let polyline: number[][] = []
  try {
    polyline = JSON.parse(`[${polylineStr}]`)
  } catch {
    polyline = []
  }

  let fijos: any[] = []
  try {
    fijos = JSON.parse(fijosStr)
  } catch {
    fijos = []
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
