// Cliente HTTP con autenticación Bearer y manejo automático de sesiones expiradas

export const AUTH_TOKEN_KEY = 'territorial_auth_token';

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string): void {
  try {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch {}
}

export function removeAuthToken(): void {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {}
}

/**
 * Wrapper de fetch que inyecta automáticamente el token JWT en el encabezado Authorization.
 * Si el servidor responde 401 (no autorizado / token expirado), limpia la sesión y despacha un evento para redirigir al login.
 */
export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(init?.headers);

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(input, {
    ...init,
    headers,
  });

  if (res.status === 401) {
    const urlStr = typeof input === 'string' ? input : input.toString();
    // No cerrar sesión si el 401 proviene del formulario de login
    if (!urlStr.includes('/api/auth/login')) {
      removeAuthToken();
      try {
        localStorage.removeItem('territorial_auth_user');
      } catch {}
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('territorial:unauthorized'));
      }
    }
  }

  return res;
}
