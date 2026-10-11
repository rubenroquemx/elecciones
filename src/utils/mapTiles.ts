import L from 'leaflet';

/**
 * Servidores y configuración de mosaicos de Google Maps para Leaflet.
 * Utiliza los servidores de Google Maps de alta disponibilidad y baja latencia en México:
 * - lyrs=m : Calles / Vector Roadmap con colonias, calles, poblados y vías completas.
 * - lyrs=y : Satélite Híbrido HD con fotografía aérea y nombres de calles/carreteras superpuestas.
 * - lyrs=s : Satélite puro sin etiquetas.
 * - lyrs=p : Relieve y topografía.
 */
export const GOOGLE_MAPS_TILES = {
  streets: {
    url: 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    maxZoom: 20,
    attribution: '© Google Maps',
  },
  satellite: {
    url: 'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    maxZoom: 20,
    attribution: '© Google Maps',
  },
  satellitePure: {
    url: 'https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    maxZoom: 20,
    attribution: '© Google Maps',
  },
  terrain: {
    url: 'https://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    maxZoom: 20,
    attribution: '© Google Maps',
  },
};

export type GoogleMapLayerType = 'streets' | 'sat' | 'satellite' | 'satellitePure' | 'terrain';

/**
 * Crea una capa TileLayer de Leaflet conectada directamente a Google Maps.
 */
export function createGoogleTileLayer(type: GoogleMapLayerType = 'streets'): L.TileLayer {
  const isSat = type === 'sat' || type === 'satellite';
  const cfg = isSat ? GOOGLE_MAPS_TILES.satellite : GOOGLE_MAPS_TILES.streets;

  return L.tileLayer(cfg.url, {
    maxZoom: cfg.maxZoom,
    subdomains: cfg.subdomains,
    attribution: cfg.attribution,
  });
}
