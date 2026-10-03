import React, { useState, useEffect, useMemo } from 'react';
import type { TerritorialLeader } from '../types/territory';
import type { UserAccount } from '../types/auth';
import type { ElectoralSection } from '../types/sections';
import type { MainNavSection } from './Sidebar';
import { 
  ArrowLeft, 
  Save, 
  Trash2, 
  Check, 
  KeyRound, 
  MapPin, 
  Phone, 
  Mail, 
  User, 
  Target, 
  AlertCircle, 
  CheckCircle2,
  Users
} from 'lucide-react';

interface TerritorialPromoterEditPageProps {
  selectedPromoterId: string | null;
  promoters: TerritorialLeader[];
  accounts: UserAccount[];
  availableSections: ElectoralSection[];
  onSave: (updatedLeader: TerritorialLeader, updatedAccount?: UserAccount) => void;
  onCancel: () => void;
  onSelectPromoterToEdit: (promoterId: string) => void;
  onDeletePromoter: (promoterId: string) => void;
  onNavigate: (nav: MainNavSection) => void;
}

export const TerritorialPromoterEditPage: React.FC<TerritorialPromoterEditPageProps> = ({
  selectedPromoterId,
  promoters,
  accounts,
  availableSections,
  onSave,
  onCancel,
  onSelectPromoterToEdit,
  onDeletePromoter,
  onNavigate,
}) => {
  // Promotor activo seleccionado (si no viene ID, tomamos el primero disponible)
  const activePromoter = useMemo(() => {
    if (selectedPromoterId) {
      const found = promoters.find((p) => p.id === selectedPromoterId);
      if (found) return found;
    }
    return promoters[0] || null;
  }, [selectedPromoterId, promoters]);

  // Cuenta asociada
  const activeAccount = useMemo(() => {
    if (!activePromoter) return null;
    return (
      accounts.find(
        (a) =>
          a.leaderId === activePromoter.id ||
          a.username === activePromoter.username ||
          a.email === activePromoter.email
      ) || null
    );
  }, [activePromoter, accounts]);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [colonia, setColonia] = useState('');
  const [electorKey, setElectorKey] = useState('');
  const [curp, setCurp] = useState('');
  const [assignedSections, setAssignedSections] = useState<string[]>([]);
  const [metaGoal, setMetaGoal] = useState<number>(100);
  const [status, setStatus] = useState<'en_progreso' | 'completado' | 'critico' | 'vacante'>('en_progreso');
  const [validationStatus, setValidationStatus] = useState<'validado' | 'pendiente' | 'rechazado'>('validado');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [notes, setNotes] = useState('');
  const [savedNotice, setSavedNotice] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Cargar datos del promotor activo
  useEffect(() => {
    if (!activePromoter) return;

    setName(activePromoter.name || '');
    setPhone(activePromoter.phone || '');
    setEmail(activePromoter.email || '');
    setAddress(activePromoter.address || '');
    setColonia(activePromoter.colonia || '');
    setElectorKey(activePromoter.electorKey || '');
    setCurp(activePromoter.curp || '');
    setAssignedSections(
      activePromoter.assignedSections && activePromoter.assignedSections.length > 0
        ? activePromoter.assignedSections
        : [activePromoter.electoralSection || '0416']
    );
    setMetaGoal(activePromoter.metaGoal || 100);
    setStatus(activePromoter.status || 'en_progreso');
    setValidationStatus(activePromoter.validationStatus || 'validado');
    setNotes(activePromoter.notes || '');

    if (activeAccount) {
      setUsername(activeAccount.username || '');
      setPassword(activeAccount.password || '');
    } else {
      setUsername(activePromoter.username || '');
      setPassword('');
    }

    setSavedNotice(false);
    setErrorMsg(null);
  }, [activePromoter, activeAccount]);

  const toggleSection = (secNum: string) => {
    setAssignedSections((prev) =>
      prev.includes(secNum) ? prev.filter((s) => s !== secNum) : [...prev, secNum]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePromoter) return;
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('El nombre completo es obligatorio.');
      return;
    }
    if (assignedSections.length === 0) {
      setErrorMsg('Debes asignar al menos una sección electoral.');
      return;
    }

    const territoryLabel = `Sección ${assignedSections.join(', ')}`;

    const updatedLeader: TerritorialLeader = {
      ...activePromoter,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      colonia: colonia.trim(),
      electorKey: electorKey.trim().toUpperCase(),
      curp: curp.trim().toUpperCase(),
      assignedSections,
      electoralSection: assignedSections[0] || '0416',
      territoryName: territoryLabel,
      metaGoal: Number(metaGoal) || 100,
      status,
      validationStatus,
      notes: notes.trim(),
      username: username.trim() || activePromoter.username,
    };

    let updatedAcc: UserAccount | undefined = undefined;
    if (activeAccount) {
      updatedAcc = {
        ...activeAccount,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || activeAccount.email,
        username: username.trim() || activeAccount.username,
        password: password.trim() || activeAccount.password,
        territoryName: territoryLabel,
        assignedSections,
      };
    }

    onSave(updatedLeader, updatedAcc);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  if (!activePromoter) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 text-slate-600 space-y-4">
        <Users className="w-12 h-12 text-slate-400" />
        <h2 className="text-base font-bold text-slate-800">No hay promotores territoriales para editar</h2>
        <p className="text-xs text-slate-500">Primero debes crear o registrar al menos un promotor en tu zona.</p>
        <button
          type="button"
          onClick={() => onNavigate('crear-promotor')}
          className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-emerald-500 cursor-pointer"
        >
          Crear Nuevo Promotor
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto bg-slate-50 text-slate-800 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header con Navegación y Selector de Promotor */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="w-9 h-9 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
            title="Volver a la administración"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="hover:text-slate-800 cursor-pointer" onClick={() => onNavigate('promotores')}>
                Promotores Territoriales
              </span>
              <span>/</span>
              <span className="font-semibold text-slate-900">Editar Promotor</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-0.5 flex items-center gap-2">
              <span>Editar: {activePromoter.name}</span>
              <span className="text-xs bg-sky-100 text-sky-800 font-mono font-bold px-2 py-0.5 rounded-full border border-sky-200">
                Sección {activePromoter.assignedSections?.join(', ') || activePromoter.electoralSection}
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('promotores')}
            className="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 font-semibold bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Volver a la Lista
          </button>
        </div>
      </div>

      {/* Selector de Promotores de la Zona (Pills para alternar rápidamente entre ellos) */}
      {promoters.length > 1 && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-2xs space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Seleccionar Promotor a Editar:
          </span>
          <div className="flex flex-wrap gap-2">
            {promoters.map((p) => {
              const isSelected = p.id === activePromoter.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onSelectPromoterToEdit(p.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-xs font-bold'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center text-white text-[10px] font-bold ${
                      p.avatarBg || 'bg-emerald-600'
                    }`}
                  >
                    {p.name.charAt(0)}
                  </div>
                  <span>{p.name}</span>
                  <span className="text-[10px] font-mono opacity-80">
                    (Sec. {p.assignedSections?.[0] || p.electoralSection})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Aviso de Guardado */}
      {savedNotice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-emerald-800 text-xs font-bold animate-emil-popover">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>¡Cambios guardados exitosamente en la estructura y cuenta del promotor!</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-rose-700 text-xs font-semibold animate-emil-shake">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Formulario de Edición */}
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
        {/* TARJETA 1: DATOS PERSONALES */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">1. Datos del Promotor</h3>
              <p className="text-[11px] text-slate-500">Información de identificación oficial y contacto directo.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Nombre Completo *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-sky-500"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Teléfono Móvil (WhatsApp)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Clave de Elector
              </label>
              <input
                type="text"
                maxLength={18}
                value={electorKey}
                onChange={(e) => setElectorKey(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-mono uppercase focus:bg-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Dirección / Domicilio
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Colonia
              </label>
              <input
                type="text"
                value={colonia}
                onChange={(e) => setColonia(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>
        </div>

        {/* TARJETA 2: ASIGNACIÓN Y METAS */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">2. Demarcación y Metas</h3>
              <p className="text-[11px] text-slate-500">Sección asignada y cuota de captura de ciudadanos promovidos.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Secciones Asignadas *
                </label>
                <span className="text-[10px] text-emerald-700 font-bold">
                  {assignedSections.length} seleccionada(s)
                </span>
              </div>

              <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                {availableSections.map((sec) => {
                  const isSelected = assignedSections.includes(sec.sectionNumber);
                  return (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => toggleSection(sec.sectionNumber)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                      }`}
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Sección {sec.sectionNumber}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Meta de Ciudadanos Promovidos *
                </label>
                <div className="relative">
                  <Target className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="number"
                    min={1}
                    max={2000}
                    value={metaGoal}
                    onChange={(e) => setMetaGoal(Number(e.target.value))}
                    className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:border-sky-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Estatus Operativo
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="en_progreso">En Progreso</option>
                    <option value="completado">Completado</option>
                    <option value="critico">Crítico</option>
                    <option value="vacante">Vacante</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Validación
                  </label>
                  <select
                    value={validationStatus}
                    onChange={(e) => setValidationStatus(e.target.value as any)}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="validado">Validado</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="rechazado">Rechazado</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TARJETA 3: CREDENCIALES DEL SISTEMA CERRADO */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">3. Credenciales de Acceso (Sistema Cerrado)</h3>
              <p className="text-[11px] text-slate-500">
                Puedes cambiar el usuario o restablecer la contraseña para el promotor.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Usuario de Acceso
              </label>
              <div className="relative">
                <span className="text-slate-400 absolute left-3 top-2 font-mono text-xs">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                  className="w-full pl-7 pr-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Restablecer Contraseña
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nueva contraseña o dejar actual..."
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* TARJETA 4: BITÁCORA Y OBSERVACIONES */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            4. Observaciones y Bitácora de Desempeño
          </h3>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* Zona de peligro / Baja */}
        <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-bold text-rose-900">Dar de Baja a este Promotor</h4>
            <p className="text-[11px] text-rose-700">
              Se removerá al promotor y se suspenderá su acceso al sistema cerrado de capturas.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`¿Estás seguro de eliminar a ${activePromoter.name}?`)) {
                onDeletePromoter(activePromoter.id);
                onNavigate('promotores');
              }
            }}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto shrink-0 flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Eliminar Promotor</span>
          </button>
        </div>

        {/* Botones inferiores */}
        <div className="flex items-center justify-end gap-3 pt-2 pb-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 text-xs text-slate-600 hover:text-slate-900 font-bold bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="submit"
            className="px-6 py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-950/20 transition-all flex items-center gap-2 cursor-pointer active:scale-98"
          >
            <Save className="w-4 h-4" />
            <span>Guardar Cambios</span>
          </button>
        </div>
      </form>
    </div>
  );
};
