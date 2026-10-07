import React, { useState, useEffect, useMemo } from 'react';
import type { TerritorialLeader } from '../types/territory';
import type { UserAccount } from '../types/auth';
import { MEXICAN_STATES, type StateData } from '../data/statesData';
import { 
  Flag, 
  MapPin, 
  User, 
  Copy, 
  Check, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  LogIn, 
  Loader2,
  Layers,
  ShieldCheck
} from 'lucide-react';

export type CampaignType = 'estatal' | 'municipal' | 'diputacion_local' | 'diputacion_federal';

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

interface CreateCampanaCoordinatorWizardPageProps {
  onBack: () => void;
  onSaveCoordinator: (leader: TerritorialLeader, account: UserAccount) => Promise<void>;
  onImpersonate?: (account: UserAccount) => void;
}

export const CreateCampanaCoordinatorWizardPage: React.FC<CreateCampanaCoordinatorWizardPageProps> = ({
  onBack,
  onSaveCoordinator,
  onImpersonate,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // 1. Datos de la Campaña
  const [campaignName, setCampaignName] = useState('');
  const [selectedParty, setSelectedParty] = useState('morena');
  const [customPartyName, setCustomPartyName] = useState('');
  const [campaignType, setCampaignType] = useState<CampaignType>('estatal');

  // 2. Delimitación Territorial y Secciones Electorales
  const [selectedStateId, setSelectedStateId] = useState<number>(27); // Default 27 (Tabasco)
  const [selectedMunicipioName, setSelectedMunicipioName] = useState<string>('');
  const [selectedLocalDistrict, setSelectedLocalDistrict] = useState<number>(1);
  const [selectedFederalDistrict, setSelectedFederalDistrict] = useState<number>(1);

  // Datos geográficos dinámicos del estado seleccionado
  const [stateGeoSections, setStateGeoSections] = useState<any[]>([]);
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // 3. Datos del Coordinador y Credenciales
  const [coordinatorName, setCoordinatorName] = useState('');
  const [coordinatorPhone, setCoordinatorPhone] = useState('');
  const [coordinatorEmail, setCoordinatorEmail] = useState('');
  const [coordinatorUsername, setCoordinatorUsername] = useState('');
  const [coordinatorPassword, setCoordinatorPassword] = useState('campana2026');
  const [metaGoal, setMetaGoal] = useState<number>(5000);

  // 4. Estado de envío y éxito
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedResult, setSavedResult] = useState<{ leader: TerritorialLeader; account: UserAccount } | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Estado activo en el catálogo
  const selectedState = useMemo<StateData>(() => {
    return MEXICAN_STATES.find(s => s.stateId === selectedStateId) || MEXICAN_STATES[26];
  }, [selectedStateId]);

  // Cargar cartografía de secciones del estado seleccionado
  useEffect(() => {
    let isCancelled = false;
    setLoadingGeo(true);
    setGeoError(null);

    const loadStateGeo = async () => {
      try {
        const res = await fetch(`/geo/secciones/${selectedState.abbr}.json`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!isCancelled && Array.isArray(data.features)) {
          const mapped = data.features.map((f: any) => f.properties || {});
          setStateGeoSections(mapped);
          // Preseleccionar primer municipio si existe
          const municipios = Array.from(new Set(mapped.map((m: any) => m.municipio).filter(Boolean))).sort();
          if (municipios.length > 0) {
            setSelectedMunicipioName(municipios[0] as string);
          }
        }
      } catch (err: any) {
        console.warn(`Aviso cargando secciones de ${selectedState.abbr}:`, err);
        if (!isCancelled) {
          setGeoError(`Cartografía nacional en línea: calculando cobertura con métricas DERFE 2025 (${selectedState.totalSections} secciones).`);
          setStateGeoSections([]);
        }
      } finally {
        if (!isCancelled) setLoadingGeo(false);
      }
    };

    loadStateGeo();
    return () => { isCancelled = true; };
  }, [selectedState]);

  // Municipios únicos disponibles en el estado
  const availableMunicipios = useMemo(() => {
    const set = new Set<string>();
    stateGeoSections.forEach(s => {
      if (s.municipio) set.add(s.municipio);
    });
    return Array.from(set).sort();
  }, [stateGeoSections]);

  // Distritos Locales únicos
  const availableLocalDistricts = useMemo(() => {
    const set = new Set<number>();
    stateGeoSections.forEach(s => {
      if (s.distrito_l) set.add(Number(s.distrito_l));
    });
    if (set.size > 0) return Array.from(set).sort((a, b) => a - b);
    return Array.from({ length: selectedState.totalLocalDistricts || 15 }, (_, i) => i + 1);
  }, [stateGeoSections, selectedState]);

  // Distritos Federales únicos
  const availableFederalDistricts = useMemo(() => {
    const set = new Set<number>();
    stateGeoSections.forEach(s => {
      if (s.distrito_f) set.add(Number(s.distrito_f));
    });
    if (set.size > 0) return Array.from(set).sort((a, b) => a - b);
    return Array.from({ length: selectedState.totalFederalDistricts || 6 }, (_, i) => i + 1);
  }, [stateGeoSections, selectedState]);

  // Secciones asignadas al coordinador según el tipo de campaña
  const assignedSectionsList = useMemo<string[]>(() => {
    if (stateGeoSections.length === 0) {
      // Fallback a secciones correlativas si el GeoJSON se está descargando
      const count = campaignType === 'estatal' 
        ? Math.min(selectedState.totalSections, 500)
        : campaignType === 'municipal'
        ? Math.round(selectedState.totalSections / Math.max(selectedState.totalMunicipalities, 1))
        : Math.round(selectedState.totalSections / Math.max(selectedState.totalLocalDistricts, 1));
      return Array.from({ length: count }, (_, i) => String(i + 1).padStart(4, '0'));
    }

    if (campaignType === 'estatal') {
      return stateGeoSections.map(s => String(s.seccion)).filter(Boolean);
    }

    if (campaignType === 'municipal') {
      return stateGeoSections
        .filter(s => s.municipio === selectedMunicipioName)
        .map(s => String(s.seccion))
        .filter(Boolean);
    }

    if (campaignType === 'diputacion_local') {
      return stateGeoSections
        .filter(s => Number(s.distrito_l) === Number(selectedLocalDistrict))
        .map(s => String(s.seccion))
        .filter(Boolean);
    }

    if (campaignType === 'diputacion_federal') {
      return stateGeoSections
        .filter(s => Number(s.distrito_f) === Number(selectedFederalDistrict))
        .map(s => String(s.seccion))
        .filter(Boolean);
    }

    return [];
  }, [
    stateGeoSections,
    campaignType,
    selectedState,
    selectedMunicipioName,
    selectedLocalDistrict,
    selectedFederalDistrict,
  ]);

  // Nombre formateado del territorio
  const territoryFullName = useMemo(() => {
    if (campaignType === 'estatal') {
      return `Estado de ${selectedState.commonName} (Cobertura Estatal)`;
    }
    if (campaignType === 'municipal') {
      return `Municipio de ${selectedMunicipioName || 'Centro'}, ${selectedState.abbr.toUpperCase()}`;
    }
    if (campaignType === 'diputacion_local') {
      return `Distrito Local ${selectedLocalDistrict} (${selectedState.commonName})`;
    }
    return `Distrito Federal ${selectedFederalDistrict} (${selectedState.commonName})`;
  }, [campaignType, selectedState, selectedMunicipioName, selectedLocalDistrict, selectedFederalDistrict]);

  // Autogenerar username a partir del nombre
  useEffect(() => {
    if (!coordinatorUsername && coordinatorName.trim()) {
      const clean = coordinatorName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '.');
      setCoordinatorUsername(clean.slice(0, 25));
    }
  }, [coordinatorName, coordinatorUsername]);

  // Nombre final del partido
  const resolvedPartyName = selectedParty === 'otro' 
    ? (customPartyName.trim() || 'Candidatura Independiente')
    : OFFICIAL_POLITICAL_PARTIES.find(p => p.id === selectedParty)?.name || 'MORENA';

  // Manejar creación final
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!coordinatorName.trim() || !campaignName.trim() || !coordinatorUsername.trim() || !coordinatorPassword.trim()) {
      alert('Por favor completa todos los campos requeridos.');
      return;
    }

    setIsSubmitting(true);

    const safeCoordId = `coord-campana-${Date.now()}`;
    const safeUserId = `usr-${safeCoordId}`;
    const cleanUser = coordinatorUsername.trim().toLowerCase();
    const cleanEmail = (coordinatorEmail.trim() || `${cleanUser}@campana.mx`).toLowerCase();

    const newLeader: TerritorialLeader = {
      id: safeCoordId,
      name: coordinatorName.trim(),
      role: 'Coordinador de Campaña',
      level: 'campana',
      levelIndex: 0,
      parentId: null,
      territoryName: territoryFullName,
      code: `CAMP-${selectedState.abbr.toUpperCase()}-${assignedSectionsList[0] || '01'}`,
      phone: coordinatorPhone.trim() || undefined,
      email: cleanEmail,
      username: cleanUser,
      hasAccount: true,
      metaGoal: Number(metaGoal) || (assignedSectionsList.length * 50) || 5000,
      currentCount: 0,
      status: 'en_progreso',
      validationStatus: 'validado',
      assignedSections: assignedSectionsList,
      avatarBg: 'bg-[#9d2449]',
      notes: `Campaña: ${campaignName.trim()} | Partido: ${resolvedPartyName} | Ámbito: ${campaignType.toUpperCase()}`,
      directTeamCount: 0,
    };

    const newAccount: UserAccount = {
      id: safeUserId,
      username: cleanUser,
      name: coordinatorName.trim(),
      email: cleanEmail,
      password: coordinatorPassword.trim(),
      phone: coordinatorPhone.trim() || undefined,
      leaderId: safeCoordId,
      level: 'campana',
      territoryName: territoryFullName,
      assignedSections: assignedSectionsList,
      avatarBg: 'bg-[#9d2449]',
      accountRoleLabel: 'Coordinador de Campaña',
      isSuperAdmin: false,
    };

    try {
      await onSaveCoordinator(newLeader, newAccount);
      setSavedResult({ leader: newLeader, account: newAccount });
      setCurrentStep(4);
    } catch (err: any) {
      alert('Error al registrar coordinador: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyCredentialsText = () => {
    if (!savedResult) return;
    const { leader, account } = savedResult;
    const text = `🗳️ *CREDENCIALES DE ACCESO - SISTEMA ELECTORAL TERRITORIAL* 🗳️

👤 *Coordinador:* ${leader.name}
🚩 *Campaña:* ${campaignName} (${resolvedPartyName})
📍 *Territorio Asignado:* ${leader.territoryName}
📊 *Secciones Bajo tu Mando:* ${leader.assignedSections?.length || 0} secciones
🎯 *Meta Objetivo:* ${leader.metaGoal.toLocaleString()} promovidos

🔐 *TUS ACCESOS AL SISTEMA:*
👉 *Usuario o Correo:* ${account.username} (o ${account.email})
🔑 *Contraseña:* ${account.password}

🌐 *Enlace de Ingreso:* ${window.location.origin}/
_Por favor guarda este mensaje y mantén seguras tus credenciales._`;

    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 3000);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 text-slate-800 p-4 sm:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Encabezado con Botón de Regreso */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al Panel SaaS</span>
          </button>

          <span className="text-xs font-semibold text-[#9d2449] bg-[#9d2449]/10 px-3 py-1 rounded-full border border-[#9d2449]/20">
            Alta de Coordinador de Campaña (Exclusivo Superadmin)
          </span>
        </div>

        {/* Título de la Página */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Nuevo Coordinador de Campaña
          </h1>
          <p className="text-xs text-slate-500">
            Asigna el ámbito territorial, partido político y genera los accesos oficiales para el titular de la campaña.
          </p>
        </div>

        {/* Stepper Superior */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="grid grid-cols-4 gap-2 sm:gap-4 text-xs">
            <button
              type="button"
              onClick={() => currentStep > 1 && currentStep < 4 && setCurrentStep(1)}
              className={`flex items-center gap-2 p-2 rounded-xl transition-colors text-left ${
                currentStep === 1 
                  ? 'bg-[#9d2449] text-white font-bold' 
                  : currentStep > 1 
                  ? 'bg-emerald-50 text-emerald-800 font-semibold' 
                  : 'text-slate-400'
              }`}
            >
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold border border-current shrink-0">
                1
              </div>
              <span className="truncate hidden sm:inline">1. Campaña & Partido</span>
            </button>

            <button
              type="button"
              onClick={() => currentStep > 2 && currentStep < 4 && setCurrentStep(2)}
              className={`flex items-center gap-2 p-2 rounded-xl transition-colors text-left ${
                currentStep === 2 
                  ? 'bg-[#9d2449] text-white font-bold' 
                  : currentStep > 2 
                  ? 'bg-emerald-50 text-emerald-800 font-semibold' 
                  : 'text-slate-400'
              }`}
            >
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold border border-current shrink-0">
                2
              </div>
              <span className="truncate hidden sm:inline">2. Territorio & Secciones</span>
            </button>

            <button
              type="button"
              onClick={() => currentStep > 3 && currentStep < 4 && setCurrentStep(3)}
              className={`flex items-center gap-2 p-2 rounded-xl transition-colors text-left ${
                currentStep === 3 
                  ? 'bg-[#9d2449] text-white font-bold' 
                  : currentStep > 3 
                  ? 'bg-emerald-50 text-emerald-800 font-semibold' 
                  : 'text-slate-400'
              }`}
            >
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold border border-current shrink-0">
                3
              </div>
              <span className="truncate hidden sm:inline">3. Datos & Acceso</span>
            </button>

            <div
              className={`flex items-center gap-2 p-2 rounded-xl text-left ${
                currentStep === 4 
                  ? 'bg-emerald-600 text-white font-bold' 
                  : 'text-slate-400'
              }`}
            >
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold border border-current shrink-0">
                4
              </div>
              <span className="truncate hidden sm:inline">4. Ficha Generada</span>
            </div>
          </div>
        </div>

        {/* CONTENIDO DEL WIZARD */}
        {currentStep === 1 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Flag className="w-4 h-4 text-[#9d2449]" />
                <span>Paso 1: Nombre de la Campaña y Partido Político</span>
              </h2>
              <p className="text-xs text-slate-500">
                Define el proyecto electoral y la organización que respalda al coordinador.
              </p>
            </div>

            <div className="space-y-5">
              {/* Nombre de la Campaña */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  1. Nombre de la Campaña *
                </label>
                <input
                  type="text"
                  required
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="ej. Campaña Alcaldía Centro 2027 o Gubernatura Tabasco"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#9d2449] focus:ring-1 focus:ring-[#9d2449]"
                />
              </div>

              {/* Partido Político */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  2. Partido Político *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {OFFICIAL_POLITICAL_PARTIES.map((party) => {
                    const isSelected = selectedParty === party.id;
                    return (
                      <button
                        key={party.id}
                        type="button"
                        onClick={() => setSelectedParty(party.id)}
                        className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all text-left cursor-pointer ${
                          isSelected
                            ? 'border-[#9d2449] bg-[#9d2449]/5 text-slate-900 ring-2 ring-[#9d2449]/30 shadow-xs'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <span 
                          className="w-3.5 h-3.5 rounded-full shrink-0" 
                          style={{ backgroundColor: party.color }}
                        />
                        <span className="truncate">{party.name}</span>
                      </button>
                    );
                  })}

                  {/* Opción Otro Partido */}
                  <button
                    type="button"
                    onClick={() => setSelectedParty('otro')}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all text-left cursor-pointer ${
                      selectedParty === 'otro'
                        ? 'border-[#9d2449] bg-[#9d2449]/5 text-slate-900 ring-2 ring-[#9d2449]/30 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="w-3.5 h-3.5 rounded-full bg-slate-400 shrink-0" />
                    <span>+ Otro / Independiente</span>
                  </button>
                </div>

                {/* Campo si seleccionó Otro */}
                {selectedParty === 'otro' && (
                  <div className="mt-3">
                    <input
                      type="text"
                      required
                      value={customPartyName}
                      onChange={(e) => setCustomPartyName(e.target.value)}
                      placeholder="Escribe el nombre del partido o agrupación política..."
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#9d2449] focus:ring-1 focus:ring-[#9d2449]"
                    />
                  </div>
                )}
              </div>

              {/* Tipo de Campaña */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  3. Tipo de Campaña *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: 'estatal', label: 'Estatal', desc: 'Todo el Estado' },
                    { id: 'municipal', label: 'Municipal', desc: 'Municipio Específico' },
                    { id: 'diputacion_local', label: 'Diputación Local', desc: 'Distrito Local' },
                    { id: 'diputacion_federal', label: 'Diputación Federal', desc: 'Distrito Federal' },
                  ].map((t) => {
                    const isSelected = campaignType === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setCampaignType(t.id as CampaignType)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#9d2449] bg-[#9d2449]/5 ring-2 ring-[#9d2449]/30'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="font-bold text-xs text-slate-900">{t.label}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{t.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="button"
                disabled={!campaignName.trim()}
                onClick={() => setCurrentStep(2)}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#9d2449] hover:bg-[#851e3e] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <span>Continuar a Territorio & Secciones</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* PASO 2: DELIMITACIÓN TERRITORIAL Y SECCIONES */}
        {currentStep === 2 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#9d2449]" />
                <span>Paso 2: Delimitación Territorial y Secciones Asignadas</span>
              </h2>
              <p className="text-xs text-slate-500">
                Selecciona la entidad y demarcación. Estas serán las únicas secciones disponibles para el Coordinador.
              </p>
            </div>

            <div className="space-y-5">
              {/* Selección del Estado */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Estado de la República Mexicana *
                </label>
                <select
                  value={selectedStateId}
                  onChange={(e) => setSelectedStateId(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#9d2449] focus:ring-1 focus:ring-[#9d2449]"
                >
                  {MEXICAN_STATES.map((st) => (
                    <option key={st.stateId} value={st.stateId}>
                      {st.name} ({st.totalSections.toLocaleString()} secciones • {st.totalMunicipalities} municipios)
                    </option>
                  ))}
                </select>
              </div>

              {/* Si es Municipal */}
              {campaignType === 'municipal' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Municipio Correspondiente *
                  </label>
                  {loadingGeo ? (
                    <div className="flex items-center gap-2 text-xs text-slate-500 p-2.5">
                      <Loader2 className="w-4 h-4 animate-spin text-[#9d2449]" />
                      <span>Cargando municipios de {selectedState.commonName}...</span>
                    </div>
                  ) : availableMunicipios.length > 0 ? (
                    <select
                      value={selectedMunicipioName}
                      onChange={(e) => setSelectedMunicipioName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#9d2449] focus:ring-1 focus:ring-[#9d2449]"
                    >
                      {availableMunicipios.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      value={selectedMunicipioName}
                      onChange={(e) => setSelectedMunicipioName(e.target.value)}
                      placeholder="Escribe el nombre del Municipio..."
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#9d2449] focus:ring-1 focus:ring-[#9d2449]"
                    />
                  )}
                </div>
              )}

              {/* Si es Diputación Local */}
              {campaignType === 'diputacion_local' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Distrito Local *
                  </label>
                  <select
                    value={selectedLocalDistrict}
                    onChange={(e) => setSelectedLocalDistrict(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#9d2449] focus:ring-1 focus:ring-[#9d2449]"
                  >
                    {availableLocalDistricts.map((d) => (
                      <option key={d} value={d}>
                        Distrito Local {d} ({selectedState.commonName})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Si es Diputación Federal */}
              {campaignType === 'diputacion_federal' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Distrito Federal *
                  </label>
                  <select
                    value={selectedFederalDistrict}
                    onChange={(e) => setSelectedFederalDistrict(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#9d2449] focus:ring-1 focus:ring-[#9d2449]"
                  >
                    {availableFederalDistricts.map((d) => (
                      <option key={d} value={d}>
                        Distrito Federal {d} ({selectedState.commonName})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Resumen de Secciones Asignadas */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-[#9d2449]" />
                    <span>Secciones Asignadas al Coordinador ({assignedSectionsList.length})</span>
                  </span>
                  <span className="text-[11px] font-mono text-[#9d2449] font-bold bg-[#9d2449]/10 px-2 py-0.5 rounded-lg">
                    {territoryFullName}
                  </span>
                </div>

                {geoError && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                    {geoError}
                  </p>
                )}

                {/* Muestra de Secciones en Chips */}
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-white border border-slate-200 rounded-lg">
                  {assignedSectionsList.slice(0, 80).map((sec) => (
                    <span 
                      key={sec} 
                      className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-mono font-semibold"
                    >
                      {sec}
                    </span>
                  ))}
                  {assignedSectionsList.length > 80 && (
                    <span className="px-2 py-0.5 bg-[#9d2449]/10 text-[#9d2449] rounded text-[11px] font-bold">
                      +{assignedSectionsList.length - 80} secciones más...
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Atrás</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#9d2449] hover:bg-[#851e3e] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <span>Continuar a Datos del Coordinador</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* PASO 3: DATOS DEL COORDINADOR Y CREDENCIALES */}
        {currentStep === 3 && (
          <form onSubmit={handleFinalSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-[#9d2449]" />
                <span>Paso 3: Datos del Coordinador y Credenciales de Acceso</span>
              </h2>
              <p className="text-xs text-slate-500">
                Estas credenciales se registrarán en la base de datos para que el coordinador pueda ingresar.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Nombre */}
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">
                  1. Nombre Completo del Coordinador *
                </label>
                <input
                  type="text"
                  required
                  value={coordinatorName}
                  onChange={(e) => setCoordinatorName(e.target.value)}
                  placeholder="ej. Lic. Roberto Gómez Fernández"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#9d2449] focus:ring-1 focus:ring-[#9d2449]"
                />
              </div>

              {/* Teléfono */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  2. Teléfono Celular (WhatsApp)
                </label>
                <input
                  type="tel"
                  value={coordinatorPhone}
                  onChange={(e) => setCoordinatorPhone(e.target.value)}
                  placeholder="ej. 993 123 4567"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#9d2449] focus:ring-1 focus:ring-[#9d2449]"
                />
              </div>

              {/* Correo */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  3. Correo Electrónico
                </label>
                <input
                  type="email"
                  value={coordinatorEmail}
                  onChange={(e) => setCoordinatorEmail(e.target.value)}
                  placeholder="ej. roberto@campana.mx"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#9d2449] focus:ring-1 focus:ring-[#9d2449]"
                />
              </div>

              {/* Usuario */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  4. Nombre de Usuario para Iniciar Sesión *
                </label>
                <input
                  type="text"
                  required
                  value={coordinatorUsername}
                  onChange={(e) => setCoordinatorUsername(e.target.value)}
                  placeholder="ej. roberto.gomez"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:border-[#9d2449] focus:ring-1 focus:ring-[#9d2449]"
                />
              </div>

              {/* Contraseña */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  5. Contraseña de Acceso *
                </label>
                <input
                  type="text"
                  required
                  value={coordinatorPassword}
                  onChange={(e) => setCoordinatorPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:border-[#9d2449] focus:ring-1 focus:ring-[#9d2449]"
                />
              </div>

              {/* Meta Objetivo */}
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">
                  Meta Objetivo de Ciudadanos Promovidos
                </label>
                <input
                  type="number"
                  value={metaGoal}
                  onChange={(e) => setMetaGoal(Number(e.target.value))}
                  placeholder="5000"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#9d2449] focus:ring-1 focus:ring-[#9d2449]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Atrás</span>
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#9d2449] hover:bg-[#851e3e] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Guardando en Servidor & Base de Datos...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Dar de Alta Coordinador Oficial</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* PASO 4: FICHA GENERADA Y CONFIRMACIÓN */}
        {currentStep === 4 && savedResult && (
          <div className="bg-white border border-emerald-200 rounded-2xl p-6 sm:p-8 shadow-md space-y-6 animate-emil-fade-in">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 mb-1">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                ¡Coordinador de Campaña Creado Exitosamente!
              </h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                La cuenta y su estructura han sido registradas en la base de datos real. Ya puede ingresar inmediatamente con sus credenciales.
              </p>
            </div>

            {/* Ficha de Credenciales */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                  Ficha Oficial de Acceso
                </span>
                <span className="bg-[#9d2449] text-white px-2 py-0.5 rounded text-[10px] font-bold">
                  {resolvedPartyName}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700">
                <div>
                  <span className="text-[11px] text-slate-400 block">Campaña:</span>
                  <span className="font-bold text-slate-900">{campaignName}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Coordinador Titular:</span>
                  <span className="font-bold text-slate-900">{savedResult.leader.name}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Territorio Asignado:</span>
                  <span className="font-bold text-slate-900">{savedResult.leader.territoryName}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Secciones Asignadas:</span>
                  <span className="font-bold text-emerald-700">{savedResult.leader.assignedSections?.length || 0} secciones</span>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-xl">
                  <span className="text-[11px] text-slate-400 block">Usuario / Correo:</span>
                  <span className="font-mono font-bold text-slate-900">{savedResult.account.username}</span>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-xl">
                  <span className="text-[11px] text-slate-400 block">Contraseña:</span>
                  <span className="font-mono font-bold text-[#9d2449]">{savedResult.account.password}</span>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={copyCredentialsText}
                  className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {copiedKey ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedKey ? '¡Ficha Copiada al Portapapeles!' : 'Copiar Ficha para WhatsApp'}</span>
                </button>

                {onImpersonate && (
                  <button
                    type="button"
                    onClick={() => onImpersonate(savedResult.account)}
                    className="py-2.5 px-4 bg-[#9d2449] hover:bg-[#851e3e] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                    title="Entrar de inmediato a su cuenta como auditor"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Entrar a su Cuenta Ahora</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={onBack}
                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Volver al Panel SaaS de Superadmin
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
