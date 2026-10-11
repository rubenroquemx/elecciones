import L from 'leaflet';

/**
 * Servidores y configuración de mosaicos cartográficos de alta disponibilidad.
 * 
 * - streets: OpenStreetMap estándar global con nombres completos de calles, colonias,
 *   carreteras y poblados en español, respaldado con failover automático a Esri World Street Map.
 * - satellite: Esri World Imagery (Fotografía satelital y aérea HD de máxima nitidez global).
 * - terrain: Esri World Topo Map (Topografía y curvas de relieve).
 * 
 * Totalmente abiertos, de acceso directo desde el navegador (CORS *), sin API keys
 * requeridas y 100% tolerantes a bloqueos de referrers.
 */
export const MAP_TILES = {
  streets: {
    primaryUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    fallbackUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
  },
  satellite: {
    primaryUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    fallbackUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri &mdash; Maxar, Earthstar Geographics',
  },
  terrain: {
    primaryUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    fallbackUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri',
  },
};

export type GoogleMapLayerType = 'streets' | 'sat' | 'satellite' | 'satellitePure' | 'terrain' | 'osm';

/**
 * Crea una capa TileLayer de Leaflet con tolerancia a fallos, reintento automático y soporte multiorigen.
 */
export function createGoogleTileLayer(type: GoogleMapLayerType = 'streets'): L.TileLayer {
  const isSat = type === 'sat' || type === 'satellite' || type === 'satellitePure';
  const cfg = isSat ? MAP_TILES.satellite : (type === 'terrain' ? MAP_TILES.terrain : MAP_TILES.streets);

  const layer = L.tileLayer(cfg.primaryUrl, {
    maxZoom: cfg.maxZoom,
    attribution: cfg.attribution,
  });

  // Failover automático transparente: si un mosaico falla en la red, se carga desde el CDN alternativo
  layer.on('tileerror', (event: any) => {
    const tile = event?.tile as HTMLImageElement | undefined;
    if (tile && !tile.dataset.fallbackTried && cfg.fallbackUrl) {
      tile.dataset.fallbackTried = 'true';
      const coords = event.coords;
      if (coords) {
        tile.src = cfg.fallbackUrl
          .replace('{z}', String(coords.z))
          .replace('{x}', String(coords.x))
          .replace('{y}', String(coords.y));
      }
    }
  });

  return layer;
}
