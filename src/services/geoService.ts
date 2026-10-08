// Servicio centralizado para cargar y cachear la cartografía oficial GeoJSON del INE
// Evita descargar múltiples veces los archivos GeoJSON y asegura geometrías oficiales válidas

const geoCache = new Map<string, any>();
const inFlightRequests = new Map<string, Promise<any>>();

export async function fetchStateGeoJson(stateAbbr: string = 'tab'): Promise<any> {
  const key = (stateAbbr || 'tab').toLowerCase().trim();
  if (geoCache.has(key)) {
    return geoCache.get(key);
  }

  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key);
  }

  const promise = (async () => {
    try {
      const res = await fetch(`/geo/secciones/${key}.json`);
      if (res.ok) {
        const data = await res.json();
        geoCache.set(key, data);
        return data;
      }
    } catch (e) {
      console.warn(`Aviso al cargar /geo/secciones/${key}.json:`, e);
    }

    // Fallback: si falla el archivo del estado específico, intentar tab.json
    if (key !== 'tab') {
      try {
        const tabRes = await fetch('/geo/secciones/tab.json');
        if (tabRes.ok) {
          const tabData = await tabRes.json();
          geoCache.set(key, tabData);
          return tabData;
        }
      } catch (e) {}
    }
    return null;
  })();

  inFlightRequests.set(key, promise);
  try {
    return await promise;
  } finally {
    inFlightRequests.delete(key);
  }
}
