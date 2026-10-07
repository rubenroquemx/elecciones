export interface TicketMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'superadmin' | 'campana';
  message: string;
  createdAt: string;
}

export type TicketPriority = 'baja' | 'media' | 'alta' | 'urgente';
export type TicketStatus = 'abierto' | 'en_proceso' | 'resuelto' | 'cerrado';
export type TicketCategory = 'soporte_tecnico' | 'solicitud_secciones' | 'capacitacion' | 'incidencia_campo' | 'facturacion' | 'otro';

export interface SupportTicket {
  id: string;
  campanaLeaderId: string;
  campanaLeaderName: string;
  campanaTerritory: string;
  campanaUserEmail: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
}
