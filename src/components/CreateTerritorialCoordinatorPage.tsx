import React, { useState, useMemo } from 'react';
import type { TerritorialLeader } from '../types/territory';
import type { UserAccount } from '../types/auth';
import type { ElectoralSection } from '../types/sections';
import { 
  ArrowLeft, 
  User, 
  Phone, 
  Mail, 
  Key, 
  Lock, 
  Layers, 
  CheckCircle2, 
  Search, 
  Target 
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
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [metaGoal, setMetaGoal] = useState('1500');
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

  // Autogenerar nombre de usuario a partir del nombre
  const handleNameChange = (val: string) => {
    setName(val);
    if (!username || username === generateSuggestedUsername(name)) {
      setUsername(generateSuggestedUsername(val));
    }
  };

  function generateSuggestedUsername(fullName: string): string {
    const clean = fullName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .trim();
    const parts = clean.split(/\s+/);
    if (parts.length >= 2) {
      return `coord_${parts[0]}.${parts[1]}`;
    } else if (parts[0]) {
      return `coord_${parts[0]}`;
    }
    return '';
  }

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
      alert('Ingresa el nombre del Coordinador Territorial.');
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
      const coordId = `ldr-terr-${Date.now()}`;
      const userId = `usr-terr-${Date.now()}`;
      const territoryLabel = selectedSections.length > 0 
        ? `Secciones: ${selectedSections.slice(0, 3).join(', ')}${selectedSections.length > 3 ? '...' : ''}` 
        : (currentUser.territoryName || 'Territorio Campaña');

      const newLeader: TerritorialLeader = {
        id: coordId,
        name: name.trim(),
        role: 'Coordinador Territorial',
        level: 'territorial',
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
        notes: `Coordinador Territorial asignado a ${selectedSections.length} sección(es).`,
        directTeamCount: 0,
      };

      const newAccount: UserAccount = {
        id: userId,
        username: username.trim().toLowerCase(),
        name: name.trim(),
        email: email.trim() || `${username.trim().toLowerCase()}@coordinacion.mx`,
        password: password.trim(),
        phone: phone.trim() || undefined,
        leaderId: coordId,
        level: 'territorial',
        territoryName: territoryLabel,
        assignedSections: selectedSections,
        avatarBg: 'bg-[#9d2449]',
        accountRoleLabel: 'Coordinador Territorial',
      };

      await onSaveCoordinator(newLeader, newAccount);
    } catch (err) {
      console.error(err);
      alert('Hubo un error al guardar el Coordinador Territorial.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                Nuevo Coordinador Territorial
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Crea el perfil de acceso y asigna las secciones electorales de supervisión territorial.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Formulario */}
      <div className="max-w-4xl mx-auto w-full px-4 sm:px-8 py-6 flex-1">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Card: Datos Personales y Contacto */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <User className="w-4 h-4 text-[#9d2449]" />
              <h2 className="text-sm font-bold text-slate-900">1. Datos Personales y de Contacto</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Roberto Sánchez Méndez"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#9d2449]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Teléfono Móvil (WhatsApp)
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    placeholder="Ej. 9931234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#9d2449]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    placeholder="Ej. roberto.sanchez@ejemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#9d2449]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Meta Objetivo de Promovidos
                </label>
                <div className="relative">
                  <Target className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="number"
                    min="1"
                    placeholder="Ej. 1500"
                    value={metaGoal}
                    onChange={(e) => setMetaGoal(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#9d2449]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card: Credenciales de Acceso */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Key className="w-4 h-4 text-[#9d2449]" />
              <h2 className="text-sm font-bold text-slate-900">2. Credenciales de Inicio de Sesión</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre de Usuario *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. coord_roberto"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#9d2449]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Contraseña *
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="Contraseña de acceso"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#9d2449]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card: Asignación de Secciones */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#9d2449]" />
                <h2 className="text-sm font-bold text-slate-900">
                  3. Asignación de Secciones Electorales ({selectedSections.length} seleccionadas)
                </h2>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={selectAllFiltered}
                  className="text-[#9d2449] hover:underline font-bold cursor-pointer"
                >
                  Seleccionar visibles
                </button>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={clearSelected}
                  className="text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                >
                  Limpiar todas
                </button>
              </div>
            </div>

            {/* Búsqueda de sección */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Filtrar número de sección (ej. 0168)..."
                value={sectionSearch}
                onChange={(e) => setSectionSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#9d2449]"
              />
            </div>

            {/* Chips de Secciones */}
            <div className="max-h-60 overflow-y-auto p-2 bg-slate-50 border border-slate-200/70 rounded-xl flex flex-wrap gap-1.5">
              {filteredSectionNumbers.length === 0 ? (
                <p className="text-xs text-slate-400 p-3 italic">
                  No se encontraron secciones con el criterio de búsqueda.
                </p>
              ) : (
                filteredSectionNumbers.map(secNum => {
                  const isSelected = selectedSections.includes(secNum);
                  return (
                    <button
                      key={secNum}
                      type="button"
                      onClick={() => toggleSection(secNum)}
                      className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#9d2449] text-white shadow-xs scale-102'
                          : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                      }`}
                    >
                      {secNum}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onBack}
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-[#9d2449] hover:bg-[#851e3e] text-white font-bold rounded-xl text-xs shadow-md shadow-[#9d2449]/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Guardando...' : 'Guardar Coordinador Territorial'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Pie de página pequeño */}
      <footer className="mt-auto py-3 px-6 border-t border-slate-200/60 bg-white text-center">
        <a
          href="https://www.instagram.com/rubenroqueguzman/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors"
        >
          Creado por: Rubén Roque Guzmán
        </a>
      </footer>
    </div>
  );
};
