import type { TerritorialLeader } from '../types/territory';
import type { ElectoralSection } from '../types/sections';

export interface ElectorStructureItem {
  id: string;
  structureName: string;
  type: string;
  sectionNumber: string;
  role?: string;
  source: 'leader' | 'section_structure';
}

export interface ElectorProfile {
  electorKey: string; // 18 characters INE unique key
  name: string;
  curp?: string;
  address?: string;
  colonia?: string;
  electoralSection: string; // The strictly unique electoral section
  phone?: string;
  email?: string;
  structures: ElectorStructureItem[];
}

const STORAGE_KEY = 'territorial_elector_registry';

/**
 * Reads any cached elector profiles from localStorage
 */
function getPersistedElectors(): Record<string, ElectorProfile> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading elector registry from localStorage', e);
    return {};
  }
}

/**
 * Persists an elector profile to localStorage
 */
export function persistElectorProfile(profile: ElectorProfile): void {
  try {
    const current = getPersistedElectors();
    const key = profile.electorKey.trim().toUpperCase();
    current[key] = {
      ...profile,
      electorKey: key,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch (e) {
    console.warn('Error saving elector profile to localStorage', e);
  }
}

/**
 * Normalizes section number to 4 digits (e.g. "416" -> "0416")
 */
export function normalizeSectionNumber(sec: string): string {
  const digits = (sec || '').replace(/\D/g, '');
  if (!digits) return (sec || '').trim();
  return digits.padStart(4, '0');
}

/**
 * Builds a unified map of all electors across:
 * 1. Persistent storage
 * 2. TerritorialLeader hierarchy
 * 3. Section structures
 */
export function buildElectorRegistry(
  leaders: TerritorialLeader[] = [],
  sections: ElectoralSection[] = []
): Map<string, ElectorProfile> {
  const map = new Map<string, ElectorProfile>();

  // 1. Ingest persisted electors
  const persisted = getPersistedElectors();
  for (const [k, prof] of Object.entries(persisted)) {
    const key = k.trim().toUpperCase();
    if (key.length >= 6) {
      map.set(key, {
        ...prof,
        electorKey: key,
        electoralSection: normalizeSectionNumber(prof.electoralSection),
        structures: prof.structures || [],
      });
    }
  }

  // 2. Ingest leaders from hierarchy
  for (const leader of leaders) {
    if (leader.electorKey && leader.electorKey.trim().length >= 6) {
      const key = leader.electorKey.trim().toUpperCase();
      const existing = map.get(key);
      const leaderSec = normalizeSectionNumber(
        leader.electoralSection || (leader.assignedSections && leader.assignedSections[0]) || ''
      );

      const structItem: ElectorStructureItem = {
        id: leader.id,
        structureName: leader.territoryName || leader.committeeAlias || leader.role,
        type: leader.level,
        sectionNumber: leaderSec,
        role: leader.role,
        source: 'leader',
      };

      if (existing) {
        if (!existing.electoralSection && leaderSec) {
          existing.electoralSection = leaderSec;
        }
        if (!existing.name && leader.name) existing.name = leader.name;
        if (!existing.phone && leader.phone) existing.phone = leader.phone;
        if (!existing.email && leader.email) existing.email = leader.email;
        if (!existing.address && leader.address) existing.address = leader.address;
        if (!existing.colonia && leader.colonia) existing.colonia = leader.colonia;
        if (!existing.curp && leader.curp) existing.curp = leader.curp;
        
        if (!existing.structures.some(s => s.id === leader.id)) {
          existing.structures.push(structItem);
        }
      } else {
        map.set(key, {
          electorKey: key,
          name: leader.name,
          curp: leader.curp,
          address: leader.address,
          colonia: leader.colonia,
          electoralSection: leaderSec,
          phone: leader.phone,
          email: leader.email,
          structures: [structItem],
        });
      }
    }
  }

  // 3. Ingest section structures
  for (const sec of sections) {
    const secNum = normalizeSectionNumber(sec.sectionNumber);
    if (!sec.structures) continue;
    for (const st of sec.structures) {
      if (st.electorKey && st.electorKey.trim().length >= 6) {
        const key = st.electorKey.trim().toUpperCase();
        const existing = map.get(key);
        const structItem: ElectorStructureItem = {
          id: st.id,
          structureName: st.name,
          type: st.type,
          sectionNumber: secNum,
          role: st.leaderRole,
          source: 'section_structure',
        };

        if (existing) {
          if (!existing.electoralSection && secNum) {
            existing.electoralSection = secNum;
          }
          if (!existing.name && st.leaderName) existing.name = st.leaderName;
          if (!existing.phone && st.leaderPhone) existing.phone = st.leaderPhone;
          if (!existing.structures.some(s => s.id === st.id)) {
            existing.structures.push(structItem);
          }
        } else {
          map.set(key, {
            electorKey: key,
            name: st.leaderName,
            curp: st.curp,
            address: st.address,
            colonia: st.colonia,
            electoralSection: secNum,
            phone: st.leaderPhone,
            email: st.email,
            structures: [structItem],
          });
        }
      }
    }
  }

  return map;
}

/**
 * Searches for an existing elector profile by electorKey
 */
export function findElectorByKey(
  rawKey: string,
  leaders: TerritorialLeader[] = [],
  sections: ElectoralSection[] = []
): ElectorProfile | null {
  if (!rawKey) return null;
  const key = rawKey.trim().toUpperCase();
  if (key.length < 6) return null;

  const registry = buildElectorRegistry(leaders, sections);
  return registry.get(key) || null;
}

export interface ValidationResult {
  allowed: boolean;
  existingProfile: ElectorProfile | null;
  isSameSection: boolean;
  errorMsg?: string;
}

/**
 * Validates whether an elector can be assigned to a given target electoral section.
 * Rule: An elector can be in 1 or more structures, but strictly ONE electoral section.
 */
export function validateElectorSection(
  rawKey: string,
  targetSection: string,
  leaders: TerritorialLeader[] = [],
  sections: ElectoralSection[] = [],
  currentEntityId?: string
): ValidationResult {
  if (!rawKey || !rawKey.trim()) {
    return { allowed: true, existingProfile: null, isSameSection: true };
  }

  const key = rawKey.trim().toUpperCase();
  const existing = findElectorByKey(key, leaders, sections);

  if (!existing) {
    return { allowed: true, existingProfile: null, isSameSection: true };
  }

  // If we are editing the existing entity that already belongs to this profile
  if (currentEntityId && existing.structures.length === 1 && existing.structures[0].id === currentEntityId) {
    return { allowed: true, existingProfile: existing, isSameSection: true };
  }

  const normTarget = normalizeSectionNumber(targetSection);
  const normExisting = normalizeSectionNumber(existing.electoralSection);

  // If user has a registered electoral section and target is different:
  if (normExisting && normTarget && normExisting !== normTarget) {
    return {
      allowed: false,
      existingProfile: existing,
      isSameSection: false,
      errorMsg: `Directriz Global: El ciudadano "${existing.name}" (Clave de Elector: ${key}) ya se encuentra registrado en la Sección Electoral ${normExisting}. Por ningún motivo puede pertenecer a más de una sección electoral (se intentó asignar a la Sección ${normTarget}).`,
    };
  }

  // Same section or target matches existing section: Allowed! Can belong to multiple structures
  return {
    allowed: true,
    existingProfile: existing,
    isSameSection: true,
  };
}

