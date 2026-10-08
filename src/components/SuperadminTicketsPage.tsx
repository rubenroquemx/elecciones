import React, { useState, useEffect } from 'react';
import type { UserAccount } from '../types/auth';
import type { TerritorialLeader } from '../types/territory';
import type { SupportTicket } from '../types/tickets';
import { 
  fetchTicketsApi, 
  createTicketApi, 
  addTicketMessageApi, 
  updateTicketStatusApi 
} from '../services/ticketsApi';
import { 
  LifeBuoy, 
  Plus, 
  Search, 
  Send, 
  X
} from 'lucide-react';

interface SuperadminTicketsPageProps {
  currentUser: UserAccount;
  allLeaders: TerritorialLeader[];
}

export const SuperadminTicketsPage: React.FC<SuperadminTicketsPageProps> = ({
  currentUser,
  allLeaders,
}) => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketFilter, setTicketFilter] = useState<'todos' | 'abierto' | 'en_proceso' | 'resuelto'>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(false);

  // Nuevo ticket
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [ticketTargetCoordId, setTicketTargetCoordId] = useState('');
  const [newTicketSubject, setNewTicketSubject] = useState('');
  const [newTicketMessage, setNewTicketMessage] = useState('');

  // Coordinadores de Campaña disponibles
  const campanaCoordinators = allLeaders.filter(
    l => l.level === 'campana' || l.level === 'estatal' || l.level === 'distrital'
  );

  const reloadTickets = async () => {
    setLoadingTickets(true);
    try {
      const data = await fetchTicketsApi();
      setTickets(data);
      if (selectedTicket) {
        const up = data.find(t => t.id === selectedTicket.id);
        if (up) setSelectedTicket(up);
      } else if (data.length > 0) {
        setSelectedTicket(data[0]);
      }
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    reloadTickets();
    const interval = setInterval(reloadTickets, 8000);
    return () => clearInterval(interval);
  }, []);

  const filteredTickets = tickets.filter(t => {
    const matchesFilter = ticketFilter === 'todos' || t.status === ticketFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || 
      t.campanaLeaderName.toLowerCase().includes(q) ||
      t.subject.toLowerCase().includes(q) ||
      t.campanaTerritory.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  const handleReplyTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    setSendingReply(true);
    try {
      const updated = await addTicketMessageApi(
        selectedTicket.id,
        {
          senderId: currentUser.id,
          senderName: 'Superadministrador SaaS',
          senderRole: 'superadmin',
          message: replyText.trim(),
        },
        selectedTicket.status === 'abierto' ? 'en_proceso' : undefined
      );

      setReplyText('');
      if (updated) {
        setSelectedTicket(updated);
        await reloadTickets();
      }
    } finally {
      setSendingReply(false);
    }
  };

  const handleChangeStatus = async (newStatus: string) => {
    if (!selectedTicket) return;
    await updateTicketStatusApi(selectedTicket.id, newStatus);
    setSelectedTicket(prev => prev ? { ...prev, status: newStatus as any } : null);
    await reloadTickets();
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    const coord = campanaCoordinators.find(c => c.id === ticketTargetCoordId);
    if (!coord || !newTicketSubject.trim() || !newTicketMessage.trim()) return;

    const created = await createTicketApi({
      campanaLeaderId: coord.id,
      campanaLeaderName: coord.name,
      campanaTerritory: coord.territoryName,
      campanaUserEmail: coord.email || '',
      subject: newTicketSubject.trim(),
      category: 'soporte_tecnico',
      priority: 'alta',
      messages: [
        {
          id: `msg-${Date.now()}`,
          senderId: currentUser.id,
          senderName: 'Superadministrador SaaS',
          senderRole: 'superadmin',
          message: newTicketMessage.trim(),
          createdAt: new Date().toISOString(),
        }
      ]
    });

    setIsCreatingTicket(false);
    setNewTicketSubject('');
    setNewTicketMessage('');
    await reloadTickets();
    if (created) setSelectedTicket(created);
  };

  return (
    <div className="flex-1 w-full h-full flex flex-col bg-slate-50 overflow-hidden font-sans text-slate-800">
      {/* Header Superior que ocupa todo el ancho */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <LifeBuoy className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Mesa de Ayuda & Tickets</span>
              {loadingTickets && <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />}
            </h1>
            <p className="text-xs text-slate-500">
              Canal de soporte y comunicación con los Coordinadores de Campaña
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsCreatingTicket(true)}
          className="px-4 py-2 bg-[#9d2449] hover:bg-[#801d3b] text-white rounded-none text-xs font-bold flex items-center gap-2 transition-all shadow-xs cursor-pointer active:scale-98"
        >
          <Plus className="w-4 h-4" />
          <span>Redactar Ticket / Notificación</span>
        </button>
      </div>

      {/* Contenedor Split Screen Completo */}
      <div className="flex-1 flex w-full overflow-hidden">
        {/* Panel Izquierdo: Lista de Tickets */}
        <div className="w-80 md:w-96 border-r border-slate-200 bg-white flex flex-col shrink-0">
          {/* Filtros y Buscador */}
          <div className="p-3 border-b border-slate-100 space-y-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por coordinador o asunto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8.5 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px]">
              {(['todos', 'abierto', 'en_proceso', 'resuelto'] as const).map(st => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setTicketFilter(st)}
                  className={`px-2.5 py-1 rounded-lg font-bold capitalize transition-colors cursor-pointer shrink-0 ${
                    ticketFilter === st
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Lista scrolleable */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredTickets.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                <LifeBuoy className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="font-bold text-slate-600">No hay tickets</p>
                <p>Las incidencias de los coordinadores se listarán aquí.</p>
              </div>
            ) : (
              filteredTickets.map(t => {
                const isSelected = selectedTicket?.id === t.id;
                const lastMsg = t.messages[t.messages.length - 1];

                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setSelectedTicket(t);
                      setIsCreatingTicket(false);
                    }}
                    className={`w-full text-left p-3.5 transition-colors cursor-pointer flex flex-col gap-1.5 ${
                      isSelected ? 'bg-indigo-50/60 border-l-4 border-indigo-600' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-xs text-slate-900 truncate">
                        {t.campanaLeaderName}
                      </div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded capitalize shrink-0 ${
                        t.status === 'abierto' ? 'bg-rose-100 text-rose-700' :
                        t.status === 'en_proceso' ? 'bg-amber-100 text-amber-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {t.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="text-[11px] font-semibold text-slate-700 truncate">
                      {t.subject}
                    </div>

                    <div className="text-[10px] text-slate-400 truncate">
                      {lastMsg?.message}
                    </div>

                    <div className="text-[9px] text-slate-400 flex items-center justify-between pt-1">
                      <span>{t.campanaTerritory}</span>
                      <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Panel Derecho: Conversación o Formulario de Redacción */}
        <div className="flex-1 bg-slate-50 flex flex-col overflow-hidden">
          {isCreatingTicket ? (
            /* Formulario para Crear Nuevo Ticket */
            <div className="p-6 sm:p-8 max-w-2xl mx-auto w-full my-auto bg-white rounded-2xl border border-slate-200 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">
                  Nuevo Ticket hacia Jefe de Campaña
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCreatingTicket(false)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateTicket} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Seleccionar Coordinador Destino *
                  </label>
                  <select
                    required
                    value={ticketTargetCoordId}
                    onChange={(e) => setTicketTargetCoordId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                  >
                    <option value="">Selecciona un coordinador...</option>
                    {campanaCoordinators.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} — {c.territoryName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Asunto del Ticket *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTicketSubject}
                    onChange={(e) => setNewTicketSubject(e.target.value)}
                    placeholder="Ej. Revisión de metas o soporte técnico..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mensaje Inicial *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={newTicketMessage}
                    onChange={(e) => setNewTicketMessage(e.target.value)}
                    placeholder="Escribe el mensaje o indicación..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-600 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreatingTicket(false)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#9d2449] hover:bg-[#801d3b] text-white rounded-none text-xs font-bold flex items-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Enviar Ticket</span>
                  </button>
                </div>
              </form>
            </div>
          ) : selectedTicket ? (
            /* Vista del Ticket Seleccionado */
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Header Conversación */}
              <div className="p-4 bg-white border-b border-slate-200 shrink-0 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      {selectedTicket.subject}
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-none bg-[#9d2449]/10 text-[#9d2449] border border-[#9d2449]/20">
                      {selectedTicket.campanaTerritory}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Coordinador: <strong className="text-slate-800">{selectedTicket.campanaLeaderName}</strong> ({selectedTicket.campanaUserEmail})
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">Estado:</span>
                  <select
                    value={selectedTicket.status}
                    onChange={(e) => handleChangeStatus(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-none text-xs font-bold text-slate-800 focus:outline-none focus:border-[#9d2449]"
                  >
                    <option value="abierto">Abierto</option>
                    <option value="en_proceso">En Proceso</option>
                    <option value="resuelto">Resuelto</option>
                  </select>
                </div>
              </div>

              {/* Hilo de Mensajes */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5">
                {selectedTicket.messages.map((m) => {
                  const isSuper = m.senderRole === 'superadmin';
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col max-w-xl ${isSuper ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                    >
                      <div className="text-[10px] text-slate-400 mb-1 flex items-center gap-1.5 font-medium">
                        <span>{m.senderName}</span>
                        <span>•</span>
                        <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className={`p-3.5 text-xs leading-relaxed ${
                        isSuper 
                          ? 'bg-[#9d2449] text-white shadow-xs' 
                          : 'bg-white border border-slate-200 text-slate-800 shadow-xs'
                      }`}>
                        {m.message}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Caja de Respuesta */}
              <form onSubmit={handleReplyTicket} className="p-4 bg-white border-t border-slate-200 shrink-0 flex items-center gap-2">
                <input
                  type="text"
                  required
                  placeholder="Escribe una respuesta para el coordinador..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-none text-xs text-slate-900 focus:outline-none focus:border-[#9d2449]"
                />
                <button
                  type="submit"
                  disabled={sendingReply}
                  className="px-4 py-2.5 bg-[#9d2449] hover:bg-[#801d3b] text-white rounded-none text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-98 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sendingReply ? 'Enviando...' : 'Responder'}</span>
                </button>
              </form>
            </div>
          ) : (
            <div className="m-auto text-center p-8 space-y-2 text-slate-400">
              <LifeBuoy className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-600 text-sm">Selecciona un ticket para ver la conversación</p>
              <p className="text-xs">O redacta un nuevo mensaje hacia cualquier jefe de campaña.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
