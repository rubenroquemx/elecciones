import React, { useState, useMemo } from 'react';
import type { UserAccount } from '../types/auth';
import type { TerritorialLeader, TerritorialLevel } from '../types/territory';
import type { ElectoralSection } from '../types/sections';
import { 
  X, 
  UserPlus, 
  KeyRound, 
  Copy, 
  Check, 
  Send, 
  MapPin, 
  AlertCircle,
  Phone,
  Mail,
  User
} from 'lucide-react';

interface CreateManualUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount;
  availableSections: ElectoralSection[];
  onUserCreated: (newUser: UserAccount, newLeader: TerritorialLeader) => void;
}

export const CreateManualUserModal: React.FC<CreateManualUserModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  availableSections,
  onUserCreated,
}) => {
  // Determine allowed roles to create according to the 4 levels:
  // Superadmin -> Campaña, Territorial, Promotor
  // Campaña -> Territorial
  // Territorial -> Promotor
  // Promotor -> None
  const allowedLevels: { level: TerritorialLevel; label: string; desc: string }[] = useMemo(() => {
    if (currentUser.level === 'admin' || currentUser.isSuperAdmin) {
      return [
        { level: 'campana', label: 'Jefe de Campaña', desc: 'Gestiona la campaña completa, organigrama y distritos electorales.' },
      ];
    }
    if (currentUser.level === 'campana' || currentUser.level === 'estatal') {
      return [
        { level: 'distrital', label: 'Coordinador Distrital', desc: 'Supervisa las zonas electorales de su distrito.' },
      ];
    }
    if (currentUser.level === 'distrital') {
      return [
        { level: 'zona', label: 'Coordinador de Zona', desc: 'Supervisa los sectores y Responsables de Zona.' },
      ];
    }
    if (currentUser.level === 'zona') {
      return [
        { level: 'responsable_zona', label: 'Responsable de Zona', desc: 'Coordina directamente a los Responsables de Sección.' },
      ];
    }
    if (currentUser.level === 'responsable_zona') {
      return [
        { level: 'territorial', label: 'Responsable de Sección', desc: 'Supervisa promotores y casillas de su sección asignada.' },
      ];
    }
    if (currentUser.level === 'territorial' || currentUser.level === 'seccional') {
      return [
        { level: 'promotor', label: 'Promotor Territorial', desc: 'Captura promovidos en campo y escanea credenciales INE.' },
      ];
    }
    return [];
  }, [currentUser]);

  const [selectedLevel, setSelectedLevel] = useState<TerritorialLevel>(
    allowedLevels[0]?.level || 'promotor'
  );

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [assignedSections, setAssignedSections] = useState<string[]>([]);
  const [sectionSearch, setSectionSearch] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Success result card state
  const [createdSummary, setCreatedSummary] = useState<{
    account: UserAccount;
    passwordPlain: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Auto-generate username and default password from name
  const handleNameChange = (val: string) => {
    setName(val);
    setErrorMsg(null);
    if (!username || username === cleanUsername(name)) {
      const generated = cleanUsername(val);
      setUsername(generated);
      if (!password) {
        setPassword(`${generated}2026`);
      }
    }
  };

  const cleanUsername = (str: string) => {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '.')
      .replace(/\.+/g, '.')
      .replace(/^\.|\.$/g, '');
  };

  const toggleSection = (secNum: string) => {
    setAssignedSections((prev) =>
      prev.includes(secNum) ? prev.filter((s) => s !== secNum) : [...prev, secNum]
    );
  };

  const filteredSections = useMemo(() => {
    if (!sectionSearch.trim()) return availableSections.slice(0, 15);
    const q = sectionSearch.trim().toLowerCase();
    return availableSections
      .filter((s) => s.sectionNumber.includes(q) || s.municipio?.toLowerCase().includes(q))
      .slice(0, 20);
  }, [availableSections, sectionSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('El nombre completo es obligatorio.');
      return;
    }
    if (!username.trim()) {
      setErrorMsg('El nombre de usuario es obligatorio.');
      return;
    }
    if (!password.trim()) {
      setErrorMsg('La contraseña inicial es obligatoria.');
      return;
    }
    if (assignedSections.length === 0) {
      setErrorMsg('Debes asignar al menos una sección electoral a esta cuenta.');
      return;
    }

    const cleanUser = cleanUsername(username);
    const roleInfo = allowedLevels.find((l) => l.level === selectedLevel) || allowedLevels[0];

    const territoryLabel = `Sección ${assignedSections.slice(0, 3).join(', ')}${
      assignedSections.length > 3 ? ` (+${assignedSections.length - 3})` : ''
    }`;

    const timestamp = Date.now();
    const newUserId = `usr-manual-${timestamp}`;
    const newLeaderId = `leader-manual-${timestamp}`;

    const newUserAccount: UserAccount = {
      id: newUserId,
      username: cleanUser,
      name: name.trim(),
      email: email.trim() || `${cleanUser}@estrategia-territorial.mx`,
      password: password.trim(),
      phone: phone.trim(),
      leaderId: newLeaderId,
      level: selectedLevel,
      territoryName: territoryLabel,
      assignedSections: assignedSections,
      accountRoleLabel: roleInfo?.label || 'Promotor Territorial',
      avatarBg:
        selectedLevel === 'campana'
          ? 'bg-indigo-600'
          : selectedLevel === 'territorial'
          ? 'bg-sky-600'
          : 'bg-emerald-600',
      assignedBy: currentUser.name,
      createdAt: new Date().toISOString(),
    };

    const newLeaderNode: TerritorialLeader = {
      id: newLeaderId,
      name: name.trim(),
      role: roleInfo?.label || 'Promotor Territorial',
      level: selectedLevel,
      levelIndex: selectedLevel === 'campana' ? 1 : selectedLevel === 'territorial' ? 2 : 3,
      parentId: currentUser.leaderId || null,
      territoryName: territoryLabel,
      committeeAlias: name.trim(),
      assignedSections: assignedSections,
      phone: phone.trim(),
      email: email.trim() || `${cleanUser}@estrategia-territorial.mx`,
      hasAccount: true,
      username: cleanUser,
      address: 'Registrado en sistema cerrado',
      colonia: 'Demarcación Asignada',
      electoralSection: assignedSections[0] || '0416',
      curp: '',
      electorKey: '',
      metaGoal: 50,
      currentCount: 0,
      status: 'en_progreso',
      validationStatus: 'validado',
    };

    onUserCreated(newUserAccount, newLeaderNode);
    setCreatedSummary({
      account: newUserAccount,
      passwordPlain: password.trim(),
    });
  };

  const handleCopyCredentials = () => {
    if (!createdSummary) return;
    const text = `*ACCESO A SISTEMA CERRADO DE ESTRUCTURA TERRITORIAL*
👤 *Usuario:* ${createdSummary.account.username}
🔑 *Contraseña:* ${createdSummary.passwordPlain}
🏷️ *Rol Asignado:* ${createdSummary.account.accountRoleLabel}
📍 *Demarcación:* ${createdSummary.account.territoryName}
Asignado por: ${currentUser.name}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendWhatsApp = () => {
    if (!createdSummary) return;
    const text = encodeURIComponent(`*ACCESO A SISTEMA CERRADO DE ESTRUCTURA TERRITORIAL*
👤 *Usuario:* ${createdSummary.account.username}
🔑 *Contraseña:* ${createdSummary.passwordPlain}
🏷️ *Rol Asignado:* ${createdSummary.account.accountRoleLabel}
📍 *Demarcación:* ${createdSummary.account.territoryName}
Asignado por: ${currentUser.name}`);

    const phoneNum = createdSummary.account.phone?.replace(/[^0-9]/g, '');
    const url = phoneNum
      ? `https://wa.me/52${phoneNum}?text=${text}`
      : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  const handleResetAndClose = () => {
    setCreatedSummary(null);
    setName('');
    setUsername('');
    setPassword('');
    setPhone('');
    setEmail('');
    setAssignedSections([]);
    setErrorMsg(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-emil-fade select-none">
      <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-emil-sheet">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-400/40 text-indigo-300 flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                Alta Manual de Usuario
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-mono font-bold">
                  Sistema Cerrado
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Autorizado por: {currentUser.name} ({currentUser.accountRoleLabel})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetAndClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 text-xs text-slate-700 space-y-4">
          {createdSummary ? (
            /* Success Summary View */
            <div className="space-y-4 animate-emil-popover">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-emerald-950 text-sm">
                    ¡Cuenta creada manualmente con éxito!
                  </h3>
                  <p className="text-emerald-800 text-xs">
                    El usuario ya puede ingresar al sistema cerrado con las credenciales que se muestran a continuación.
                  </p>
                </div>
              </div>

              {/* Credentials Card */}
              <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 space-y-3 font-mono">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <span className="text-slate-400 text-[11px]">FICHA DE CREDENCIALES</span>
                  <span className="text-emerald-400 text-[10px] font-bold">ALTA CONFIRMADA</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px]">USUARIO</span>
                    <span className="text-white font-bold text-sm">@{createdSummary.account.username}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">CONTRASEÑA</span>
                    <span className="text-amber-400 font-bold text-sm">{createdSummary.passwordPlain}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">ROL</span>
                    <span className="text-sky-300 font-sans font-semibold">{createdSummary.account.accountRoleLabel}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">SECCIONES</span>
                    <span className="text-slate-200 font-sans">{createdSummary.account.territoryName}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCopyCredentials}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? '¡Copiado al Portapapeles!' : 'Copiar Credenciales'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Enviar por WhatsApp</span>
                </button>
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-bold hover:underline"
                >
                  Finalizar y cerrar ventana
                </button>
              </div>
            </div>
          ) : (
            /* Creation Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Rol / Nivel Permitido */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nivel de la Cuenta en la Jerarquía
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {allowedLevels.map((lvl) => (
                    <button
                      key={lvl.level}
                      type="button"
                      onClick={() => setSelectedLevel(lvl.level)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        selectedLevel === lvl.level
                          ? 'bg-indigo-50 border-indigo-400 text-indigo-950 ring-1 ring-indigo-400 shadow-2xs'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                      }`}
                    >
                      <div className="font-bold text-xs flex items-center justify-between">
                        <span>{lvl.label}</span>
                        {selectedLevel === lvl.level && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{lvl.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Nombre y Usuario */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nombre Completo *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="ej. Lic. Roberto Gómez"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 font-medium"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Usuario de Acceso *
                  </label>
                  <div className="relative">
                    <span className="text-slate-400 absolute left-3 top-2 font-mono text-xs">@</span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(cleanUsername(e.target.value))}
                      placeholder="roberto.gomez"
                      className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-indigo-500 font-medium"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Contraseña y Teléfono */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Contraseña Manual Inicial *
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="clave123"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Teléfono (WhatsApp)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="9931234567"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Correo Opcional */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Correo Electrónico (Opcional)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@dominio.mx"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Asignación de Sección(es) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Demarcación / Sección(es) Asignada(s) *
                  </label>
                  <span className="text-[10px] text-indigo-600 font-bold">
                    {assignedSections.length} seleccionada(s)
                  </span>
                </div>

                <input
                  type="text"
                  value={sectionSearch}
                  onChange={(e) => setSectionSearch(e.target.value)}
                  placeholder="Buscar sección o municipio..."
                  className="w-full px-3 py-1.5 mb-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500"
                />

                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 border border-slate-200 rounded-xl bg-slate-50/50">
                  {filteredSections.map((sec) => {
                    const isSelected = assignedSections.includes(sec.sectionNumber);
                    return (
                      <button
                        key={sec.id}
                        type="button"
                        onClick={() => toggleSection(sec.sectionNumber)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1 ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                        }`}
                      >
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span>Sec. {sec.sectionNumber}</span>
                        {isSelected && <Check className="w-3 h-3 ml-0.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl font-semibold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white rounded-xl font-bold shadow-md shadow-indigo-950/20 transition-all flex items-center gap-1.5 cursor-pointer active:scale-98"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Crear Cuenta Manualmente</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
