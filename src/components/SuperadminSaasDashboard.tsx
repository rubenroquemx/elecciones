import React, { useState, useEffect, useMemo } from 'react';
import type { TerritorialLeader } from '../types/territory';
import type { UserAccount } from '../types/auth';
import type { SupportTicket } from '../types/tickets';
import { 
  fetchTicketsApi, 
  createTicketApi, 
  addTicketMessageApi, 
  updateTicketStatusApi 
} from '../services/ticketsApi';
import { 
  Building2, 
  Users, 
  UserCheck, 
  LifeBuoy, 
  LogIn, 
  Plus, 
  Search, 
  Copy, 
  Check, 
  Send, 
  Trash2, 
  Database, 
  Server, 
  Activity, 
  Sparkles,
  X,
  Phone,
  Eye
} from 'lucide-react';

interface SuperadminSaasDashboardProps {
  currentUser: UserAccount;
  allLeaders: TerritorialLeader[];
  accounts: UserAccount[];
  onImpersonate: (coordinatorAccount: UserAccount) => void;
  onDeleteCoordinator: (leaderId: string) => Promise<void> | void;
  onOpenCreateCoordinatorWizard?: () => void;
  onViewCoordinatorDetails?: (coordinatorId: string) => void;
}

export const SuperadminSaasDashboard: React.FC<SuperadminSaasDashboardProps> = ({
  currentUser,
  allLeaders,
  accounts,
  onImpersonate,
  onDeleteCoordinator,
  onOpenCreateCoordinatorWizard,
  onViewCoordinatorDetails,
}) => {
  const [activeTab, setActiveTab] = useState<'campanas' | 'tickets' | 'servidores'>('campanas');
  const [searchQuery, setSearchQuery] = useState('');

  // Tickets State
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketFilter, setTicketFilter] = useState<'todos' | 'abierto' | 'en_proceso' | 'resuelto'>('todos');
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(false);

  // Modal para que el Superadmin inicie un nuevo ticket a un coordinador
  const [isSuperadminNewTicketOpen, setIsSuperadminNewTicketOpen] = useState(false);
  const [ticketTargetCoordId, setTicketTargetCoordId] = useState('');
  const [newTicketSubject, setNewTicketSubject] = useState('');
  const [newTicketMessage, setNewTicketMessage] = useState('');

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Cargar tickets
  const reloadTickets = async () => {
    setLoadingTickets(true);
    try {
      const data = await fetchTicketsApi();
      setTickets(data);
      if (selectedTicket) {
        const up = data.find(t => t.id === selectedTicket.id);
        if (up) setSelectedTicket(up);
      }
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    reloadTickets();
    const interval = setInterval(reloadTickets, 10000);
    return () => clearInterval(interval);
  }, []);

  // Coordinadores de Campaña registrados
  const campanaCoordinators = useMemo(() => {
    return allLeaders.filter(
      l => l.level === 'campana' || l.level === 'estatal' || l.level === 'distrital'
    );
  }, [allLeaders]);

  // Mapa de cuentas por leaderId
  const accountsByLeaderId = useMemo(() => {
    const map = new Map<string, UserAccount>();
    accounts.forEach(acc => {
      if (acc.leaderId) map.set(acc.leaderId, acc);
    });
    return map;
  }, [accounts]);

  // Métricas agregadas por coordinador
  const statsByCoordinator = useMemo(() => {
    const map = new Map<string, { promotoresCount: number; promovidosCount: number }>();
    campanaCoordinators.forEach(c => {
      // Promotores descendientes
      const promotores = allLeaders.filter(
        l => l.level === 'promotor' && (l.parentId === c.id || l.territoryName?.includes(c.territoryName))
      );
      // Promovidos descendientes
      const promovidos = allLeaders.filter(
        l => l.level === 'promovido'
      );
      map.set(c.id, {
        promotoresCount: promotores.length,
        promovidosCount: promovidos.length,
      });
    });
    return map;
  }, [campanaCoordinators, allLeaders]);

  // Totales Globales SaaS
  const totalCampaigns = campanaCoordinators.length;
  const totalPromoters = allLeaders.filter(l => l.level === 'promotor').length;
  const totalPromovidos = allLeaders.filter(l => l.level === 'promovido').length;
  const pendingTicketsCount = tickets.filter(t => t.status === 'abierto' || t.status === 'en_proceso').length;

  // Filtrado de coordinadores
  const filteredCoordinators = useMemo(() => {
    if (!searchQuery.trim()) return campanaCoordinators;
    const q = searchQuery.toLowerCase();
    return campanaCoordinators.filter(c => 
      c.name.toLowerCase().includes(q) ||
      c.territoryName.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.username && c.username.toLowerCase().includes(q))
    );
  }, [campanaCoordinators, searchQuery]);

  // Filtrado de tickets
  const filteredTickets = useMemo(() => {
    if (ticketFilter === 'todos') return tickets;
    return tickets.filter(t => t.status === ticketFilter);
  }, [tickets, ticketFilter]);

  // Responder a ticket como Superadmin
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

  const handleCreateTicketFromSuperadmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const coord = campanaCoordinators.find(c => c.id === ticketTargetCoordId);
    if (!coord || !newTicketSubject.trim() || !newTicketMessage.trim()) return;

    await createTicketApi({
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

    setIsSuperadminNewTicketOpen(false);
    setNewTicketSubject('');
    setNewTicketMessage('');
    await reloadTickets();
  };

  const handleCopyCredentials = (coord: TerritorialLeader, acc?: UserAccount) => {
    const text = `🎉 *ACCESO A PLATAFORMA ELECTORAL (SAAS)*\n\n` +
      `Estimado(a) *${coord.name}*,\n` +
      `Tu cuenta como *Coordinador de Campaña*:\n` +
      `📍 *Campaña:* ${coord.territoryName}\n` +
      `👤 *Usuario:* ${acc?.username || coord.username || 'usuario'}\n` +
      `🔑 *Contraseña:* ${acc?.password || 'campana2026'}\n` +
      `🔗 *Acceso:* https://elecciones.legislab.app`;
    navigator.clipboard.writeText(text);
    setCopiedKey(coord.id);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 flex flex-col min-h-screen">
      {/* 1. Header SaaS */}
      <div className="bg-slate-900 text-white border-b border-slate-800 p-6 sm:p-8 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                PORTAL ADMINISTRADOR SAAS
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-slate-400 font-mono">Multi-Campañas Activo</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Gestión Central de Campañas
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              Administración de Coordinadores de Campaña, auditoría directa de cuentas e incidencias técnicas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onOpenCreateCoordinatorWizard?.()}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-800 hover:from-indigo-500 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-950/40 transition-all flex items-center gap-2 cursor-pointer active:scale-98"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Coordinador de Campaña</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Tarjetas Métricas SaaS */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 -mt-4 z-10 shrink-0">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Campañas */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Campañas Activas</p>
              <h3 className="text-2xl font-black text-slate-900 font-mono">{totalCampaigns}</h3>
              <p className="text-[10px] text-indigo-600 font-semibold">Coordinadores de Campaña</p>
            </div>
          </div>

          {/* Card 2: Promotores */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Promotores Globales</p>
              <h3 className="text-2xl font-black text-slate-900 font-mono">{totalPromoters}</h3>
              <p className="text-[10px] text-sky-600 font-semibold">En todas las campañas</p>
            </div>
          </div>

          {/* Card 3: Promovidos */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ciudadanos Promovidos</p>
              <h3 className="text-2xl font-black text-emerald-700 font-mono">{totalPromovidos}</h3>
              <p className="text-[10px] text-emerald-600 font-semibold">Capturados en Base de Datos</p>
            </div>
          </div>

          {/* Card 4: Tickets */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
              pendingTicketsCount > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'
            }`}>
              <LifeBuoy className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tickets de Soporte</p>
              <h3 className="text-2xl font-black text-slate-900 font-mono">{pendingTicketsCount}</h3>
              <p className={`text-[10px] font-semibold ${pendingTicketsCount > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                {pendingTicketsCount > 0 ? 'Requieren tu atención' : 'Todo resuelto'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Navegación de Pestañas SaaS */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-6 shrink-0">
        <div className="flex border-b border-slate-200 gap-6">
          <button
            type="button"
            onClick={() => setActiveTab('campanas')}
            className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'campanas'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Coordinadores de Campaña ({campanaCoordinators.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tickets')}
            className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer relative ${
              activeTab === 'tickets'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <LifeBuoy className="w-4 h-4" />
            <span>Mesa de Ayuda & Tickets ({tickets.length})</span>
            {pendingTicketsCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('servidores')}
            className={`pb-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'servidores'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>Infraestructura & Conexiones</span>
          </button>
        </div>
      </div>

      {/* 4. Tab 1: Coordinadores de Campaña */}
      {activeTab === 'campanas' && (
        <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-4 flex-1">
          {/* Barra de Filtro y Buscador */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre, usuario, correo o demarcación de campaña..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <span className="text-xs text-slate-500 font-medium px-2">
              Mostrando {filteredCoordinators.length} de {campanaCoordinators.length} coordinadores
            </span>
          </div>

          {filteredCoordinators.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-3">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="text-base font-bold text-slate-700">No hay Coordinadores de Campaña registrados</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                El Superadmin administra las campañas creando a sus Coordinadores Generales.
              </p>
              <button
                type="button"
                onClick={() => onOpenCreateCoordinatorWizard?.()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-indigo-500 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Crear Primer Coordinador de Campaña</span>
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Coordinador & Campaña</th>
                      <th className="py-3 px-4">Usuario</th>
                      <th className="py-3 px-4">Contacto</th>
                      <th className="py-3 px-4 text-center">Equipo & Avance</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredCoordinators.map((coord) => {
                      const acc = accountsByLeaderId.get(coord.id) || accounts.find(a => a.username === coord.username);
                      const stats = statsByCoordinator.get(coord.id) || { promotoresCount: 0, promovidosCount: 0 };
                      const isCopied = copiedKey === coord.id;
                      const cleanPhone = (coord.phone || '').replace(/\D/g, '');

                      const targetAccount: UserAccount = acc || {
                        id: `usr-${coord.id}`,
                        username: coord.username || 'usuario',
                        name: coord.name,
                        email: coord.email || `${coord.username}@campana.mx`,
                        password: 'campana2026',
                        leaderId: coord.id,
                        level: 'campana',
                        territoryName: coord.territoryName,
                        accountRoleLabel: 'Coordinador de Campaña',
                        avatarBg: 'bg-indigo-600',
                        assignedBy: 'Super Administrador (SaaS)',
                      };

                      return (
                        <tr key={coord.id} className="hover:bg-slate-50/60 transition-colors">
                          {/* 1. Coordinador & Campaña */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                                {coord.name.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 truncate">{coord.name}</div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80 truncate max-w-[200px]">
                                    {coord.territoryName}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* 2. Usuario (Sin exponer la contraseña) */}
                          <td className="py-3.5 px-4">
                            <span className="font-mono text-slate-800 font-semibold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              @{acc?.username || coord.username || 'N/A'}
                            </span>
                          </td>

                          {/* 3. Contacto Directo: Llamar y WhatsApp */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              {coord.phone ? (
                                <>
                                  <a
                                    href={`tel:${cleanPhone}`}
                                    className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors inline-flex items-center justify-center cursor-pointer"
                                    title={`Llamar a ${coord.name} (${coord.phone})`}
                                  >
                                    <Phone className="w-3.5 h-3.5" />
                                  </a>
                                  <a
                                    href={`https://wa.me/52${cleanPhone}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg transition-colors inline-flex items-center justify-center cursor-pointer"
                                    title={`Enviar WhatsApp a ${coord.name}`}
                                  >
                                    <Send className="w-3.5 h-3.5" />
                                  </a>
                                  <span className="text-slate-700 font-mono text-[11px] ml-1">
                                    {coord.phone}
                                  </span>
                                </>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">Sin teléfono</span>
                              )}
                            </div>
                            {coord.email && (
                              <div className="text-[11px] text-slate-400 truncate max-w-[180px] mt-0.5 font-sans">
                                {coord.email}
                              </div>
                            )}
                          </td>

                          {/* 4. Equipo & Avance */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="inline-flex items-center gap-3">
                              <div className="text-center" title="Promotores Territoriales activos">
                                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Promotores</span>
                                <span className="font-mono font-bold text-slate-800 text-xs">{stats.promotoresCount}</span>
                              </div>
                              <div className="w-px h-6 bg-slate-200" />
                              <div className="text-center" title="Ciudadanos Promovidos registrados">
                                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Promovidos</span>
                                <span className="font-mono font-bold text-emerald-700 text-xs">{stats.promovidosCount}</span>
                              </div>
                            </div>
                          </td>

                          {/* 5. Acciones */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5 justify-end">
                              {/* Botón Ver Detalles (Página completa) */}
                              <button
                                type="button"
                                onClick={() => onViewCoordinatorDetails?.(coord.id)}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                title="Ver detalles completos del coordinador en su propia página"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Detalles</span>
                              </button>

                              {/* Botón Entrar a su Cuenta */}
                              <button
                                type="button"
                                onClick={() => onImpersonate(targetAccount)}
                                className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs cursor-pointer active:scale-98"
                                title="Iniciar sesión directamente en la cuenta de este Coordinador de Campaña"
                              >
                                <LogIn className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Entrar</span>
                              </button>

                              {/* Copiar Credenciales */}
                              <button
                                type="button"
                                onClick={() => handleCopyCredentials(coord, acc)}
                                className="p-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                                title="Copiar credenciales de acceso"
                              >
                                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>

                              {/* Ticket */}
                              <button
                                type="button"
                                onClick={() => {
                                  setTicketTargetCoordId(coord.id);
                                  setIsSuperadminNewTicketOpen(true);
                                }}
                                className="p-1.5 bg-white hover:bg-slate-100 text-indigo-600 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                                title="Enviar mensaje o ticket de soporte"
                              >
                                <LifeBuoy className="w-3.5 h-3.5" />
                              </button>

                              {/* Eliminar */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`¿Estás seguro de eliminar permanentemente al Coordinador "${coord.name}"?`)) {
                                    onDeleteCoordinator(coord.id);
                                  }
                                }}
                                className="p-1.5 bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 hover:border-rose-200 rounded-lg transition-colors cursor-pointer"
                                title="Eliminar Coordinador"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. Tab 2: Mesa de Ayuda & Tickets SaaS */}
      {activeTab === 'tickets' && (
        <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 flex-1 flex flex-col">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex-1 flex flex-col md:flex-row min-h-[600px]">
            {/* Lista de Tickets */}
            <div className="w-full md:w-96 border-r border-slate-200 flex flex-col bg-slate-50 shrink-0">
              {/* Header Tickets */}
              <div className="p-4 border-b border-slate-200 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <span>Tickets de Coordinadores ({tickets.length})</span>
                    {loadingTickets && <span className="inline-block w-2 h-2 rounded-full bg-indigo-500 animate-pulse" title="Sincronizando..." />}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsSuperadminNewTicketOpen(true)}
                    className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Redactar</span>
                  </button>
                </div>

                {/* Filtro por estado */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px]">
                  {(['todos', 'abierto', 'en_proceso', 'resuelto'] as const).map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setTicketFilter(st)}
                      className={`px-2.5 py-1 rounded-lg font-bold capitalize transition-colors cursor-pointer shrink-0 ${
                        ticketFilter === st
                          ? 'bg-slate-900 text-white'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {st.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lista */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-200">
                {filteredTickets.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                    <LifeBuoy className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="font-bold text-slate-600">No hay tickets en este estado</p>
                    <p>Los tickets que envíen los Coordinadores de Campaña se mostrarán aquí.</p>
                  </div>
                ) : (
                  filteredTickets.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTicket(t)}
                      className={`w-full text-left p-4 transition-colors cursor-pointer ${
                        selectedTicket?.id === t.id ? 'bg-indigo-50/80 border-l-4 border-indigo-600' : 'hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] font-mono text-slate-500 font-bold">{t.id}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          t.status === 'abierto' ? 'bg-amber-100 text-amber-800' :
                          t.status === 'en_proceso' ? 'bg-sky-100 text-sky-800' :
                          'bg-emerald-100 text-emerald-800'
                        }`}>
                          {t.status.replace('_', ' ')}
                        </span>
                      </div>
                      <h5 className="text-xs font-bold text-slate-900 truncate">{t.subject}</h5>
                      <p className="text-[11px] text-indigo-700 font-medium truncate mt-0.5">
                        {t.campanaLeaderName} • {t.campanaTerritory}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2">
                        <span>{t.messages.length} mensaje(s)</span>
                        <span>{new Date(t.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Conversación del Ticket */}
            <div className="flex-1 flex flex-col bg-white overflow-hidden">
              {selectedTicket ? (
                <div className="flex-1 flex flex-col h-full overflow-hidden">
                  {/* Encabezado del Ticket */}
                  <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3 shrink-0">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono font-bold text-slate-500">{selectedTicket.id}</span>
                        <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                          {selectedTicket.campanaLeaderName} ({selectedTicket.campanaTerritory})
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-slate-900">{selectedTicket.subject}</h4>
                    </div>

                    {/* Selector de Estatus */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-medium">Estatus:</span>
                      <select
                        value={selectedTicket.status}
                        onChange={(e) => handleChangeStatus(e.target.value)}
                        className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      >
                        <option value="abierto">Abierto</option>
                        <option value="en_proceso">En Proceso</option>
                        <option value="resuelto">Resuelto</option>
                        <option value="cerrado">Cerrado</option>
                      </select>
                    </div>
                  </div>

                  {/* Hilo de Mensajes */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-100/50">
                    {selectedTicket.messages.map(m => {
                      const isSuperadmin = m.senderRole === 'superadmin';
                      return (
                        <div
                          key={m.id}
                          className={`flex flex-col ${isSuperadmin ? 'items-end' : 'items-start'}`}
                        >
                          <div className="flex items-center gap-1.5 mb-1 text-[10px] text-slate-400">
                            <span className={`font-bold ${isSuperadmin ? 'text-indigo-600' : 'text-slate-700'}`}>
                              {m.senderName} {isSuperadmin ? '(Tú - Superadmin)' : '(Coordinador de Campaña)'}
                            </span>
                            <span>• {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div
                            className={`max-w-[85%] rounded-2xl p-3.5 text-xs shadow-xs ${
                              isSuperadmin
                                ? 'bg-indigo-600 text-white rounded-tr-none'
                                : 'bg-white border border-slate-200 text-slate-900 rounded-tl-none'
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{m.message}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Formulario de Respuesta como Superadmin */}
                  <form onSubmit={handleReplyTicket} className="p-3 border-t border-slate-200 bg-white flex items-center gap-2 shrink-0">
                    <input
                      type="text"
                      required
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Escribe tu respuesta como Superadministrador..."
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
                  <p className="text-sm font-bold text-slate-600">Selecciona un ticket para responder</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">
                    Canal exclusivo de soporte directo entre el Superadministrador y los Coordinadores de Campaña.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. Tab 3: Servidores & Auditoría */}
      {activeTab === 'servidores' && (
        <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-4 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Base de Datos */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Base de Datos PostgreSQL (Producción)</h4>
                  <p className="text-xs text-slate-500">Esquema: elecciones • Easypanel</p>
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl text-xs font-mono space-y-1">
                <p>Status: <span className="text-emerald-600 font-bold">Conectado (En línea)</span></p>
                <p>Total Líderes Registrados: <span className="text-slate-800 font-bold">{allLeaders.length}</span></p>
                <p>Host: <span className="text-slate-600">elecciones.legislab.app</span></p>
              </div>
            </div>

            {/* Servicio OCR */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Servicio OCR de Credenciales INE</h4>
                  <p className="text-xs text-slate-500">PaddleOCR Autohospedado ($0 costo por escaneo)</p>
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl text-xs font-mono space-y-1">
                <p>Status: <span className="text-emerald-600 font-bold">Operativo 24/7</span></p>
                <p>Modo: <span className="text-slate-800 font-bold">Local Autohospedado</span></p>
                <p>Servidor: <span className="text-slate-600">legislab-paddle-ocr</span></p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Iniciar Ticket desde Superadmin a un Coordinador */}
      {isSuperadminNewTicketOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-emil-fade">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h4 className="text-sm font-bold">Enviar Comunicado o Abrir Ticket a Coordinador</h4>
              <button
                type="button"
                onClick={() => setIsSuperadminNewTicketOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateTicketFromSuperadmin} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Coordinador Destino *</label>
                <select
                  required
                  value={ticketTargetCoordId}
                  onChange={(e) => setTicketTargetCoordId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">Selecciona un Coordinador de Campaña...</option>
                  {campanaCoordinators.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {c.territoryName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Asunto *</label>
                <input
                  type="text"
                  required
                  value={newTicketSubject}
                  onChange={(e) => setNewTicketSubject(e.target.value)}
                  placeholder="Ej. Notificación de nueva cartografía seccional disponible"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mensaje o Indicación *</label>
                <textarea
                  required
                  rows={4}
                  value={newTicketMessage}
                  onChange={(e) => setNewTicketMessage(e.target.value)}
                  placeholder="Escribe el mensaje que recibirá el Coordinador de Campaña en su panel..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSuperadminNewTicketOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold cursor-pointer"
                >
                  Enviar Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
