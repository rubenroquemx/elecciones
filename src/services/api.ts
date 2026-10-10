import type { TerritorialLeader } from '../types/territory';
import type { ElectoralSection, SectionStructure } from '../types/sections';
import { INITIAL_SECTIONS } from '../data/mockSectionsData';
import { authFetch } from './http';

const API_BASE = ''; // Relative to origin in production or proxy

export async function fetchLeadersApi(): Promise<TerritorialLeader[]> {
  try {
    const res = await authFetch(`${API_BASE}/api/leaders`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data)) {
      return data;
    }
    return [];
  } catch (err) {
    console.warn('API backend no disponible o falló:', err);
    return [];
  }
}

export async function saveLeaderApi(leader: TerritorialLeader, isExisting: boolean): Promise<TerritorialLeader> {
  try {
    const method = isExisting ? 'PUT' : 'POST';
    const url = isExisting ? `${API_BASE}/api/leaders/${leader.id}` : `${API_BASE}/api/leaders`;
    const res = await authFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(leader),
    });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Fallo guardado en backend, operando en memoria:', err);
    return leader;
  }
}

export async function deleteLeaderApi(id: string): Promise<boolean> {
  try {
    const res = await authFetch(`${API_BASE}/api/leaders/${id}`, { method: 'DELETE' });
    return res.ok;
  } catch (err) {
    console.warn('Fallo eliminación en backend, operando en memoria:', err);
    return true;
  }
}

export async function restoreLeaderApi(id: string): Promise<boolean> {
  try {
    const res = await authFetch(`${API_BASE}/api/leaders/${id}/restore`, { method: 'POST' });
    return res.ok;
  } catch (err) {
    console.warn('Fallo restauración en backend:', err);
    return false;
  }
}

export async function fetchDeletedLeaderIdsApi(): Promise<string[]> {
  try {
    const res = await authFetch(`${API_BASE}/api/deleted-leaders`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    return [];
  }
}

export async function fetchSectionsApi(): Promise<ElectoralSection[]> {
  try {
    const res = await authFetch(`${API_BASE}/api/sections`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
    return INITIAL_SECTIONS;
  } catch (err) {
    console.warn('API de secciones no disponible, usando datos base:', err);
    return INITIAL_SECTIONS;
  }
}

export async function saveSectionApi(section: ElectoralSection): Promise<ElectoralSection> {
  try {
    const res = await authFetch(`${API_BASE}/api/sections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(section),
    });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Fallo al guardar sección en backend:', err);
    return section;
  }
}

export async function addStructureApi(sectionId: string, structure: SectionStructure): Promise<SectionStructure> {
  try {
    const res = await authFetch(`${API_BASE}/api/sections/${sectionId}/structures`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(structure),
    });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Fallo al agregar estructura en backend:', err);
    return structure;
  }
}

export async function fetchUserAccountsApi(): Promise<any[]> {
  try {
    const res = await authFetch(`${API_BASE}/api/accounts`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('Fallo al obtener cuentas en backend:', err);
    return [];
  }
}

export async function saveUserAccountApi(account: any): Promise<any> {
  try {
    const res = await authFetch(`${API_BASE}/api/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(account),
    });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Fallo al guardar cuenta en backend:', err);
    return account;
  }
}

export async function deleteUserAccountApi(id: string): Promise<boolean> {
  try {
    const res = await authFetch(`${API_BASE}/api/accounts/${id}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch (err) {
    console.warn('Fallo al eliminar cuenta en backend:', err);
    return false;
  }
}

export async function resetPasswordApi(
  accountId: string,
  userPayload?: {
    email?: string;
    username?: string;
    name?: string;
    leaderId?: string;
    level?: string;
    territoryName?: string;
    phone?: string;
    role?: string;
  }
): Promise<{ success: boolean; temporaryPassword?: string; error?: string }> {
  try {
    const res = await authFetch(`${API_BASE}/api/accounts/${encodeURIComponent(accountId)}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userPayload || {}),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData.error || `Error ${res.status}` };
    }
    return await res.json();
  } catch (err: any) {
    console.warn('Fallo al restablecer contraseña en backend:', err);
    return { success: false, error: err.message };
  }
}

export async function impersonateUserApi(accountId?: string, leaderId?: string | null): Promise<{ user: any; token: string } | null> {
  try {
    const res = await authFetch(`${API_BASE}/api/auth/impersonate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId, leaderId }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Obtener perfil verificado del usuario autenticado
export async function fetchCurrentUserProfileApi(): Promise<{ success: boolean; user?: any; error?: string }> {
  try {
    const res = await authFetch(`${API_BASE}/api/auth/me`);
    if (!res.ok) {
      return { success: false, error: `Error ${res.status}` };
    }
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Actualizar perfil de usuario
export async function updateUserProfileApi(userData: any): Promise<{ success: boolean; user?: any; error?: string }> {
  try {
    const res = await authFetch(`${API_BASE}/api/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData.error || `Error ${res.status}` };
    }
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Solicitar código OTP por WhatsApp
export async function sendProfileOtpApi(phone?: string): Promise<{ success: boolean; method?: string; message?: string; waLink?: string; maskedPhone?: string; error?: string }> {
  try {
    const res = await authFetch(`${API_BASE}/api/auth/profile/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || `Error ${res.status}` };
    }
    return data;
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Cambiar contraseña con código OTP o Contraseña Actual
export async function resetProfilePasswordApi(payload: {
  currentPassword?: string;
  otpCode?: string;
  newPassword: string;
}): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await authFetch(`${API_BASE}/api/auth/profile/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || `Error ${res.status}` };
    }
    return data;
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Obtener configuración de Evolution API
export async function getWhatsAppConfigApi(): Promise<any> {
  try {
    const res = await authFetch(`${API_BASE}/api/whatsapp/config`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Guardar configuración de Evolution API
export async function saveWhatsAppConfigApi(config: any): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await authFetch(`${API_BASE}/api/whatsapp/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Obtener QR o conectar instancia Evolution API
export async function connectWhatsAppInstanceApi(): Promise<any> {
  try {
    const res = await authFetch(`${API_BASE}/api/whatsapp/instance/connect`, {
      method: 'POST',
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Estado de la instancia Evolution API
export async function getWhatsAppInstanceStatusApi(): Promise<any> {
  try {
    const res = await authFetch(`${API_BASE}/api/whatsapp/instance/status`);
    if (!res.ok) return { isConnected: false, state: 'close' };
    return await res.json();
  } catch {
    return { isConnected: false, state: 'error' };
  }
}

// Desconectar instancia Evolution API
export async function disconnectWhatsAppInstanceApi(): Promise<any> {
  try {
    const res = await authFetch(`${API_BASE}/api/whatsapp/instance/disconnect`, {
      method: 'POST',
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Enviar mensaje de prueba Evolution API
export async function sendWhatsAppTestMessageApi(number: string, message?: string): Promise<any> {
  try {
    const res = await authFetch(`${API_BASE}/api/whatsapp/test-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number, message }),
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
