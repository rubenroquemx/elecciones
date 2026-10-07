import React, { useState, useEffect } from 'react';
import type { UserAccount } from '../types/auth';
import type { SupportTicket, TicketCategory, TicketPriority } from '../types/tickets';
import { 
  fetchTicketsApi, 
  createTicketApi, 
  addTicketMessageApi 
} from '../services/ticketsApi';
import { 
  LifeBuoy, 
  X, 
  Plus, 
  Send
} from 'lucide-react';

interface CampanaTicketsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount;
}

export const CampanaTicketsModal: React.FC<CampanaTicketsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);

  // Formulario nuevo ticket
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<TicketCategory>('soporte_tecnico');
  const [priority, setPriority] = useState<TicketPriority>('media');
  const [initialMessage, setInitialMessage] = useState('');

  // Mensaje en hilo existente
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const data = await fetchTicketsApi(currentUser.leaderId || undefined);
      setTickets(data);
      if (selectedTicket) {
        const updated = data.find(t => t.id === selectedTicket.id);
        if (updated) setSelectedTicket(updated);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadTickets();
    }
  }, [isOpen, currentUser.leaderId]);

  if (!isOpen) return null;

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !initialMessage.trim()) return;

    setLoading(true);
    try {
      const newTicket = await createTicketApi({
        campanaLeaderId: currentUser.leaderId || `usr-${currentUser.id}`,
        campanaLeaderName: currentUser.name,
        campanaTerritory: currentUser.territoryName,
        campanaUserEmail: currentUser.email,
        subject: subject.trim(),
        category,
        priority,
        messages: [
          {
            id: `msg-${Date.now()}`,
            senderId: currentUser.id,
            senderName: currentUser.name,
            senderRole: 'campana',
            message: initialMessage.trim(),
            createdAt: new Date().toISOString(),
          }
        ]
      });

      setSubject('');
      setInitialMessage('');
      setIsCreating(false);
      setSelectedTicket(newTicket);
      await loadTickets();
    } catch (err) {
      console.error('Error al crear ticket:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    setSendingReply(true);
    try {
      const updated = await addTicketMessageApi(
        selectedTicket.id,
        {
          senderId: currentUser.id,
          senderName: currentUser.name,
          senderRole: 'campana',
          message: replyText.trim(),
        },
        selectedTicket.status === 'resuelto' ? 'en_proceso' : undefined
      );

      setReplyText('');
      if (updated) {
        setSelectedTicket(updated);
        await loadTickets();
      }
    } finally {
      setSendingReply(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'abierto':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">Abierto</span>;
      case 'en_proceso':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-300">En Proceso</span>;
      case 'resuelto':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">Resuelto</span>;
      case 'cerrado':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">Cerrado</span>;
      default:
        return null;
    }
  };

  const getPriorityBadge = (prio: string) => {
    switch (prio) {
      case 'urgente':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-600 text-white font-mono uppercase">Urgente</span>;
      case 'alta':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-orange-500 text-white font-mono uppercase">Alta</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-700 font-mono uppercase">Normal</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-emil-fade">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 flex items-center justify-center shrink-0">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white leading-tight">
                  Mesa de Ayuda & Tickets SaaS
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  Enlace Directo con Superadmin
                </span>
              </div>
              <p className="text-xs text-indigo-200/80">
                {currentUser.name} • {currentUser.territoryName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Tickets List */}
          <div className="w-full sm:w-80 md:w-96 border-r border-slate-200 flex flex-col bg-slate-50 shrink-0">
            <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-white">
              <span className="text-xs font-bold text-slate-700">Tus Tickets ({tickets.length})</span>
              <button
                type="button"
                onClick={() => {
                  setIsCreating(true);
                  setSelectedTicket(null);
                }}
                className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nuevo Ticket</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-200">
              {loading && tickets.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">Cargando tickets...</div>
              ) : tickets.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <LifeBuoy className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-600">No tienes tickets abiertos</p>
                  <p className="text-[11px] text-slate-400">
                    Crea un ticket para reportar incidencias o solicitar apoyo técnico al Superadmin.
                  </p>
                </div>
              ) : (
                tickets.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setSelectedTicket(t);
                      setIsCreating(false);
                    }}
                    className={`w-full text-left p-3.5 transition-colors cursor-pointer ${
                      selectedTicket?.id === t.id ? 'bg-indigo-50/80 border-l-4 border-indigo-600' : 'hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[10px] font-mono text-slate-500 font-bold">{t.id}</span>
                      <div className="flex items-center gap-1">
                        {getPriorityBadge(t.priority)}
                        {getStatusBadge(t.status)}
                      </div>
                    </div>
                    <h5 className="text-xs font-bold text-slate-900 truncate">{t.subject}</h5>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                      <span>{t.messages.length} mensaje(s)</span>
                      <span>{new Date(t.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right: Ticket Detail or Create Form */}
          <div className="flex-1 flex flex-col bg-white overflow-hidden">
            {isCreating ? (
              <form onSubmit={handleCreateTicket} className="p-6 overflow-y-auto space-y-4 flex-1">
                <div className="border-b border-slate-200 pb-3">
                  <h4 className="text-base font-bold text-slate-900">Crear Nuevo Ticket de Soporte</h4>
                  <p className="text-xs text-slate-500">
                    Se enviará directamente al Superadministrador del sistema.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Asunto del Ticket *</label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Ej. Solicitud de ajuste en catálogo seccional del Distrito 06"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Categoría</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="soporte_tecnico">Soporte Técnico / Plataforma</option>
                      <option value="solicitud_secciones">Solicitud de Secciones Electorales</option>
                      <option value="capacitacion">Capacitación de Promotores</option>
                      <option value="incidencia_campo">Incidencia Operativa de Campo</option>
                      <option value="otro">Otro Asunto</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Prioridad</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="baja">Baja (Informativo)</option>
                      <option value="media">Media (Normal)</option>
                      <option value="alta">Alta (Atención pronta)</option>
                      <option value="urgente">Urgente (Bloqueo en campo)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Descripción del Requerimiento o Problema *
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={initialMessage}
                    onChange={(e) => setInitialMessage(e.target.value)}
                    placeholder="Describe detalladamente qué necesitas o qué problema estás experimentando en tu campaña..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Enviar Ticket al Superadmin</span>
                  </button>
                </div>
              </form>
            ) : selectedTicket ? (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Ticket Header */}
                <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-start justify-between gap-3 shrink-0">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono font-bold text-slate-500">{selectedTicket.id}</span>
                      {getPriorityBadge(selectedTicket.priority)}
                      {getStatusBadge(selectedTicket.status)}
                    </div>
                    <h4 className="text-base font-bold text-slate-900">{selectedTicket.subject}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Categoría: <span className="font-semibold text-slate-700 uppercase">{selectedTicket.category.replace('_', ' ')}</span> • Creado el {new Date(selectedTicket.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Conversation Thread */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-100/50">
                  {selectedTicket.messages.map((m) => {
                    const isSuperadmin = m.senderRole === 'superadmin';
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isSuperadmin ? 'items-start' : 'items-end'}`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 text-[10px] text-slate-400">
                          <span className={`font-bold ${isSuperadmin ? 'text-indigo-600' : 'text-slate-700'}`}>
                            {m.senderName} {isSuperadmin ? '(Superadministrador SaaS)' : '(Campaña)'}
                          </span>
                          <span>• {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div
                          className={`max-w-[85%] rounded-2xl p-3 text-xs shadow-xs ${
                            isSuperadmin
                              ? 'bg-white border border-indigo-200 text-slate-900 rounded-tl-none'
                              : 'bg-indigo-600 text-white rounded-tr-none'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{m.message}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Reply Form */}
                <form onSubmit={handleSendReply} className="p-3 border-t border-slate-200 bg-white flex items-center gap-2 shrink-0">
                  <input
                    type="text"
                    required
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Escribe una respuesta o consulta adicional..."
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={sendingReply || !replyText.trim()}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Responder</span>
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <LifeBuoy className="w-12 h-12 text-slate-200 mb-2" />
                <p className="text-sm font-bold text-slate-600">Selecciona un ticket para ver la conversación</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Aquí podrás revisar las respuestas del Superadmin y dar seguimiento a las incidencias de tu campaña.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
