import type { TerritorialLeader } from '../types/territory';
import type { ElectoralSection, SectionStructure } from '../types/sections';
import { INITIAL_TERRITORY_DATA } from '../data/mockTerritoryData';
import { INITIAL_SECTIONS } from '../data/mockSectionsData';

const API_BASE = ''; // Relative to origin in production or proxy

export async function fetchLeadersApi(): Promise<TerritorialLeader[]> {
  try {
    const res = await fetch(`${API_BASE}/api/leaders`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
    return INITIAL_TERRITORY_DATA;
  } catch (err) {
    console.warn('API backend no disponible o falló, usando datos base:', err);
    return INITIAL_TERRITORY_DATA;
  }
}

export async function saveLeaderApi(leader: TerritorialLeader, isExisting: boolean): Promise<TerritorialLeader> {
  try {
    const method = isExisting ? 'PUT' : 'POST';
    const url = isExisting ? `${API_BASE}/api/leaders/${leader.id}` : `${API_BASE}/api/leaders`;
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(leader),
    });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Fallo guardado en backend, operando en memoria:', err);
    return leader;
  }
}

export async function deleteLeaderApi(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/leaders/${id}`, { method: 'DELETE' });
    return res.ok;
  } catch (err) {
    console.warn('Fallo eliminación en backend, operando en memoria:', err);
    return true;
  }
}

export async function fetchSectionsApi(): Promise<ElectoralSection[]> {
  try {
    const res = await fetch(`${API_BASE}/api/sections`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
    return INITIAL_SECTIONS;
  } catch (err) {
    console.warn('API de secciones no disponible, usando datos base:', err);
    return INITIAL_SECTIONS;
  }
}

export async function saveSectionApi(section: ElectoralSection): Promise<ElectoralSection> {
  try {
    const res = await fetch(`${API_BASE}/api/sections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(section),
    });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Fallo al guardar sección en backend:', err);
    return section;
  }
}

export async function addStructureApi(sectionId: string, structure: SectionStructure): Promise<SectionStructure> {
  try {
    const res = await fetch(`${API_BASE}/api/sections/${sectionId}/structures`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(structure),
    });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Fallo al agregar estructura en backend:', err);
    return structure;
  }
}
