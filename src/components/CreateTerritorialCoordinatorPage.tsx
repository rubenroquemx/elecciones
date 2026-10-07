import React, { useState, useMemo } from 'react';
import type { TerritorialLeader, TerritorialLevel } from '../types/territory';
import type { UserAccount } from '../types/auth';
import type { ElectoralSection } from '../types/sections';
import { getAllowedChildLevel, getDefaultRoleForLevel } from '../utils/hierarchy';
import { LEVEL_CONFIG } from '../data/mockTerritoryData';
import { 
  ArrowLeft, 
  User, 
  Phone, 
  Mail, 
  Key, 
  Lock, 
  Search, 
  MapPin,
  CheckCircle2
} from 'lucide-react';

interface CreateTerritorialCoordinatorPageProps {
  currentUser: UserAccount;
  availableSections: ElectoralSection[];
  onSaveCoordinator: (leader: TerritorialLeader, account: UserAccount) => Promise<void>;
  onBack: () => void;
}

export const CreateTerritorialCoordinatorPage: React.FC<CreateTerritorialCoordinatorPageProps> = ({
  currentUser,
  availableSections,
  onSaveCoordinator,
  onBack,
}) => {
  // 1. Determinar nivel subordinado inmediato permitido
  const targetChildLevel: TerritorialLevel = useMemo(() => {
    return getAllowedChildLevel(currentUser.level) || 'distrital';
  }, [currentUser.level]);

  const childRoleLabel = useMemo(() => {
    return getDefaultRoleForLevel(targetChildLevel);
  }, [targetChildLevel]);

  const levelCfg = useMemo(() => {
    return LEVEL_CONFIG[targetChildLevel] || {
      color: 'text-indigo-700',
      bgLight: 'bg-indigo-50 border-indigo-200',
      border: 'border-indigo-600',
    };
  }, [targetChildLevel]);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('admin123');
  const [territoryName, setTerritoryName] = useState('');
  const [metaGoal, setMetaGoal] = useState(() => {
    switch (targetChildLevel) {
      case 'distrital': return '25000';
      case 'zona': return '8000';
      case 'responsable_zona': return '3000';
      case 'territorial': return '1000';
      case 'promotor': return '50';
      default: return '1500';
    }
  });
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [sectionSearch, setSectionSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lista de números de sección disponibles
  const sectionNumbers = useMemo(() => {
    const list = availableSections.map(s => s.sectionNumber);
    return Array.from(new Set(list)).sort();
  }, [availableSections]);

  // Secciones filtradas en el selector
  const filteredSectionNumbers = useMemo(() => {
    if (!sectionSearch.trim()) return sectionNumbers;
    const q = sectionSearch.trim().toLowerCase();
    return sectionNumbers.filter(s => s.includes(q));
  }, [sectionNumbers, sectionSearch]);

  function generateSuggestedUsername(fullName: string): string {
    const clean = fullName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .trim();
    const parts = clean.split(/\s+/);
    
    let prefix = 'user';
    switch (targetChildLevel) {
      case 'campana': prefix = 'jefe'; break;
      case 'distrital': prefix = 'coord_dist'; break;
      case 'zona': prefix = 'coord_zona'; break;
      case 'responsable_zona': prefix = 'resp_zona'; break;
      case 'territorial': prefix = 'resp_sec'; break;
      case 'promotor': prefix = 'prom'; break;
    }

    if (parts.length >= 2) {
      return `${prefix}_${parts[0]}.${parts[1]}`;
    } else if (parts[0]) {
      return `${prefix}_${parts[0]}`;
    }
    return '';
  }

  // Autogenerar nombre de usuario a partir del nombre
  const handleNameChange = (val: string) => {
    setName(val);
    if (!username || username === generateSuggestedUsername(name)) {
      setUsername(generateSuggestedUsername(val));
    }
  };

  const toggleSection = (secNum: string) => {
    setSelectedSections(prev => 
      prev.includes(secNum) ? prev.filter(s => s !== secNum) : [...prev, secNum]
    );
  };

  const selectAllFiltered = () => {
    setSelectedSections(prev => {
      const set = new Set([...prev, ...filteredSectionNumbers]);
      return Array.from(set).sort();
    });
  };

  const clearSelected = () => {
    setSelectedSections([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert(`Ingresa el nombre completo de ${childRoleLabel}.`);
      return;
    }
    if (!username.trim()) {
      alert('Ingresa un nombre de usuario.');
      return;
    }
    if (!password.trim()) {
      alert('Ingresa una contraseña.');
      return;
    }

    setIsSubmitting(true);
    try {
      const coordId = `ldr-${targetChildLevel}-${Date.now()}`;
      const userId = `usr-${targetChildLevel}-${Date.now()}`;
      
      let territoryLabel = territoryName.trim();
      if (!territoryLabel) {
        if (selectedSections.length > 0) {
          territoryLabel = `Secciones: ${selectedSections.slice(0, 3).join(', ')}${selectedSections.length > 3 ? '...' : ''}`;
        } else {
          territoryLabel = currentUser.territoryName || 'Territorio Asignado';
        }
      }

      const newLeader: TerritorialLeader = {
        id: coordId,
        name: name.trim(),
        role: childRoleLabel,
        level: targetChildLevel,
        levelIndex: 1,
        territoryName: territoryLabel,
        parentId: currentUser.leaderId || null,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        username: username.trim().toLowerCase(),
        hasAccount: true,
        metaGoal: Number(metaGoal) || 1500,
        currentCount: 0,
        status: 'en_progreso',
        validationStatus: 'validado',
        assignedSections: selectedSections,
        avatarBg: 'bg-[#9d2449]',
        notes: `${childRoleLabel} subordinado directo de ${currentUser.name}.`,
        directTeamCount: 0,
      };

      const newAccount: UserAccount = {
        id: userId,
        username: username.trim().toLowerCase(),
        name: name.trim(),
        email: email.trim() || `${username.trim().toLowerCase()}@plataforma.mx`,
        password: password.trim(),
        phone: phone.trim() || undefined,
        leaderId: coordId,
        level: targetChildLevel,
        territoryName: territoryLabel,
        assignedSections: selectedSections,
        avatarBg: 'bg-[#9d2449]',
        accountRoleLabel: childRoleLabel,
      };

      await onSaveCoordinator(newLeader, newAccount);
    } catch (err) {
      console.error(err);
      alert(`Hubo un error al guardar el registro de ${childRoleLabel}.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const showSectionPicker = targetChildLevel === 'territorial' || targetChildLevel === 'promotor' || selectedSections.length > 0;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-y-auto font-sans">
      {/* 1. Header con Botón de Regreso */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-8 py-5 shrink-0">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Volver a lista de usuarios"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${levelCfg.bgLight} ${levelCfg.color}`}>
                  {childRoleLabel}
                </span>
                <span className="text-xs text-slate-400">
                  Subordinado de {currentUser.name}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                Nuevo {childRoleLabel}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Crea el perfil de mando y credenciales de acceso para este nivel en la estructura electoral.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Formulario de Alta */}
      <div className="max-w-4xl mx-auto w-full px-4 sm:px-8 py-8 flex-1">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Card: Datos Personales */}
          <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-xs space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <User className="w-5 h-5 text-[#9d2449]" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                1. Información Personal y Contacto
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nombre Completo <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder={`Ej. Lic. Fernando Gómez`}
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9d2449] transition-all font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Teléfono / WhatsApp
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    placeholder="9931234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9d2449] transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9d2449] transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card: Cuenta de Acceso */}
          <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-xs space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <Key className="w-5 h-5 text-[#9d2449]" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                2. Credenciales de Inicio de Sesión
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Usuario del Sistema <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="text-slate-400 font-mono text-xs absolute left-3.5 top-2.5">@</span>
                  <input
                    type="text"
                    required
                    placeholder="usuario.sistema"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase())}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9d2449] transition-all font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Contraseña Asignada <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="admin123"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9d2449] transition-all font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card: Asignación Territorial */}
          <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <MapPin className="w-5 h-5 text-[#9d2449]" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  3. Asignación Territorial y Demarcación
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nombre de Territorio o Zona
                </label>
                <input
                  type="text"
                  placeholder={
                    targetChildLevel === 'distrital' ? 'Ej. Distrito 04 (Centro)' :
                    targetChildLevel === 'zona' ? 'Ej. Zona 1 Norte' :
                    targetChildLevel === 'responsable_zona' ? 'Ej. Sector Tamulté' :
                    'Ej. Sección 0285'
                  }
                  value={territoryName}
                  onChange={(e) => setTerritoryName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9d2449] transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Meta Objetivo de Promovidos
                </label>
                <input
                  type="number"
                  placeholder="1500"
                  value={metaGoal}
                  onChange={(e) => setMetaGoal(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9d2449] transition-all font-mono font-bold"
                />
              </div>
            </div>

            {/* Selector de Secciones Electorales */}
            {showSectionPicker && (
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    Secciones Electorales Asignadas ({selectedSections.length} seleccionadas)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={selectAllFiltered}
                      className="text-[11px] font-bold text-[#9d2449] hover:underline cursor-pointer"
                    >
                      Seleccionar todas
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={clearSelected}
                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
                    >
                      Limpiar
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Filtrar por número de sección..."
                    value={sectionSearch}
                    onChange={(e) => setSectionSearch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#9d2449]"
                  />
                </div>

                <div className="max-h-44 overflow-y-auto p-2 bg-slate-50/70 border border-slate-200 rounded-xl grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1.5">
                  {filteredSectionNumbers.map((secNum) => {
                    const isSelected = selectedSections.includes(secNum);
                    return (
                      <button
                        key={secNum}
                        type="button"
                        onClick={() => toggleSection(secNum)}
                        className={`px-2 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                          isSelected
                            ? 'bg-[#9d2449] text-white shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="w-3 h-3" />}
                        <span>{secNum}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onBack}
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-[#9d2449] hover:bg-[#851e3e] text-white rounded-xl text-xs font-bold shadow-md shadow-[#9d2449]/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-98"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Guardando...' : `Guardar ${childRoleLabel}`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
