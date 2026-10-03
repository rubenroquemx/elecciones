import React, { useState } from 'react';
import type { TerritorialLeader } from '../types/territory';
import type { UserAccount } from '../types/auth';
import type { ElectoralSection } from '../types/sections';
import type { MainNavSection } from './Sidebar';
import { 
  UserPlus, 
  ArrowLeft, 
  Check, 
  Copy, 
  Send, 
  KeyRound, 
  MapPin, 
  Phone, 
  Mail, 
  User, 
  AlertCircle,
  ShieldCheck,
  Target
} from 'lucide-react';

interface TerritorialPromoterCreatePageProps {
  currentUser: UserAccount;
  availableSections: ElectoralSection[];
  onSavePromoter: (newLeader: TerritorialLeader, newUserAccount: UserAccount) => void;
  onNavigate: (nav: MainNavSection) => void;
}

export const TerritorialPromoterCreatePage: React.FC<TerritorialPromoterCreatePageProps> = ({
  currentUser,
  availableSections,
  onSavePromoter,
  onNavigate,
}) => {
  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [colonia, setColonia] = useState('');
  const [electorKey, setElectorKey] = useState('');
  const [curp, setCurp] = useState('');
  const [assignedSections, setAssignedSections] = useState<string[]>(() => {
    return availableSections.length > 0 ? [availableSections[0].sectionNumber] : ['0416'];
  });
  const [metaGoal, setMetaGoal] = useState<number>(100);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Success Summary View
  const [createdSummary, setCreatedSummary] = useState<{
    leader: TerritorialLeader;
    account: UserAccount;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Normalizador de nombre de usuario
  const cleanUsername = (str: string) => {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '.')
      .replace(/\.+/g, '.')
      .replace(/^\.|\.$/g, '');
  };

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

  const toggleSection = (secNum: string) => {
    setAssignedSections((prev) =>
      prev.includes(secNum) ? prev.filter((s) => s !== secNum) : [...prev, secNum]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('El nombre completo del promotor es obligatorio.');
      return;
    }
    if (assignedSections.length === 0) {
      setErrorMsg('Debes asignar al menos una sección electoral.');
      return;
    }
    if (!username.trim()) {
      setErrorMsg('El nombre de usuario es obligatorio.');
      return;
    }
    if (!password.trim()) {
      setErrorMsg('La contraseña de acceso inicial es obligatoria.');
      return;
    }

    const timestamp = Date.now();
    const newLeaderId = `prom-manual-${timestamp}`;
    const newUserId = `usr-prom-${timestamp}`;
    const cleanUser = cleanUsername(username);

    const territoryLabel = `Sección ${assignedSections.join(', ')}`;

    const newLeaderNode: TerritorialLeader = {
      id: newLeaderId,
      name: name.trim(),
      role: 'Promotor Territorial',
      level: 'promotor',
      levelIndex: 2,
      parentId: currentUser.leaderId || 'coord-territorial-mariana',
      territoryName: territoryLabel,
      code: `PROM-${assignedSections[0] || '0416'}-${name.slice(0, 2).toUpperCase()}`,
      assignedSections,
      electoralSection: assignedSections[0] || '0416',
      address: address.trim() || 'Domicilio registrado',
      colonia: colonia.trim() || 'Tamulté de las Barrancas',
      curp: curp.trim().toUpperCase(),
      electorKey: electorKey.trim().toUpperCase(),
      phone: phone.trim(),
      email: email.trim() || `${cleanUser}@estrategia-territorial.mx`,
      username: cleanUser,
      hasAccount: true,
      avatarBg: 'bg-emerald-600',
      metaGoal: Number(metaGoal) || 100,
      currentCount: 0,
      status: 'en_progreso',
      validationStatus: 'validado',
      notes: notes.trim() || `Promotor asignado por ${currentUser.name} a Secciones ${assignedSections.join(', ')}.`,
    };

    const newUserAccount: UserAccount = {
      id: newUserId,
      username: cleanUser,
      name: name.trim(),
      email: email.trim() || `${cleanUser}@estrategia-territorial.mx`,
      password: password.trim(),
      phone: phone.trim(),
      leaderId: newLeaderId,
      level: 'promotor',
      territoryName: territoryLabel,
      assignedSections,
      accountRoleLabel: 'Promotor Territorial',
      avatarBg: 'bg-emerald-600',
      assignedBy: currentUser.name,
      createdAt: new Date().toISOString(),
    };

    onSavePromoter(newLeaderNode, newUserAccount);
    setCreatedSummary({ leader: newLeaderNode, account: newUserAccount });
  };

  const handleCopyCredentials = () => {
    if (!createdSummary) return;
    const text = `*ACCESO A SISTEMA CERRADO DE ESTRUCTURA TERRITORIAL*
👤 *Usuario:* ${createdSummary.account.username}
🔑 *Contraseña:* ${createdSummary.account.password}
🏷️ *Rol:* Promotor Territorial
📍 *Demarcación:* ${createdSummary.account.territoryName}
Asignado por: ${currentUser.name}
Plataforma: https://elecciones.legislab.app`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWhatsApp = () => {
    if (!createdSummary) return;
    const text = encodeURIComponent(`*ACCESO A SISTEMA CERRADO DE ESTRUCTURA TERRITORIAL*
👤 *Usuario:* ${createdSummary.account.username}
🔑 *Contraseña:* ${createdSummary.account.password}
🏷️ *Rol:* Promotor Territorial
📍 *Demarcación:* ${createdSummary.account.territoryName}
Asignado por: ${currentUser.name}
Inicia sesión aquí: https://elecciones.legislab.app`);

    const phoneNum = createdSummary.account.phone?.replace(/[^0-9]/g, '');
    const url = phoneNum
      ? `https://wa.me/52${phoneNum}?text=${text}`
      : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto bg-slate-50 text-slate-800 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Breadcrumb & Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('promotores')}
            className="w-9 h-9 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
            title="Volver a la lista de promotores"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="hover:text-slate-800 cursor-pointer" onClick={() => onNavigate('promotores')}>
                Promotores Territoriales
              </span>
              <span>/</span>
              <span className="font-semibold text-slate-900">Crear Promotor</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
              Alta de Nuevo Promotor Territorial
            </h1>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('promotores')}
          className="px-3.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 font-semibold bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer self-start sm:self-auto"
        >
          Ver Todos los Promotores
        </button>
      </div>

      {/* Condicional: Formulario o Pantalla de Éxito */}
      {createdSummary ? (
        <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 animate-emil-popover">
          <div className="flex items-center gap-4 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Check className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-emerald-950">
                ¡Promotor Territorial Creado Exitosamente!
              </h2>
              <p className="text-xs text-emerald-800">
                La cuenta de acceso al sistema cerrado y su asignación territorial han sido registradas.
              </p>
            </div>
          </div>

          {/* Ficha de Credenciales */}
          <div className="bg-slate-950 text-white p-6 rounded-2xl border border-slate-800 space-y-4 font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs text-slate-400">FICHA OFICIAL DE ACCESO</span>
              <span className="text-emerald-400 text-xs font-bold font-sans flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Sistema Cerrado Activo
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500 text-[10px] block">PROMOTOR</span>
                <span className="text-white font-bold text-sm font-sans">{createdSummary.leader.name}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">USUARIO DE ACCESO</span>
                <span className="text-sky-300 font-bold text-sm">@{createdSummary.account.username}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">CONTRASEÑA</span>
                <span className="text-amber-400 font-bold text-sm">{createdSummary.account.password}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">SECCIÓN(ES)</span>
                <span className="text-slate-200 font-sans">{createdSummary.leader.territoryName}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">META ASIGNADA</span>
                <span className="text-indigo-300 font-bold text-sm">{createdSummary.leader.metaGoal} promovidos</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">COORDINADORA</span>
                <span className="text-slate-300 font-sans">{currentUser.name}</span>
              </div>
            </div>
          </div>

          {/* Botones de acción de la ficha */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={handleCopyCredentials}
              className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? '¡Credenciales Copiadas!' : 'Copiar Credenciales'}</span>
            </button>

            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Enviar por WhatsApp al Promotor</span>
            </button>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs">
            <button
              type="button"
              onClick={() => {
                setCreatedSummary(null);
                setName('');
                setPhone('');
                setEmail('');
                setAddress('');
                setColonia('');
                setElectorKey('');
                setCurp('');
                setUsername('');
                setPassword('');
                setNotes('');
              }}
              className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline"
            >
              + Crear otro promotor
            </button>

            <button
              type="button"
              onClick={() => onNavigate('promotores')}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all cursor-pointer"
            >
              Ir a Administrar Promotores
            </button>
          </div>
        </div>
      ) : (
        /* Formulario Principal de Creación */
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-rose-700 text-xs animate-emil-shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span className="font-semibold">{errorMsg}</span>
            </div>
          )}

          {/* TARJETA 1: DATOS PERSONALES Y CONTACTO */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">1. Datos Personales y de Contacto</h3>
                <p className="text-[11px] text-slate-500">Identificación oficial del promotor territorial de campo.</p>
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
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="ej. Lic. Roberto Gómez Sánchez"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Teléfono Móvil (WhatsApp) *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="993 123 4567"
                    className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Correo Electrónico (Opcional)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="promotor@estrategia-territorial.mx"
                    className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Clave de Elector (INE)
                </label>
                <input
                  type="text"
                  maxLength={18}
                  value={electorKey}
                  onChange={(e) => setElectorKey(e.target.value.toUpperCase())}
                  placeholder="ABCD123456H78900"
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
                  placeholder="Calle, número exterior e interior"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Colonia / Fraccionamiento
                </label>
                <input
                  type="text"
                  value={colonia}
                  onChange={(e) => setColonia(e.target.value)}
                  placeholder="Col. Tamulté de las Barrancas"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </div>

          {/* TARJETA 2: ASIGNACIÓN TERRITORIAL Y META */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">2. Asignación Territorial y Metas de Campo</h3>
                <p className="text-[11px] text-slate-500">Sección electoral a su cargo y meta de promovidos a capturar.</p>
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
                <p className="text-[10px] text-slate-400 mt-1">
                  Meta sugerida: 100 a 150 ciudadanos por sección electoral.
                </p>
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
                  Acceso exclusivo a la app PWA para captura de campo y escaneo offline de credenciales INE.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nombre de Usuario *
                </label>
                <div className="relative">
                  <span className="text-slate-400 absolute left-3 top-2 font-mono text-xs">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(cleanUsername(e.target.value))}
                    placeholder="roberto.gomez"
                    className="w-full pl-7 pr-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-mono font-semibold focus:bg-white focus:outline-none focus:border-sky-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Contraseña de Acceso Inicial *
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="clave123"
                    className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-sky-500"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl text-[11px] text-indigo-900 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <span>
                <strong>0 Tokens de IA:</strong> Esta cuenta tendrá habilitado el escáner de credenciales INE con visión por computadora local en su teléfono móvil sin requerir internet para capturas.
              </span>
            </div>
          </div>

          {/* TARJETA 4: OBSERVACIONES */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              4. Notas u Observaciones de Asignación
            </h3>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Instrucciones especiales, colonias prioritarias asignadas al promotor..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Botones de acción inferiores */}
          <div className="flex items-center justify-end gap-3 pt-2 pb-6">
            <button
              type="button"
              onClick={() => onNavigate('promotores')}
              className="px-5 py-2.5 text-xs text-slate-600 hover:text-slate-900 font-bold bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-950/20 transition-all flex items-center gap-2 cursor-pointer active:scale-98"
            >
              <UserPlus className="w-4 h-4" />
              <span>Guardar y Dar de Alta Promotor</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
