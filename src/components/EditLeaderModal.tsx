import React, { useState, useEffect, useMemo } from 'react';
import type { TerritorialLeader, TerritorialLevel, LeaderNote } from '../types/territory';
import type { UserAccount } from '../types/auth';
import type { ElectoralSection } from '../types/sections';
import { 
  getAllowedChildLevel, 
  getDefaultRoleForLevel, 
  ORDERED_LEVELS 
} from '../utils/hierarchy';
import { 
  findElectorByKey, 
  persistElectorProfile, 
  normalizeSectionNumber,
  type ElectorProfile 
} from '../utils/electorRegistry';
import { 
  X, 
  Save, 
  Send, 
  User, 
  Building2, 
  Clock, 
  Check, 
  Search,
  MessageSquare,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

interface EditLeaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (leader: TerritorialLeader) => void;
  editingLeader: TerritorialLeader | null;
  allLeaders: TerritorialLeader[];
  currentUser: UserAccount;
  availableSections?: ElectoralSection[];
}

export const EditLeaderModal: React.FC<EditLeaderModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingLeader,
  allLeaders,
  currentUser,
  availableSections = [],
}) => {
  const isSuperAdmin = currentUser.level === 'admin';
  const defaultInitialLevel: TerritorialLevel = isSuperAdmin 
    ? 'territorial' 
    : (getAllowedChildLevel(currentUser.level) || 'territorial');

  // Form State
  const [formData, setFormData] = useState<{
    name: string;
    address: string;
    colonia: string;
    electoralSection: string;
    curp: string;
    electorKey: string;
    phone: string;
    email: string;
    committeeAlias: string;
    assignedSections: string[];
    notesHistory: LeaderNote[];
  }>({
    name: '',
    address: '',
    colonia: '',
    electoralSection: '',
    curp: '',
    electorKey: '',
    phone: '',
    email: '',
    committeeAlias: '',
    assignedSections: [],
    notesHistory: [],
  });

  // Section search / filter state inside multi-selector
  const [sectionFilter, setSectionFilter] = useState('');

  // New note input state
  const [newNoteText, setNewNoteText] = useState('');

  // Validation error state
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Existing profile auto-detection notice
  const [existingProfileNotice, setExistingProfileNotice] = useState<string | null>(null);
  const [matchedProfile, setMatchedProfile] = useState<ElectorProfile | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setErrorMsg(null);
      setNewNoteText('');
      setSectionFilter('');
      return;
    }

    if (editingLeader) {
      // Derive assignedSections if not explicitly array
      let initialAssigned: string[] = editingLeader.assignedSections || [];
      if (initialAssigned.length === 0 && editingLeader.territoryName) {
        const matches = editingLeader.territoryName.match(/\d{3,4}/g);
        if (matches) {
          initialAssigned = Array.from(new Set(matches.map(m => m.padStart(4, '0'))));
        }
      }

      // Notes history initialization
      let initialNotes: LeaderNote[] = editingLeader.notesHistory || [];
      if (initialNotes.length === 0 && editingLeader.notes?.trim()) {
        initialNotes = [{
          id: `legacy-${editingLeader.id}`,
          text: editingLeader.notes.trim(),
          authorName: 'Nota Previa',
          createdAt: new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
        }];
      }

      setFormData({
        name: editingLeader.name || '',
        address: editingLeader.address || '',
        colonia: editingLeader.colonia || '',
        electoralSection: editingLeader.electoralSection || '',
        curp: editingLeader.curp || '',
        electorKey: editingLeader.electorKey || '',
        phone: editingLeader.phone || '',
        email: editingLeader.email || '',
        committeeAlias: editingLeader.committeeAlias || editingLeader.territoryName || '',
        assignedSections: initialAssigned,
        notesHistory: initialNotes,
      });
    } else {
      setFormData({
        name: '',
        address: '',
        colonia: '',
        electoralSection: '',
        curp: '',
        electorKey: '',
        phone: '',
        email: '',
        committeeAlias: '',
        assignedSections: [],
        notesHistory: [],
      });
    }
  }, [isOpen, editingLeader]);

  // Filter available sections for the multi-select
  const filteredSections = useMemo(() => {
    const q = sectionFilter.trim().toLowerCase();
    if (!q) return availableSections;
    return availableSections.filter(sec => 
      sec.sectionNumber.toLowerCase().includes(q) ||
      (sec.municipio && sec.municipio.toLowerCase().includes(q))
    );
  }, [availableSections, sectionFilter]);

  if (!isOpen) return null;

  const targetLevel: TerritorialLevel = editingLeader ? editingLeader.level : defaultInitialLevel;
  const targetRole = editingLeader ? editingLeader.role : (getDefaultRoleForLevel(targetLevel) || 'Comité de Organización Territorial');

  const toggleSection = (secNumber: string) => {
    setFormData(prev => {
      const exists = prev.assignedSections.includes(secNumber);
      const updated = exists 
        ? prev.assignedSections.filter(s => s !== secNumber)
        : [...prev.assignedSections, secNumber].sort();
      return { ...prev, assignedSections: updated };
    });
  };

  const handleAddNote = () => {
    if (!newNoteText.trim()) return;
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    const timeStr = now.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const newNote: LeaderNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      text: newNoteText.trim(),
      authorName: currentUser.name || 'Usuario Actual',
      createdAt: `${dateStr}, ${timeStr} hrs`,
    };

    setFormData(prev => ({
      ...prev,
      notesHistory: [newNote, ...prev.notesHistory]
    }));
    setNewNoteText('');
  };

  const handleElectorKeyChange = (rawKey: string) => {
    const cleanKey = rawKey.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 18);
    setFormData(prev => ({ ...prev, electorKey: cleanKey }));
    setErrorMsg(null);

    if (cleanKey.length >= 8) {
      const existing = findElectorByKey(cleanKey, allLeaders, availableSections);
      if (existing && (!editingLeader || editingLeader.electorKey?.toUpperCase() !== cleanKey)) {
        setMatchedProfile(existing);
        setExistingProfileNotice(`Integrante existente detectado: "${existing.name}". Datos generales precargados automáticamente. Puede asignarlo a esta nueva estructura territorial.`);
        setFormData(prev => ({
          ...prev,
          electorKey: cleanKey,
          name: existing.name || prev.name,
          address: existing.address || prev.address,
          colonia: existing.colonia || prev.colonia,
          electoralSection: existing.electoralSection || prev.electoralSection,
          curp: existing.curp || prev.curp,
          phone: existing.phone || prev.phone,
          email: existing.email || prev.email,
        }));
      } else {
        setMatchedProfile(null);
        setExistingProfileNotice(null);
      }
    } else {
      setMatchedProfile(null);
      setExistingProfileNotice(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validate Required General Fields
    if (!formData.name.trim()) {
      setErrorMsg('El Nombre es obligatorio.');
      return;
    }
    if (!formData.address.trim()) {
      setErrorMsg('La Dirección es obligatoria.');
      return;
    }
    if (!formData.colonia.trim()) {
      setErrorMsg('La Colonia es obligatoria.');
      return;
    }
    if (!formData.electoralSection.trim()) {
      setErrorMsg('La Sección Electoral de residencia es obligatoria.');
      return;
    }
    if (!formData.curp.trim()) {
      setErrorMsg('La CURP es obligatoria.');
      return;
    }
    if (!formData.electorKey.trim()) {
      setErrorMsg('La Clave de Elector es obligatoria.');
      return;
    }
    if (!formData.phone.trim()) {
      setErrorMsg('El Teléfono (WhatsApp) es obligatorio.');
      return;
    }
    if (!formData.email.trim()) {
      setErrorMsg('El Correo Electrónico es obligatorio.');
      return;
    }

    // DIRECTRIZ GLOBAL:
    // Un usuario puede estar en una o más estructuras pero por ningún motivo debe estar en más de una sección electoral.
    const cleanKey = formData.electorKey.trim().toUpperCase();
    const existing = matchedProfile || findElectorByKey(cleanKey, allLeaders, availableSections);
    if (existing && existing.electoralSection) {
      const inputSec = normalizeSectionNumber(formData.electoralSection);
      const regSec = normalizeSectionNumber(existing.electoralSection);
      if (inputSec && regSec && inputSec !== regSec) {
        setErrorMsg(`Directriz Global: El ciudadano "${existing.name}" (Clave: ${cleanKey}) ya se encuentra registrado en la Sección Electoral ${regSec}. Por ningún motivo puede pertenecer a más de una sección electoral (se ingresó Sección ${inputSec}).`);
        return;
      }
    }

    // Validate Required Operative Fields
    if (!formData.committeeAlias.trim()) {
      setErrorMsg('El Alias del Comité es obligatorio.');
      return;
    }
    if (formData.assignedSections.length === 0) {
      setErrorMsg('Debe asignar mínimo una sección electoral a la Demarcación Territorial Asignada.');
      return;
    }

    // Default immediate superior is the current user logged in
    const effectiveParentId = editingLeader 
      ? (editingLeader.parentId || currentUser.leaderId || null)
      : (currentUser.leaderId || allLeaders.find(l => l.email === currentUser.email || l.name === currentUser.name)?.id || currentUser.id || null);

    const effectiveLevelIndex = ORDERED_LEVELS.indexOf(targetLevel);

    // Compose territory display name
    const territoryDisplay = `${formData.committeeAlias.trim()} (Sec. ${formData.assignedSections.slice(0, 4).join(', ')}${formData.assignedSections.length > 4 ? ` +${formData.assignedSections.length - 4}` : ''})`;

    const finalLeader: TerritorialLeader = {
      id: editingLeader?.id || `node-${Date.now()}`,
      name: formData.name.trim(),
      role: targetRole,
      level: targetLevel,
      levelIndex: effectiveLevelIndex >= 0 ? effectiveLevelIndex : 2,
      parentId: effectiveParentId,
      territoryName: territoryDisplay,
      committeeAlias: formData.committeeAlias.trim(),
      assignedSections: formData.assignedSections,
      address: formData.address.trim(),
      colonia: formData.colonia.trim(),
      electoralSection: formData.electoralSection.trim(),
      curp: formData.curp.trim().toUpperCase(),
      electorKey: formData.electorKey.trim().toUpperCase(),
      phone: formData.phone.trim(),
      email: formData.email.trim().toLowerCase(),
      username: formData.email.trim().toLowerCase().split('@')[0],
      hasAccount: true,
      notesHistory: formData.notesHistory,
      notes: formData.notesHistory.map(n => `[${n.createdAt} - ${n.authorName}]: ${n.text}`).join('\n\n'),
      metaGoal: editingLeader?.metaGoal ?? 1000,
      currentCount: editingLeader?.currentCount ?? 0,
      status: editingLeader?.status || 'en_progreso',
      validationStatus: editingLeader?.validationStatus || 'validado',
      avatarBg: editingLeader?.avatarBg || 'bg-amber-600',
    };

    if (finalLeader.electorKey) {
      persistElectorProfile({
        electorKey: finalLeader.electorKey,
        name: finalLeader.name,
        address: finalLeader.address,
        colonia: finalLeader.colonia,
        electoralSection: normalizeSectionNumber(finalLeader.electoralSection || ''),
        curp: finalLeader.curp,
        phone: finalLeader.phone,
        email: finalLeader.email,
        structures: [{
          id: finalLeader.id,
          structureName: finalLeader.territoryName,
          type: finalLeader.level,
          sectionNumber: normalizeSectionNumber(finalLeader.electoralSection || ''),
          role: finalLeader.role,
          source: 'leader',
        }],
      });
    }

    onSave(finalLeader);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header - Strictly requested title, no other subtitle */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-600">
              <Building2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">
              {editingLeader
                ? 'Modificar Comité de Organización Territorial'
                : 'Registrar Comité de Organización Territorial'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 sm:p-6 space-y-6 text-xs">
          
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {existingProfileNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-medium flex items-start gap-2.5 shadow-2xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold text-xs text-emerald-950">
                  Usuario Existente Identificado
                </p>
                <p className="text-[11px] text-emerald-800">
                  {existingProfileNotice}
                </p>
                {matchedProfile?.electoralSection && (
                  <span className="inline-block mt-1 text-[10px] font-mono font-bold px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded-md">
                    Sección Electoral Asignada: {matchedProfile.electoralSection}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* 1.- DATOS GENERALES */}
          {/* ============================================================ */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200 text-slate-800 font-bold text-sm">
              <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-black">
                1
              </span>
              <span>Datos Generales</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Nombre* */}
              <div className="sm:col-span-2">
                <label className="block text-slate-700 font-semibold mb-1">
                  Nombre <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ej. Roberto Gómez Sánchez"
                    className="w-full bg-white text-slate-800 pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-2xs font-medium"
                  />
                </div>
              </div>

              {/* Dirección* */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Dirección <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Calle, número exterior e interior"
                  className="w-full bg-white text-slate-800 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-2xs"
                />
              </div>

              {/* Colonia* */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Colonia <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.colonia}
                  onChange={(e) => setFormData(prev => ({ ...prev, colonia: e.target.value }))}
                  placeholder="Ej. Tamulté de las Barrancas"
                  className="w-full bg-white text-slate-800 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-2xs"
                />
              </div>

              {/* Sección electoral* */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Sección Electoral <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={4}
                  value={formData.electoralSection}
                  onChange={(e) => setFormData(prev => ({ ...prev, electoralSection: e.target.value.replace(/\D/g, '') }))}
                  placeholder="Ej. 0416"
                  className="w-full bg-white text-slate-800 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-2xs font-mono"
                />
              </div>

              {/* CURP* */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  CURP <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={18}
                  value={formData.curp}
                  onChange={(e) => setFormData(prev => ({ ...prev, curp: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') }))}
                  placeholder="18 caracteres alfanuméricos"
                  className="w-full bg-white text-slate-800 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-2xs uppercase font-mono tracking-wider"
                />
              </div>

              {/* Clave de elector* */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Clave de Elector <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={18}
                  value={formData.electorKey}
                  onChange={(e) => handleElectorKeyChange(e.target.value)}
                  placeholder="18 caracteres (Credencial INE)"
                  className="w-full bg-white text-slate-800 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-2xs uppercase font-mono tracking-wider"
                />
              </div>

              {/* Teléfono (whatsapp)* */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Teléfono (WhatsApp) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+52 993 123 4567"
                  className="w-full bg-white text-slate-800 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-2xs"
                />
              </div>

              {/* Correo electrónico* */}
              <div className="sm:col-span-2">
                <label className="block text-slate-700 font-semibold mb-1">
                  Correo Electrónico <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="ejemplo@organizacion.mx"
                  className="w-full bg-white text-slate-800 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* 2.- DATOS OPERATIVOS */}
          {/* ============================================================ */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200 text-slate-800 font-bold text-sm">
              <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-black">
                2
              </span>
              <span>Datos Operativos</span>
            </div>

            {/* Alias del comité* */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Alias del Comité <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.committeeAlias}
                onChange={(e) => setFormData(prev => ({ ...prev, committeeAlias: e.target.value }))}
                placeholder="Ej. COT Tamulté Centro, COT Zona Gaviotas Sur"
                className="w-full bg-white text-slate-800 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs font-medium"
              />
            </div>

            {/* Demarcación Territorial Asignada* */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-slate-700 font-semibold">
                  Demarcación Territorial Asignada <span className="text-rose-500">*</span>
                  <span className="text-[11px] text-slate-500 font-normal ml-1">
                    (Secciones electorales que operará este COT. Mínimo 1)
                  </span>
                </label>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  formData.assignedSections.length > 0 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : 'bg-rose-100 text-rose-700'
                }`}>
                  {formData.assignedSections.length} {formData.assignedSections.length === 1 ? 'sección' : 'secciones'}
                </span>
              </div>

              {/* Selected Badges Area */}
              <div className="min-h-[42px] p-2 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap gap-1.5 items-center mb-2">
                {formData.assignedSections.length === 0 ? (
                  <span className="text-slate-400 italic text-[11px] px-1">
                    Ninguna sección asignada todavía. Seleccione abajo al menos una sección.
                  </span>
                ) : (
                  formData.assignedSections.map(sec => (
                    <span 
                      key={sec} 
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-100 text-amber-900 border border-amber-300 font-mono font-bold text-xs shadow-2xs"
                    >
                      <span>Sec. {sec}</span>
                      <button
                        type="button"
                        onClick={() => toggleSection(sec)}
                        className="hover:text-rose-600 rounded p-0.5 transition-colors cursor-pointer"
                        title="Quitar sección"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>

              {/* Search & Toggle Picker Section */}
              <div className="border border-slate-200 rounded-lg p-2.5 bg-white space-y-2">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={sectionFilter}
                      onChange={(e) => setSectionFilter(e.target.value)}
                      placeholder="Buscar sección por número o municipio..."
                      className="w-full bg-slate-50 text-slate-800 pl-8 pr-3 py-1.5 rounded-md border border-slate-200 text-xs focus:bg-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  {formData.assignedSections.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, assignedSections: [] }))}
                      className="px-2.5 py-1.5 text-slate-500 hover:text-rose-600 text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                      Limpiar
                    </button>
                  )}
                </div>

                {/* Grid of Sections */}
                <div className="max-h-36 overflow-y-auto grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5 p-1 bg-slate-50/50 rounded-md border border-slate-100">
                  {filteredSections.length === 0 ? (
                    <div className="col-span-full py-3 text-center text-slate-400 italic">
                      No se encontraron secciones con el criterio de búsqueda.
                    </div>
                  ) : (
                    filteredSections.map(sec => {
                      const isSelected = formData.assignedSections.includes(sec.sectionNumber);
                      return (
                        <button
                          key={sec.id || sec.sectionNumber}
                          type="button"
                          onClick={() => toggleSection(sec.sectionNumber)}
                          className={`flex items-center justify-between px-2 py-1.5 rounded-md text-xs font-mono font-bold transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300 hover:bg-amber-50/50'
                          }`}
                        >
                          <span>{sec.sectionNumber}</span>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Notas (Historial Breve) */}
            <div className="space-y-2">
              <label className="block text-slate-700 font-semibold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                  Notas
                </span>
                <span className="text-[11px] text-slate-400 font-normal">
                  {formData.notesHistory.length} {formData.notesHistory.length === 1 ? 'nota registrada' : 'notas registradas'}
                </span>
              </label>

              {/* Input for new note with send icon-only button */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddNote();
                    }
                  }}
                  placeholder="Escribir una nota u observación..."
                  className="flex-1 bg-white text-slate-800 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddNote}
                  disabled={!newNoteText.trim()}
                  aria-label="Enviar nota"
                  title="Enviar nota"
                  className="p-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:hover:bg-amber-600 text-white rounded-lg transition-all cursor-pointer shadow-xs shrink-0 flex items-center justify-center"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

              {/* Notes Feed */}
              <div className="max-h-36 overflow-y-auto space-y-2 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                {formData.notesHistory.length === 0 ? (
                  <p className="text-slate-400 italic text-center py-2 text-[11px]">
                    No hay notas registradas. Escriba arriba y presione el botón de enviar para agregar una.
                  </p>
                ) : (
                  formData.notesHistory.map(note => (
                    <div 
                      key={note.id} 
                      className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-2xs space-y-1"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-800 flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          {note.authorName}
                        </span>
                        <span className="text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-300" />
                          {note.createdAt}
                        </span>
                      </div>
                      <p className="text-slate-700 text-xs leading-snug break-words">
                        {note.text}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* FOOTER BUTTONS */}
          {/* ============================================================ */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-md shadow-amber-600/30 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{editingLeader ? 'Guardar Cambios' : 'Registrar Comité'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

