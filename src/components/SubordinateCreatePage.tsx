import React, { useState, useMemo, useEffect } from 'react';
import type { TerritorialLeader, TerritorialLevel } from '../types/territory';
import type { UserAccount } from '../types/auth';
import type { ElectoralSection } from '../types/sections';
import { getAllowedChildLevel } from '../utils/hierarchy';
import { MEXICAN_STATES, type StateData } from '../data/statesData';
import { 
  ArrowLeft, 
  User, 
  Phone, 
  Mail, 
  Lock, 
  Search, 
  MapPin,
  CheckCircle2,
  KeyRound,
  ShieldAlert,
  Save,
  Flag,
  UserCheck,
  Building2,
  Layers,
  Landmark,
  Loader2,
  Check
} from 'lucide-react';

export type ElectionType = 'estatal' | 'diputacion_federal' | 'diputacion_local' | 'municipio';

export interface PoliticalPartyOption {
  id: string;
  name: string;
  color: string;
  bgBadge: string;
}

export const OFFICIAL_POLITICAL_PARTIES: PoliticalPartyOption[] = [
  { id: 'morena', name: 'MORENA', color: '#B5261E', bgBadge: 'bg-red-50 text-red-700 border-red-300' },
  { id: 'pan', name: 'PAN', color: '#0047BA', bgBadge: 'bg-blue-50 text-blue-700 border-blue-300' },
  { id: 'pri', name: 'PRI', color: '#008000', bgBadge: 'bg-emerald-50 text-emerald-800 border-emerald-300' },
  { id: 'pvem', name: 'PVEM', color: '#50B848', bgBadge: 'bg-green-50 text-green-700 border-green-300' },
  { id: 'pt', name: 'PT', color: '#DC2626', bgBadge: 'bg-red-50 text-red-800 border-red-300' },
  { id: 'mc', name: 'Movimiento Ciudadano', color: '#FF8200', bgBadge: 'bg-amber-50 text-amber-800 border-amber-300' },
  { id: 'paz', name: 'Partido PAZ', color: '#7E22CE', bgBadge: 'bg-purple-50 text-purple-700 border-purple-300' },
  { id: 'somos', name: 'SOMOS', color: '#0284C7', bgBadge: 'bg-sky-50 text-sky-700 border-sky-300' },
  { id: 'prd', name: 'PRD', color: '#EAB308', bgBadge: 'bg-yellow-50 text-yellow-800 border-yellow-300' },
];

interface SubordinateCreatePageProps {
  currentUser: UserAccount;
  availableSections: ElectoralSection[];
  accounts?: UserAccount[];
  initialLeader?: TerritorialLeader | null;
  initialAccount?: UserAccount | null;
  isEditing?: boolean;
  onSaveCoordinator: (leader: TerritorialLeader, account: UserAccount) => Promise<void>;
  onBack: () => void;
}

export const SubordinateCreatePage: React.FC<SubordinateCreatePageProps> = ({
  currentUser,
  availableSections,
  accounts = [],
  initialLeader,
  initialAccount,
  isEditing = false,
  onSaveCoordinator,
  onBack,
}) => {
  // 1. Determinar nivel subordinado permitido
  const targetChildLevel: TerritorialLevel = useMemo(() => {
    if (isEditing && initialLeader?.level) {
      return initialLeader.level;
    }
    return getAllowedChildLevel(currentUser.level) || 'cpv';
  }, [currentUser.level, isEditing, initialLeader]);

  const generateSecurePassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let res = '';
    for (let i = 0; i < 10; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };

  // 1. Datos del Titular
  const [name, setName] = useState(initialLeader?.name || '');
  const [phone, setPhone] = useState(initialLeader?.phone || '');
  const [email, setEmail] = useState(initialLeader?.email || initialAccount?.email || '');
  const [campaignName, setCampaignName] = useState(
    initialLeader?.campaignName || initialAccount?.campaignName || ''
  );
  const [candidateName, setCandidateName] = useState(
    initialLeader?.candidateName || initialAccount?.candidateName || ''
  );
  const [selectedParty, setSelectedParty] = useState(
    initialLeader?.partyId || 'morena'
  );
  const [customPartyName, setCustomPartyName] = useState(
    initialLeader?.partyName || initialAccount?.partyName || ''
  );

  // 2. Credenciales
  const [username, setUsername] = useState(initialAccount?.username || initialLeader?.username || '');
  const [password, setPassword] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);

  // 3. Asignación Territorial
  const [electionType, setElectionType] = useState<ElectionType>(
    (initialLeader?.electionType as ElectionType) || (initialAccount?.electionType as ElectionType) || 'estatal'
  );
  const [selectedStateId, setSelectedStateId] = useState<number>(
    initialLeader?.stateId || initialAccount?.stateId || 27 // Tabasco por defecto
  );
  const [selectedFederalDistrict, setSelectedFederalDistrict] = useState<number>(1);
  const [selectedLocalDistrict, setSelectedLocalDistrict] = useState<number>(1);
  const [selectedMunicipioName, setSelectedMunicipioName] = useState<string>('');
  const [territoryName, setTerritoryName] = useState(initialLeader?.territoryName || '');
  const [selectedSections, setSelectedSections] = useState<string[]>(
    initialLeader?.assignedSections || initialAccount?.assignedSections || []
  );
  const [showSectionDetail, setShowSectionDetail] = useState(false);
  const [sectionSearch, setSectionSearch] = useState('');
  const [stateGeoSections, setStateGeoSections] = useState<any[]>([]);
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado activo en el catálogo de los 32 estados
  const selectedState = useMemo<StateData>(() => {
    return MEXICAN_STATES.find(s => s.stateId === selectedStateId) || MEXICAN_STATES[26];
  }, [selectedStateId]);

  // Cargar cartografía de secciones del estado seleccionado
  useEffect(() => {
    let isCancelled = false;
    setLoadingGeo(true);

    const loadStateGeo = async () => {
      try {
        const res = await fetch(`/geo/secciones/${selectedState.abbr}.json`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!isCancelled && Array.isArray(data.features)) {
          const mapped = data.features.map((f: any) => f.properties || {});
          setStateGeoSections(mapped);

          // Inicializar municipio por defecto
          const municipios = Array.from(new Set(mapped.map((m: any) => m.municipio).filter(Boolean))).sort();
          if (municipios.length > 0) {
            setSelectedMunicipioName(prev => (prev && municipios.includes(prev) ? prev : (municipios[0] as string)));
          }

          // Inicializar distritos
          const fedDistricts = Array.from(new Set(mapped.map((m: any) => Number(m.distrito_f)).filter(Boolean))).sort((a: any, b: any) => a - b);
          if (fedDistricts.length > 0) {
            setSelectedFederalDistrict(prev => (prev && fedDistricts.includes(prev) ? prev : (fedDistricts[0] as number)));
          }

          const locDistricts = Array.from(new Set(mapped.map((m: any) => Number(m.distrito_l)).filter(Boolean))).sort((a: any, b: any) => a - b);
          if (locDistricts.length > 0) {
            setSelectedLocalDistrict(prev => (prev && locDistricts.includes(prev) ? prev : (locDistricts[0] as number)));
          }
        }
      } catch (err) {
        console.warn(`Aviso cargando secciones de ${selectedState.abbr}:`, err);
        if (!isCancelled) {
          // Fallback con availableSections si coincide el estado
          setStateGeoSections(
            availableSections.map(s => ({
              seccion: s.sectionNumber,
              municipio: s.municipio || 'Demarcación',
              distrito_f: Number(s.distritoLocal) || 1,
              distrito_l: Number(s.distritoLocal) || 1,
            }))
          );
        }
      } finally {
        if (!isCancelled) setLoadingGeo(false);
      }
    };

    loadStateGeo();
    return () => { isCancelled = true; };
  }, [selectedState, availableSections]);

  // Municipios únicos del estado
  const availableMunicipios = useMemo(() => {
    const set = new Set<string>();
    stateGeoSections.forEach(s => {
      if (s.municipio) set.add(s.municipio);
    });
    return Array.from(set).sort();
  }, [stateGeoSections]);

  // Distritos Federales únicos
  const availableFederalDistricts = useMemo(() => {
    const set = new Set<number>();
    stateGeoSections.forEach(s => {
      if (s.distrito_f) set.add(Number(s.distrito_f));
    });
    if (set.size > 0) return Array.from(set).sort((a, b) => a - b);
    return Array.from({ length: selectedState.totalFederalDistricts || 6 }, (_, i) => i + 1);
  }, [stateGeoSections, selectedState]);

  // Distritos Locales únicos
  const availableLocalDistricts = useMemo(() => {
    const set = new Set<number>();
    stateGeoSections.forEach(s => {
      if (s.distrito_l) set.add(Number(s.distrito_l));
    });
    if (set.size > 0) return Array.from(set).sort((a, b) => a - b);
    return Array.from({ length: selectedState.totalLocalDistricts || 15 }, (_, i) => i + 1);
  }, [stateGeoSections, selectedState]);

  // Nombre formateado de la demarcación territorial seleccionada
  const defaultTerritoryName = useMemo(() => {
    if (electionType === 'estatal') {
      return `Estado de ${selectedState.commonName} (Cobertura Estatal)`;
    }
    if (electionType === 'diputacion_federal') {
      return `Distrito Federal ${selectedFederalDistrict} (${selectedState.commonName})`;
    }
    if (electionType === 'diputacion_local') {
      return `Distrito Local ${selectedLocalDistrict} (${selectedState.commonName})`;
    }
    return `Municipio de ${selectedMunicipioName || 'Cabecera'}, ${selectedState.abbr.toUpperCase()}`;
  }, [electionType, selectedState, selectedFederalDistrict, selectedLocalDistrict, selectedMunicipioName]);

  // Secciones calculadas automáticamente según el fragmento territorial seleccionado
  const computedSectionsForElection = useMemo<string[]>(() => {
    if (stateGeoSections.length === 0) return [];

    let filtered: string[] = [];
    if (electionType === 'estatal') {
      filtered = stateGeoSections.map(s => String(s.seccion)).filter(Boolean);
    } else if (electionType === 'diputacion_federal') {
      filtered = stateGeoSections
        .filter(s => Number(s.distrito_f) === Number(selectedFederalDistrict))
        .map(s => String(s.seccion))
        .filter(Boolean);
    } else if (electionType === 'diputacion_local') {
      filtered = stateGeoSections
        .filter(s => Number(s.distrito_l) === Number(selectedLocalDistrict))
        .map(s => String(s.seccion))
        .filter(Boolean);
    } else if (electionType === 'municipio') {
      filtered = stateGeoSections
        .filter(s => s.municipio === selectedMunicipioName)
        .map(s => String(s.seccion))
        .filter(Boolean);
    }

    return Array.from(new Set(filtered)).sort();
  }, [
    stateGeoSections,
    electionType,
    selectedFederalDistrict,
    selectedLocalDistrict,
    selectedMunicipioName,
  ]);

  // Asignar automáticamente ese fragmento territorial y sus correspondientes secciones al Coordinador
  useEffect(() => {
    if (computedSectionsForElection.length > 0) {
      setSelectedSections(computedSectionsForElection);
    }
  }, [computedSectionsForElection]);

  // Mantener actualizado el nombre sugerido de la demarcación si no fue modificado manualmente
  useEffect(() => {
    if (!isEditing || !initialLeader?.territoryName) {
      setTerritoryName(defaultTerritoryName);
    }
  }, [defaultTerritoryName, isEditing, initialLeader]);

  // Generador de usuario sugerido
  function generateSuggestedUsername(fullName: string): string {
    const clean = fullName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .trim();
    const parts = clean.split(/\s+/);
    const prefix = targetChildLevel === 'cpv' ? 'cpv' : (targetChildLevel || 'cpv');
    if (parts.length >= 2) {
      return `${prefix}_${parts[0]}.${parts[1]}`;
    } else if (parts[0]) {
      return `${prefix}_${parts[0]}`;
    }
    return '';
  }

  const handleNameChange = (val: string) => {
    setName(val);
    if (!isEditing && (!username || username === generateSuggestedUsername(name))) {
      const suggested = generateSuggestedUsername(val);
      setUsername(suggested);
      validateUsernameUnique(suggested);
    }
  };

  const validateUsernameUnique = (usr: string) => {
    const clean = usr.trim().toLowerCase();
    if (!clean) {
      setUsernameError(null);
      return;
    }
    const exists = accounts.some(
      a => a.username.toLowerCase() === clean && a.id !== initialAccount?.id
    );
    if (exists) {
      setUsernameError(`El nombre de usuario "${clean}" ya está ocupado.`);
    } else {
      setUsernameError(null);
    }
  };

  // Secciones filtradas para la visualización del acordeón
  const visibleSectionsFiltered = useMemo(() => {
    if (!sectionSearch.trim()) return selectedSections;
    const q = sectionSearch.trim().toLowerCase();
    return selectedSections.filter(s => s.toLowerCase().includes(q));
  }, [selectedSections, sectionSearch]);

  const resolvedPartyName = useMemo(() => {
    if (selectedParty === 'otro') {
      return customPartyName.trim() || 'Candidatura Independiente';
    }
    return OFFICIAL_POLITICAL_PARTIES.find(p => p.id === selectedParty)?.name || 'MORENA';
  }, [selectedParty, customPartyName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Ingresa el nombre completo del Coordinador de Promoción al Voto.');
      return;
    }
    if (!username.trim()) {
      alert('Ingresa un nombre de usuario.');
      return;
    }

    const cleanUser = username.trim().toLowerCase();
    const isTaken = accounts.some(
      a => a.username.toLowerCase() === cleanUser && a.id !== initialAccount?.id
    );
    if (isTaken) {
      alert(`El nombre de usuario "@${cleanUser}" ya existe. Elige otro por favor.`);
      return;
    }

    if (!isEditing && !password.trim()) {
      alert('Ingresa una contraseña o presiona "Generar segura".');
      return;
    }

    setIsSubmitting(true);
    try {
      const coordId = initialLeader?.id || `ldr-cpv-${Date.now()}`;
      const userId = initialAccount?.id || `usr-cpv-${Date.now()}`;

      const territoryLabel = territoryName.trim() || defaultTerritoryName;

      const updatedLeader: TerritorialLeader = {
        ...(initialLeader || {}),
        id: coordId,
        name: name.trim(),
        role: 'Coordinador de Promoción al Voto (CPV)',
        level: targetChildLevel,
        levelIndex: 1,
        territoryName: territoryLabel,
        parentId: initialLeader ? initialLeader.parentId : (currentUser.isSuperAdmin ? null : (currentUser.leaderId || null)),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        username: cleanUser,
        hasAccount: true,
        metaGoal: initialLeader?.metaGoal || 5000,
        currentCount: initialLeader?.currentCount || 0,
        status: initialLeader?.status || 'en_progreso',
        validationStatus: initialLeader?.validationStatus || 'validado',
        assignedSections: selectedSections,
        avatarBg: initialLeader?.avatarBg || 'bg-[#9d2449]',
        notes: `Campaña: ${campaignName.trim() || 'Oficial'} | Candidato: ${candidateName.trim() || name.trim()} | Partido: ${resolvedPartyName} | Elección: ${electionType.toUpperCase()}`,
        directTeamCount: initialLeader?.directTeamCount || 0,
        campaignName: campaignName.trim() || undefined,
        candidateName: candidateName.trim() || undefined,
        partyName: resolvedPartyName,
        partyId: selectedParty,
        electionType: electionType,
        stateId: selectedStateId,
      };

      const updatedAccount: UserAccount = {
        ...(initialAccount || {}),
        id: userId,
        username: cleanUser,
        name: name.trim(),
        email: email.trim() || `${cleanUser}@elecciones.legislab.app`,
        phone: phone.trim() || undefined,
        leaderId: coordId,
        level: targetChildLevel,
        territoryName: territoryLabel,
        assignedSections: selectedSections,
        avatarBg: initialAccount?.avatarBg || 'bg-[#9d2449]',
        accountRoleLabel: 'Coordinador de Promoción al Voto (CPV)',
        campaignName: campaignName.trim() || undefined,
        candidateName: candidateName.trim() || undefined,
        partyName: resolvedPartyName,
        electionType: electionType,
        stateId: selectedStateId,
      };

      if (password.trim()) {
        updatedAccount.password = password.trim();
      }

      await onSaveCoordinator(updatedLeader, updatedAccount);
    } catch (err) {
      console.error(err);
      alert('Hubo un error al guardar el registro del Coordinador de Promoción al Voto.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-y-auto font-sans">
      {/* 1. Header Oficial: Usuarios > Nuevo Coordinador de Promoción al Voto */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-8 py-5 shrink-0">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Volver al listado"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Usuarios &gt; {isEditing ? 'Editar Coordinador de Promoción al Voto' : 'Nuevo Coordinador de Promoción al Voto'}
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={onBack}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 hidden sm:block cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      </div>

      {/* 2. Contenedor del Formulario */}
      <div className="flex-1 p-4 sm:p-8">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
          
          {/* Card: 1. Datos del Titular */}
          <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <User className="w-5 h-5 text-[#9d2449]" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  1. Datos del Titular
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-medium">Campos requeridos *</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nombre Completo */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Lic. Roberto Gómez Fernández"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9d2449] transition-all"
                />
              </div>

              {/* Teléfono */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Teléfono Móvil (WhatsApp)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    placeholder="ej. 9931234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9d2449] transition-all"
                  />
                </div>
              </div>

              {/* Correo Electrónico */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    placeholder="ej. roberto@plataforma.mx"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9d2449] transition-all"
                  />
                </div>
              </div>

              {/* Nombre de la Campaña */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nombre de la Campaña *
                </label>
                <div className="relative">
                  <Flag className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="ej. Campaña por la Transformación 2024"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9d2449] transition-all"
                  />
                </div>
              </div>

              {/* Nombre del Candidato */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nombre del Candidato *
                </label>
                <div className="relative">
                  <UserCheck className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="ej. Lic. Javier May Rodríguez"
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9d2449] transition-all"
                  />
                </div>
              </div>

              {/* Partido Político */}
              <div className="sm:col-span-2 pt-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Partido Político *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {OFFICIAL_POLITICAL_PARTIES.map(party => {
                    const isSelected = selectedParty === party.id;
                    return (
                      <button
                        key={party.id}
                        type="button"
                        onClick={() => setSelectedParty(party.id)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 cursor-pointer ${
                          isSelected
                            ? 'border-[#9d2449] bg-rose-50/70 text-[#9d2449] shadow-xs ring-1 ring-[#9d2449]'
                            : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: party.color }}
                        />
                        <span className="truncate">{party.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#9d2449] ml-auto shrink-0" />}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setSelectedParty('otro')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 cursor-pointer ${
                      selectedParty === 'otro'
                        ? 'border-[#9d2449] bg-rose-50/70 text-[#9d2449] shadow-xs ring-1 ring-[#9d2449]'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full bg-slate-400 shrink-0" />
                    <span className="truncate">Otro / Indep.</span>
                    {selectedParty === 'otro' && <Check className="w-3.5 h-3.5 text-[#9d2449] ml-auto shrink-0" />}
                  </button>
                </div>
                {selectedParty === 'otro' && (
                  <div className="mt-2.5">
                    <input
                      type="text"
                      placeholder="Escribe el nombre del partido o agrupación política..."
                      value={customPartyName}
                      onChange={(e) => setCustomPartyName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9d2449]"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card: 2. Credenciales de Acceso */}
          <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <KeyRound className="w-5 h-5 text-[#9d2449]" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  2. Credenciales de Acceso
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">Acceso a plataforma</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Usuario */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nombre de Usuario *
                </label>
                <div className="relative">
                  <span className="text-slate-400 text-xs absolute left-3 top-2.5 font-mono">@</span>
                  <input
                    type="text"
                    required
                    placeholder="cpv.oficial"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      validateUsernameUnique(e.target.value);
                    }}
                    className={`w-full bg-slate-50 border rounded-xl pl-8 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9d2449] transition-all font-mono ${
                      usernameError ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
                    }`}
                  />
                </div>
                {usernameError && (
                  <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    {usernameError}
                  </p>
                )}
              </div>

              {/* Contraseña */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    {isEditing ? 'Nueva Contraseña (opcional)' : 'Contraseña *'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setPassword(generateSecurePassword())}
                    className="text-[11px] text-[#9d2449] hover:underline font-bold cursor-pointer"
                  >
                    Generar segura
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required={!isEditing}
                    placeholder={isEditing ? 'Dejar en blanco para conservar actual' : 'Presiona Generar segura o escribe clave'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9d2449] transition-all font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card: 3. Asignación Territorial y Demarcación */}
          <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <MapPin className="w-5 h-5 text-[#9d2449]" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  3. Asignación Territorial y Demarcación
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">Delimitación electoral oficial</span>
            </div>

            {/* Selector de Tipo de Elección */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Tipo de Elección *
              </label>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Estatal */}
                <button
                  type="button"
                  onClick={() => setElectionType('estatal')}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                    electionType === 'estatal'
                      ? 'border-[#9d2449] bg-rose-50/50 shadow-xs ring-2 ring-[#9d2449]'
                      : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100/70 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <Landmark className={`w-4 h-4 ${electionType === 'estatal' ? 'text-[#9d2449]' : 'text-slate-500'}`} />
                      <span className={`text-xs font-bold ${electionType === 'estatal' ? 'text-[#9d2449]' : 'text-slate-900'}`}>
                        Estatal
                      </span>
                    </div>
                    {electionType === 'estatal' && <CheckCircle2 className="w-4 h-4 text-[#9d2449]" />}
                  </div>
                  <p className="text-[10px] text-slate-500 line-clamp-1">Cobertura estatal completa</p>
                </button>

                {/* 2. Diputación Federal */}
                <button
                  type="button"
                  onClick={() => setElectionType('diputacion_federal')}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                    electionType === 'diputacion_federal'
                      ? 'border-[#9d2449] bg-rose-50/50 shadow-xs ring-2 ring-[#9d2449]'
                      : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100/70 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <Building2 className={`w-4 h-4 ${electionType === 'diputacion_federal' ? 'text-[#9d2449]' : 'text-slate-500'}`} />
                      <span className={`text-xs font-bold ${electionType === 'diputacion_federal' ? 'text-[#9d2449]' : 'text-slate-900'}`}>
                        Diputación Federal
                      </span>
                    </div>
                    {electionType === 'diputacion_federal' && <CheckCircle2 className="w-4 h-4 text-[#9d2449]" />}
                  </div>
                  <p className="text-[10px] text-slate-500 line-clamp-1">Distrito Electoral Federal</p>
                </button>

                {/* 3. Diputación Local */}
                <button
                  type="button"
                  onClick={() => setElectionType('diputacion_local')}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                    electionType === 'diputacion_local'
                      ? 'border-[#9d2449] bg-rose-50/50 shadow-xs ring-2 ring-[#9d2449]'
                      : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100/70 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <Layers className={`w-4 h-4 ${electionType === 'diputacion_local' ? 'text-[#9d2449]' : 'text-slate-500'}`} />
                      <span className={`text-xs font-bold ${electionType === 'diputacion_local' ? 'text-[#9d2449]' : 'text-slate-900'}`}>
                        Diputación Local
                      </span>
                    </div>
                    {electionType === 'diputacion_local' && <CheckCircle2 className="w-4 h-4 text-[#9d2449]" />}
                  </div>
                  <p className="text-[10px] text-slate-500 line-clamp-1">Distrito Electoral Local</p>
                </button>

                {/* 4. Municipio */}
                <button
                  type="button"
                  onClick={() => setElectionType('municipio')}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                    electionType === 'municipio'
                      ? 'border-[#9d2449] bg-rose-50/50 shadow-xs ring-2 ring-[#9d2449]'
                      : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100/70 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <MapPin className={`w-4 h-4 ${electionType === 'municipio' ? 'text-[#9d2449]' : 'text-slate-500'}`} />
                      <span className={`text-xs font-bold ${electionType === 'municipio' ? 'text-[#9d2449]' : 'text-slate-900'}`}>
                        Municipio
                      </span>
                    </div>
                    {electionType === 'municipio' && <CheckCircle2 className="w-4 h-4 text-[#9d2449]" />}
                  </div>
                  <p className="text-[10px] text-slate-500 line-clamp-1">Presidencia Municipal</p>
                </button>
              </div>
            </div>

            {/* Selectores Geográficos Condicionales */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Selector de Estado (Siempre presente) */}
              <div className={electionType === 'estatal' ? 'sm:col-span-2' : ''}>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Estado de la República *
                </label>
                <select
                  value={selectedStateId}
                  onChange={(e) => setSelectedStateId(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9d2449] font-medium transition-all"
                >
                  {MEXICAN_STATES.map(s => (
                    <option key={s.stateId} value={s.stateId}>
                      {s.name} ({s.commonName}) - {s.totalSections} secciones
                    </option>
                  ))}
                </select>
              </div>

              {/* Si es Diputación Federal: Selector de Distrito Federal */}
              {electionType === 'diputacion_federal' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Distrito Electoral Federal *
                  </label>
                  <select
                    value={selectedFederalDistrict}
                    onChange={(e) => setSelectedFederalDistrict(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9d2449] font-medium transition-all"
                  >
                    {availableFederalDistricts.map(dist => (
                      <option key={dist} value={dist}>
                        Distrito Federal {String(dist).padStart(2, '0')} ({selectedState.commonName})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Si es Diputación Local: Selector de Distrito Local */}
              {electionType === 'diputacion_local' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Distrito Electoral Local *
                  </label>
                  <select
                    value={selectedLocalDistrict}
                    onChange={(e) => setSelectedLocalDistrict(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9d2449] font-medium transition-all"
                  >
                    {availableLocalDistricts.map(dist => (
                      <option key={dist} value={dist}>
                        Distrito Local {String(dist).padStart(2, '0')} ({selectedState.commonName})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Si es Municipio: Selector de Municipio */}
              {electionType === 'municipio' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Municipio *
                  </label>
                  <select
                    value={selectedMunicipioName}
                    onChange={(e) => setSelectedMunicipioName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9d2449] font-medium transition-all"
                  >
                    {availableMunicipios.length === 0 ? (
                      <option value="">Cargando municipios...</option>
                    ) : (
                      availableMunicipios.map(m => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}
            </div>

            {/* Tarjeta Informativa de Secciones Asignadas Automáticamente */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4.5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
                    {loadingGeo ? (
                      <Loader2 className="w-4 h-4 animate-spin text-[#9d2449]" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <span>{selectedSections.length} Secciones Electorales Asignadas</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        Cobertura Oficial
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Este fragmento territorial queda asignado al Coordinador de Promoción al Voto para el despliegue en campo.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowSectionDetail(prev => !prev)}
                  className="text-xs font-bold text-[#9d2449] hover:underline cursor-pointer self-start sm:self-auto shrink-0"
                >
                  {showSectionDetail ? 'Ocultar secciones' : 'Ver secciones asignadas'}
                </button>
              </div>

              {/* Visor colapsable de secciones asignadas */}
              {showSectionDetail && (
                <div className="pt-2 border-t border-slate-200/70 space-y-2.5 animate-in fade-in duration-150">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Buscar número de sección asignada..."
                      value={sectionSearch}
                      onChange={(e) => setSectionSearch(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#9d2449]"
                    />
                  </div>

                  <div className="max-h-40 overflow-y-auto p-2.5 bg-white rounded-xl border border-slate-200 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1.5">
                    {visibleSectionsFiltered.map(secNum => (
                      <div
                        key={secNum}
                        className="px-2 py-1 text-[11px] font-mono font-bold rounded-md bg-rose-50 text-[#9d2449] border border-rose-200/80 flex items-center justify-center text-center"
                      >
                        {secNum}
                      </div>
                    ))}
                    {visibleSectionsFiltered.length === 0 && (
                      <p className="col-span-full text-center text-xs text-slate-400 py-3">
                        No se encontraron secciones con el criterio de búsqueda.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Nombre de la Demarcación Asignada (Prellenado pero editable) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Nombre de la Demarcación / Territorio Asignado
              </label>
              <input
                type="text"
                placeholder={defaultTerritoryName}
                value={territoryName}
                onChange={(e) => setTerritoryName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9d2449] transition-all"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Generado automáticamente según el tipo de elección y estado. Puedes editarlo para personalizar su denominación.
              </p>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onBack}
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !!usernameError}
              className="px-6 py-2.5 bg-[#9d2449] hover:bg-[#851e3e] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-98"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Guardando...' : (isEditing ? 'Guardar Cambios' : 'Dar de Alta Coordinador de Promoción al Voto')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Re-export for compatibility
export const CreateTerritorialCoordinatorPage = SubordinateCreatePage;
