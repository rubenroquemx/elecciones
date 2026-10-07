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
  Lock, 
  Search, 
  MapPin,
  CheckCircle2,
  KeyRound,
  ShieldAlert,
  Save
} from 'lucide-react';

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
  // 1. Determinar nivel subordinado permitido (o nivel del líder existente si se edita)
  const targetChildLevel: TerritorialLevel = useMemo(() => {
    if (isEditing && initialLeader?.level) {
      return initialLeader.level;
    }
    return getAllowedChildLevel(currentUser.level) || 'distrital';
  }, [currentUser.level, isEditing, initialLeader]);

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

  const generateSecurePassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let res = '';
    for (let i = 0; i < 10; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };

  const [name, setName] = useState(initialLeader?.name || '');
  const [phone, setPhone] = useState(initialLeader?.phone || '');
  const [email, setEmail] = useState(initialLeader?.email || initialAccount?.email || '');
  const [username, setUsername] = useState(initialAccount?.username || initialLeader?.username || '');
  const [password, setPassword] = useState('');
  const [territoryName, setTerritoryName] = useState(initialLeader?.territoryName || '');
  const [selectedSections, setSelectedSections] = useState<string[]>(
    initialLeader?.assignedSections || initialAccount?.assignedSections || []
  );
  const [sectionSearch, setSectionSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);

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
      case 'distrital': prefix = 'dist'; break;
      case 'zona': prefix = 'zona'; break;
      case 'responsable_zona': prefix = 'rzona'; break;
      case 'territorial': prefix = 'secc'; break;
      case 'promotor': prefix = 'prom'; break;
    }

    if (parts.length >= 2) {
      return `${prefix}_${parts[0]}.${parts[1]}`;
    } else if (parts[0]) {
      return `${prefix}_${parts[0]}`;
    }
    return '';
  }

  // Autogenerar nombre de usuario al escribir nombre (solo en modo creación)
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

    // Validar nombre de usuario único
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
      const coordId = initialLeader?.id || `ldr-${targetChildLevel}-${Date.now()}`;
      const userId = initialAccount?.id || `usr-${targetChildLevel}-${Date.now()}`;
      
      let territoryLabel = territoryName.trim();
      if (!territoryLabel) {
        if (selectedSections.length > 0) {
          territoryLabel = `Secciones: ${selectedSections.slice(0, 3).join(', ')}${selectedSections.length > 3 ? '...' : ''}`;
        } else {
          territoryLabel = currentUser.territoryName || 'Demarcación Oficial';
        }
      }

      const updatedLeader: TerritorialLeader = {
        ...(initialLeader || {}),
        id: coordId,
        name: name.trim(),
        role: childRoleLabel,
        level: targetChildLevel,
        levelIndex: initialLeader?.levelIndex || 1,
        territoryName: territoryLabel,
        parentId: initialLeader ? initialLeader.parentId : (currentUser.isSuperAdmin ? null : (currentUser.leaderId || null)),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        username: cleanUser,
        hasAccount: true,
        metaGoal: initialLeader?.metaGoal || 0,
        currentCount: initialLeader?.currentCount || 0,
        status: initialLeader?.status || 'en_progreso',
        validationStatus: initialLeader?.validationStatus || 'validado',
        assignedSections: selectedSections,
        avatarBg: initialLeader?.avatarBg || 'bg-[#9d2449]',
        notes: initialLeader?.notes || `${childRoleLabel} subordinado directo de ${currentUser.name}.`,
        directTeamCount: initialLeader?.directTeamCount || 0,
      };

      const updatedAccount: UserAccount = {
        ...(initialAccount || {}),
        id: userId,
        username: cleanUser,
        name: name.trim(),
        email: email.trim() || `${cleanUser}@plataforma.mx`,
        phone: phone.trim() || undefined,
        leaderId: coordId,
        level: targetChildLevel,
        territoryName: territoryLabel,
        assignedSections: selectedSections,
        avatarBg: initialAccount?.avatarBg || 'bg-[#9d2449]',
        accountRoleLabel: childRoleLabel,
      };

      if (password.trim()) {
        updatedAccount.password = password.trim();
      }

      await onSaveCoordinator(updatedLeader, updatedAccount);
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
      {/* 1. Header con Botón de Regreso y Migas de Pan */}
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
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                  Usuarios › {isEditing ? `Editar ${childRoleLabel}` : `Nuevo ${childRoleLabel}`}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${levelCfg.bgLight} ${levelCfg.color}`}>
                  {childRoleLabel}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {isEditing ? `Editar datos de ${initialLeader?.name || childRoleLabel}` : `Alta de ${childRoleLabel} Oficial`}
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
          
          {/* Card: Información General del Titular */}
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
            </div>
          </div>

          {/* Card: Cuenta y Credenciales */}
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
                    placeholder="usuario.oficial"
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

            <div className="grid grid-cols-1 gap-4">
              {/* Nombre de la Demarcación / Territorio */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nombre de la Demarcación / Territorio Asignado
                </label>
                <input
                  type="text"
                  placeholder={`ej. Zona Norte Centro / ${childRoleLabel}`}
                  value={territoryName}
                  onChange={(e) => setTerritoryName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9d2449] transition-all"
                />
              </div>

              {/* Selector de Secciones Electorales (si aplica) */}
              {showSectionPicker && (
                <div className="space-y-3 pt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Secciones Electorales Asignadas ({selectedSections.length} seleccionadas)
                    </label>
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={selectAllFiltered}
                        className="text-[#9d2449] hover:underline font-bold cursor-pointer"
                      >
                        Seleccionar filtradas
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={clearSelected}
                        className="text-slate-500 hover:underline cursor-pointer"
                      >
                        Limpiar
                      </button>
                    </div>
                  </div>

                  {/* Buscador de secciones */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Filtrar por número de sección (ej. 0285)..."
                      value={sectionSearch}
                      onChange={(e) => setSectionSearch(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9d2449]"
                    />
                  </div>

                  {/* Grilla de secciones */}
                  <div className="max-h-48 overflow-y-auto p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1.5">
                    {filteredSectionNumbers.map(secNum => {
                      const isSelected = selectedSections.includes(secNum);
                      return (
                        <button
                          key={secNum}
                          type="button"
                          onClick={() => toggleSection(secNum)}
                          className={`px-2 py-1.5 text-xs font-mono font-bold rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                            isSelected
                              ? 'bg-[#9d2449] text-white border-[#9d2449] shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                          <span>{secNum}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
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
              <span>{isSubmitting ? 'Guardando...' : (isEditing ? 'Guardar Cambios' : `Dar de Alta ${childRoleLabel}`)}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Re-export for compatibility
export const CreateTerritorialCoordinatorPage = SubordinateCreatePage;
