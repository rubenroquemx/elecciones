import type { SupportTicket, TicketMessage } from '../types/tickets';

const API_BASE = ''; // Relative in production

const LOCAL_STORAGE_KEY = 'saas_support_tickets';

function getLocalTickets(): SupportTicket[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

function saveLocalTickets(tickets: SupportTicket[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tickets));
  } catch (e) {}
}

export async function fetchTicketsApi(campanaLeaderId?: string): Promise<SupportTicket[]> {
  try {
    const url = campanaLeaderId 
      ? `${API_BASE}/api/tickets?campanaLeaderId=${encodeURIComponent(campanaLeaderId)}`
      : `${API_BASE}/api/tickets`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        saveLocalTickets(data);
        return data;
      }
    }
  } catch (err) {
    console.warn('API tickets no disponible, usando respaldo local:', err);
  }
  const local = getLocalTickets();
  return campanaLeaderId ? local.filter(t => t.campanaLeaderId === campanaLeaderId) : local;
}

export async function createTicketApi(ticket: Partial<SupportTicket>): Promise<SupportTicket> {
  const newTicket: SupportTicket = {
    id: ticket.id || `TCK-${Math.floor(1000 + Math.random() * 9000)}`,
    campanaLeaderId: ticket.campanaLeaderId || '',
    campanaLeaderName: ticket.campanaLeaderName || '',
    campanaTerritory: ticket.campanaTerritory || 'General',
    campanaUserEmail: ticket.campanaUserEmail || '',
    subject: ticket.subject || 'Sin Asunto',
    category: ticket.category || 'soporte_tecnico',
    priority: ticket.priority || 'media',
    status: 'abierto',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: ticket.messages || [],
  };

  try {
    const res = await fetch(`${API_BASE}/api/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTicket),
    });
    if (res.ok) {
      const saved = await res.json();
      const local = getLocalTickets();
      saveLocalTickets([saved, ...local.filter(t => t.id !== saved.id)]);
      return saved;
    }
  } catch (err) {
    console.warn('Fallo guardando ticket en servidor, usando modo local:', err);
  }

  const local = getLocalTickets();
  saveLocalTickets([newTicket, ...local]);
  return newTicket;
}

export async function addTicketMessageApi(
  ticketId: string, 
  message: { senderId: string; senderName: string; senderRole: 'superadmin' | 'campana'; message: string },
  newStatus?: string
): Promise<SupportTicket | null> {
  try {
    const res = await fetch(`${API_BASE}/api/tickets/${ticketId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, newStatus }),
    });
    if (res.ok) {
      const updated = await res.json();
      const local = getLocalTickets();
      saveLocalTickets(local.map(t => t.id === ticketId ? updated : t));
      return updated;
    }
  } catch (err) {
    console.warn('Fallo enviando mensaje en servidor, aplicando en memoria:', err);
  }

  // Fallback local
  const local = getLocalTickets();
  const ticket = local.find(t => t.id === ticketId);
  if (!ticket) return null;

  const newMsg: TicketMessage = {
    id: `msg-${Date.now()}`,
    senderId: message.senderId,
    senderName: message.senderName,
    senderRole: message.senderRole,
    message: message.message,
    createdAt: new Date().toISOString(),
  };

  ticket.messages.push(newMsg);
  if (newStatus && ['abierto', 'en_proceso', 'resuelto', 'cerrado'].includes(newStatus)) {
    ticket.status = newStatus as any;
  }
  ticket.updatedAt = new Date().toISOString();
  saveLocalTickets(local);
  return ticket;
}

export async function updateTicketStatusApi(ticketId: string, status: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/tickets/${ticketId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const local = getLocalTickets();
      const idx = local.findIndex(t => t.id === ticketId);
      if (idx !== -1) {
        local[idx].status = status as any;
        local[idx].updatedAt = new Date().toISOString();
        saveLocalTickets(local);
      }
      return true;
    }
  } catch (err) {
    console.warn('Fallo actualizando estatus ticket:', err);
  }

  const local = getLocalTickets();
  const t = local.find(x => x.id === ticketId);
  if (t) {
    t.status = status as any;
    t.updatedAt = new Date().toISOString();
    saveLocalTickets(local);
    return true;
  }
  return false;
}
