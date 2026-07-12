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
  const centerStr = searchParams.get('center') || '-33.3850,-70.5890'

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

    // Dibujar linea de ruta
    if (polyline.length > 1) {
      L.polyline(polyline, {
        color: '#2563eb',
        weight: 4,
        opacity: 0.7,
        dashArray: '10, 5'
      }).addTo(map);
    }

    // Dibujar marcadores numerados
    markers.forEach((m) => {
      const marker = L.marker([m.lat, m.lng]).addTo(map);
      marker.bindPopup(
        '<div style="font-family: sans-serif;">' +
        '<b>Punto #' + m.num + '</b><br>' +
        '<b>Ubicacion:</b> ' + m.name + '<br>' +
        '<b>Hora:</b> ' + m.time + '<br>' +
        '<b>Guardia:</b> ' + m.guardia +
        '</div>'
      );
      marker.bindTooltip('#' + m.num, { permanent: true, direction: 'top', className: 'num-tooltip' });
    });

    // Ajustar zoom para ver todos los puntos
    if (markers.length > 0) {
      const group = L.featureGroup(markers.map(m => L.marker([m.lat, m.lng])));
      map.fitBounds(group.getBounds(), { padding: [50, 50] });
    }

    // Estilo para los tooltips numerados
    const style = document.createElement('style');
    style.textContent = '.num-tooltip { background: #2563eb; color: white; border: none; border-radius: 50%; font-weight: bold; font-size: 11px; padding: 2px 6px; }';
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
