import React, { useState, useMemo, useCallback, useEffect, lazy, Suspense } from 'react';
import type { TerritorialLeader, FilterOptions } from './types/territory';
import type { ElectoralSection, SectionStructure } from './types/sections';
import type { UserAccount } from './types/auth';
import { INITIAL_SECTIONS, CATALOG_BY_SECTION } from './data/mockSectionsData';
import { MOCK_ACCOUNTS } from './data/mockAuthData';
import { 
  calculateHierarchyAggregates, 
  getHierarchyStats, 
  filterNodes, 
  exportToCSV,
  getVisibleSubtree
} from './utils/hierarchy';
import { Sidebar, type MainNavSection, type StructureMode } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { NodeDetailDrawer } from './components/NodeDetailDrawer';
import { EditLeaderModal } from './components/EditLeaderModal';
import { LevelSummaryBar } from './components/LevelSummaryBar';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { QuickFieldCaptureModal } from './components/QuickFieldCaptureModal';
import { ClosedSystemLoginScreen } from './components/ClosedSystemLoginScreen';
import { CreateManualUserModal } from './components/CreateManualUserModal';
import { PromoterNotificationsModal } from './components/PromoterNotificationsModal';
import { CampanaTicketsModal } from './components/CampanaTicketsModal';
import { ConfiguracionPage } from './components/ConfiguracionPage';
import { AcercaDePlaceholderPage } from './components/AcercaDePlaceholderPage';

// Code-split heavy views via React.lazy for optimal initial bundle size and PWA responsiveness
const TerritoryFlowCanvas = lazy(() => import('./components/TerritoryFlowCanvas').then(m => ({ default: m.TerritoryFlowCanvas })));
const DirectoryTableView = lazy(() => import('./components/DirectoryTableView').then(m => ({ default: m.DirectoryTableView })));
const SectionsCatalogView = lazy(() => import('./components/SectionsCatalogView').then(m => ({ default: m.SectionsCatalogView })));
const ExecutiveKpiDesktop = lazy(() => import('./components/ExecutiveKpiDesktop').then(m => ({ default: m.ExecutiveKpiDesktop })));
const SectionDetailPage = lazy(() => import('./components/SectionDetailPage').then(m => ({ default: m.SectionDetailPage })));
const TerritorialPromotersAdminView = lazy(() => import('./components/TerritorialPromotersAdminView').then(m => ({ default: m.TerritorialPromotersAdminView })));
const TerritorialPromoterCreatePage = lazy(() => import('./components/TerritorialPromoterCreatePage').then(m => ({ default: m.TerritorialPromoterCreatePage })));
const TerritorialPromoterEditPage = lazy(() => import('./components/TerritorialPromoterEditPage').then(m => ({ default: m.TerritorialPromoterEditPage })));
const PromoterCitizenCapturePage = lazy(() => import('./components/PromoterCitizenCapturePage').then(m => ({ default: m.PromoterCitizenCapturePage })));
const PromoterCitizenDetailPage = lazy(() => import('./components/PromoterCitizenDetailPage').then(m => ({ default: m.PromoterCitizenDetailPage })));
const PromoterCitizenEditPage = lazy(() => import('./components/PromoterCitizenEditPage').then(m => ({ default: m.PromoterCitizenEditPage })));
const PromoterSectionsMapView = lazy(() => import('./components/PromoterSectionsMapView').then(m => ({ default: m.PromoterSectionsMapView })));
const SuperadminSaasDashboard = lazy(() => import('./components/SuperadminSaasDashboard').then(m => ({ default: m.SuperadminSaasDashboard })));
const CreateCampanaCoordinatorWizardPage = lazy(() => import('./components/CreateCampanaCoordinatorWizardPage').then(m => ({ default: m.CreateCampanaCoordinatorWizardPage })));
const TerritorialCoordinatorsAdminPage = lazy(() => import('./components/TerritorialCoordinatorsAdminPage').then(m => ({ default: m.TerritorialCoordinatorsAdminPage })));
const CampanaCoordinatorDetailPage = lazy(() => import('./components/CampanaCoordinatorDetailPage').then(m => ({ default: m.CampanaCoordinatorDetailPage })));
const CampanaCoordinatorEditPage = lazy(() => import('./components/CampanaCoordinatorEditPage').then(m => ({ default: m.CampanaCoordinatorEditPage })));
const SuperadminTicketsPage = lazy(() => import('./components/SuperadminTicketsPage').then(m => ({ default: m.SuperadminTicketsPage })));
const SubordinateCreatePage = lazy(() => import('./components/SubordinateCreatePage').then(m => ({ default: m.SubordinateCreatePage })));
const UserDetailPage = lazy(() => import('./components/UserDetailPage').then(m => ({ default: m.UserDetailPage })));
import { Users, Bell, CheckCircle2, X, MapPin, ShieldAlert, ArrowLeft, BarChart3, LifeBuoy, Settings } from 'lucide-react';
import type { ExtractedINEData } from './utils/ineScanner';
import { getStateById, DEFAULT_STATE_ID, DEFAULT_STATE } from './data/statesData';
import {
  fetchLeadersApi,
  saveLeaderApi,
  deleteLeaderApi,
  fetchDeletedLeaderIdsApi,
  fetchSectionsApi,
  saveSectionApi,
  addStructureApi,
  fetchUserAccountsApi,
  saveUserAccountApi,
  deleteUserAccountApi,
  impersonateUserApi,
} from './services/api';
import { getAuthToken, setAuthToken } from './services/http';

const DELETED_LEADERS_KEY = 'territorial_deleted_leader_ids';
const PENDING_OFFLINE_KEY = 'territorial_pending_offline_sync_ids';

function getLocalDeletedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_LEADERS_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch (e) {}
  return new Set();
}

function saveLocalDeletedId(id: string) {
  try {
    const set = getLocalDeletedIds();
    set.add(id);
    localStorage.setItem(DELETED_LEADERS_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {}
}

function saveLocalDeletedIds(ids: string[]) {
  try {
    const set = getLocalDeletedIds();
    let changed = false;
    ids.forEach(id => {
      if (!set.has(id)) {
        set.add(id);
        changed = true;
      }
    });
    if (changed) {
      localStorage.setItem(DELETED_LEADERS_KEY, JSON.stringify(Array.from(set)));
    }
  } catch (e) {}
}

function unmarkLocalDeletedId(id: string) {
  try {
    const set = getLocalDeletedIds();
    if (set.has(id)) {
      set.delete(id);
      localStorage.setItem(DELETED_LEADERS_KEY, JSON.stringify(Array.from(set)));
    }
  } catch (e) {}
}

function getPendingOfflineIds(): Set<string> {
  try {
    const raw = localStorage.getItem(PENDING_OFFLINE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch (e) {}
  return new Set();
}

function markPendingOfflineId(id: string) {
  try {
    const set = getPendingOfflineIds();
    set.add(id);
    localStorage.setItem(PENDING_OFFLINE_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {}
}

function clearPendingOfflineId(id: string) {
  try {
    const set = getPendingOfflineIds();
    if (set.has(id)) {
      set.delete(id);
      localStorage.setItem(PENDING_OFFLINE_KEY, JSON.stringify(Array.from(set)));
    }
  } catch (e) {}
}

export function App() {
  // Master raw and computed territorial dataset
  const [leadersData, setLeadersData] = useState<TerritorialLeader[]>(() => {
    const deletedSet = getLocalDeletedIds();
    try {
      const saved = localStorage.getItem('territorial_leaders_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const map = new Map<string, TerritorialLeader>(
            parsed
              .filter((l: TerritorialLeader) => !deletedSet.has(l.id))
              .map((l: TerritorialLeader) => [l.id, l])
          );
          // Vincular promovidos huérfanos dinámicamente al promotor responsable de su sección
          map.forEach(l => {
            if (l.level === 'promovido' && (!l.parentId || l.parentId === 'null')) {
              const matchingPromoter = Array.from(map.values()).find(p =>
                p.level === 'promotor' &&
                (
                  (Boolean(l.electoralSection) && Array.isArray(p.assignedSections) && p.assignedSections.includes(l.electoralSection!)) ||
                  p.electoralSection === l.electoralSection
                )
              );
              if (matchingPromoter) {
                l.parentId = matchingPromoter.id;
              }
            }
          });
          return calculateHierarchyAggregates(Array.from(map.values()));
        }
      }
    } catch (e) {
      console.warn('Error reading saved leaders', e);
    }
    return [];
  });

  // Sincronización bidireccional continua en tiempo real (móvil <-> servidor central <-> PC)
  const syncLeadersWithServer = useCallback(async () => {
    try {
      const [serverLeaders, serverDeletedIds] = await Promise.all([
        fetchLeadersApi(),
        fetchDeletedLeaderIdsApi(),
      ]);

      // 1. Guardar bajas provenientes del servidor
      if (serverDeletedIds && serverDeletedIds.length > 0) {
        saveLocalDeletedIds(serverDeletedIds);
      }

      // 2. Si este cliente tiene IDs eliminados localmente que el servidor no tiene, avisar al servidor
      const serverDeletedSet = new Set(serverDeletedIds || []);
      const localDeletedIds = Array.from(getLocalDeletedIds());
      const missingOnServer = localDeletedIds.filter(id => !serverDeletedSet.has(id));
      if (missingOnServer.length > 0) {
        missingOnServer.forEach(id => {
          deleteLeaderApi(id).catch(() => {});
        });
      }

      const currentDeletedSet = getLocalDeletedIds();

      if (!serverLeaders || serverLeaders.length === 0) {
        setLeadersData(prev => {
          const filtered = prev.filter(l => !currentDeletedSet.has(l.id));
          try {
            localStorage.setItem('territorial_leaders_data', JSON.stringify(filtered));
          } catch (e) {}
          return calculateHierarchyAggregates(filtered);
        });
        return;
      }

      setLeadersData(prev => {
        const deletedSet = getLocalDeletedIds();
        const combinedMap = new Map<string, TerritorialLeader>();

        // 1. Líderes de la base de datos real del servidor (con normalización de promovidos y omitiendo eliminados)
        for (const s of serverLeaders) {
          if (deletedSet.has(s.id)) continue;
          const item = { ...s };
          if (item.level === 'promovido' && (!item.parentId || item.parentId === 'null')) {
            const matchingPromoter = Array.from(combinedMap.values()).find(p =>
              p.level === 'promotor' &&
              (
                (Boolean(item.electoralSection) && Array.isArray(p.assignedSections) && p.assignedSections.includes(item.electoralSection!)) ||
                p.electoralSection === item.electoralSection
              )
            );
            if (matchingPromoter) {
              item.parentId = matchingPromoter.id;
            }
          }
          combinedMap.set(item.id, item);
        }

        // 3. Registros locales pendientes (ÚNICAMENTE capturas creadas localmente offline que aún no han subido)
        const pendingOfflineIds = getPendingOfflineIds();
        const serverIds = new Set(serverLeaders.map(l => l.id));
        const localPending = prev.filter(l => 
          !deletedSet.has(l.id) &&
          !serverIds.has(l.id) && 
          pendingOfflineIds.has(l.id)
        );

        if (localPending.length > 0) {
          localPending.forEach(localLeader => {
            const safeLeader = {
              ...localLeader,
              parentId: localLeader.parentId || (currentUser?.level === 'promotor' ? currentUser.leaderId : null) || null,
            };
            combinedMap.set(safeLeader.id, safeLeader);
            saveLeaderApi(safeLeader, false)
              .then(() => clearPendingOfflineId(safeLeader.id))
              .catch(e => console.warn('Sync pending record error:', e));
          });
        }

        const combined = Array.from(combinedMap.values()).filter(l => !deletedSet.has(l.id));

        const prevMap = new Map(prev.map(p => [p.id, p]));
        let hasChanges = combined.length !== prev.length;
        if (!hasChanges) {
          for (const item of combined) {
            const ex = prevMap.get(item.id);
            if (!ex || ex.name !== item.name || ex.phone !== item.phone || ex.parentId !== item.parentId || ex.updatedAt !== item.updatedAt) {
              hasChanges = true;
              break;
            }
          }
        }

        if (!hasChanges) return prev;

        try {
          localStorage.setItem('territorial_leaders_data', JSON.stringify(combined));
        } catch (e) {
          console.warn('Error saving synced leaders to localStorage', e);
        }
        return calculateHierarchyAggregates(combined);
      });
    } catch (e) {
      console.warn('Error sincronizando con servidor:', e);
    }
  }, []);

  useEffect(() => {
    syncLeadersWithServer();

    // Sincronización automática periódica (cada 30 seg) pausando si la pestaña está oculta
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'hidden') {
        syncLeadersWithServer();
      }
    }, 30000);

    const handleSyncTrigger = () => {
      if (typeof document === 'undefined' || document.visibilityState !== 'hidden') {
        syncLeadersWithServer();
      }
    };
    window.addEventListener('focus', handleSyncTrigger);
    document.addEventListener('visibilitychange', handleSyncTrigger);

    fetchSectionsApi().then((data) => {
      if (data && data.length > 0) {
        setSectionsData(prev => {
          const apiMap = new Map(data.map(s => [s.sectionNumber, s]));
          return prev.map(current => {
            const apiSec = apiMap.get(current.sectionNumber);
            if (!apiSec) return current;
            const existingIds = new Set((current.structures || []).map(st => st.id));
            const newFromApi = (apiSec.structures || []).filter(st => !existingIds.has(st.id));
            return {
              ...apiSec,
              ...current,
              structures: [...(current.structures || []), ...newFromApi],
            };
          });
        });
      }
    });

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleSyncTrigger);
      document.removeEventListener('visibilitychange', handleSyncTrigger);
    };
  }, [syncLeadersWithServer]);

  // Ensure root URL without /state slugs and clean legacy cache
  useEffect(() => {
    if (window.location.pathname !== '/' && window.location.pathname !== '') {
      window.history.replaceState(null, '', '/');
    }
    try {
      const savedAuth = localStorage.getItem('territorial_auth_user');
      if (savedAuth && (
        savedAuth.includes('estrategia-territorial.mx') || 
        savedAuth.includes('usr-prom-ruben-roque')
      )) {
        localStorage.removeItem('territorial_auth_user');
      }

      const savedCustom = localStorage.getItem('territorial_custom_accounts');
      if (savedCustom && (
        savedCustom.includes('estrategia-territorial.mx') || 
        savedCustom.includes('usr-prom-ruben-roque')
      )) {
        const parsed = JSON.parse(savedCustom);
        const filtered = Array.isArray(parsed) 
          ? parsed.filter((a: any) => !a.email?.includes('estrategia-territorial.mx') && a.id !== 'usr-prom-ruben-roque') 
          : [];
        localStorage.setItem('territorial_custom_accounts', JSON.stringify(filtered));
      }

      const savedLeaders = localStorage.getItem('territorial_leaders_data');
      if (savedLeaders && (
        savedLeaders.includes('coord-campana-carlos') ||
        savedLeaders.includes('coord-terri-fernando') ||
        savedLeaders.includes('prom-patricia-lara') ||
        savedLeaders.includes('prom-ruben-roque') ||
        savedLeaders.includes('Lic. Carlos') ||
        savedLeaders.includes('Elena Ramos')
      )) {
        localStorage.removeItem('territorial_leaders_data');
      }

      const reg = localStorage.getItem('territorial_elector_registry');
      if (reg && (reg.includes('Elena Ramos') || reg.includes('Fernando May') || reg.includes('Carlos Eduardo') || reg.includes('pmv-'))) {
        localStorage.removeItem('territorial_elector_registry');
      }
    } catch (e) {
      console.warn('Error purging legacy cache', e);
    }
  }, []);

  // User accounts: Super Administrador (desde env) + cuentas creadas en el sistema
  const [accounts, setAccounts] = useState<UserAccount[]>(() => {
    try {
      const saved = localStorage.getItem('territorial_custom_accounts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const legacyDemoIds = new Set([
            'usr-coord-distrital', 'usr-coord-zona', 
            'usr-resp-zona', 'usr-resp-seccion', 'usr-promotor',
            'usr-prom-ruben-roque', 'usr-coord-estatal', 'usr-coord-seccional'
          ]);
          const cleaned = parsed
            .filter((a: UserAccount) => 
              !legacyDemoIds.has(a.id) &&
              !a.email?.includes('estrategia-territorial.mx') &&
              a.email !== 'admin@estrategia-territorial.mx'
            );
          try {
            localStorage.setItem('territorial_custom_accounts', JSON.stringify(cleaned));
          } catch {}
          const savedIds = new Set(cleaned.map((a: UserAccount) => a.id));
          const missingMock = MOCK_ACCOUNTS.filter(a => !savedIds.has(a.id));
          return [...missingMock, ...cleaned];
        }
      }
    } catch (e) {
      console.warn('Error reading saved custom accounts', e);
    }
    return MOCK_ACCOUNTS;
  });

  // Authenticated user in closed system (requiere credenciales si no hay sesión guardada)
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    try {
      const saved = localStorage.getItem('territorial_auth_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed) {
          if (
            parsed.id === 'usr-prom-ruben-roque' || 
            parsed.email?.includes('estrategia-territorial.mx') ||
            (parsed.id === 'usr-admin' && parsed.email !== 'usrubenroqueguzman@gmail.com')
          ) {
            localStorage.removeItem('territorial_auth_user');
            return null;
          }
          return parsed;
        } else {
          localStorage.removeItem('territorial_auth_user');
        }
      }
    } catch (e) {
      console.error('Error loading saved auth user', e);
    }
    return null;
  });

  // Listener para cerrar sesión automática si el servidor responde 401
  useEffect(() => {
    const handleUnauthorized = () => {
      setCurrentUser(null);
    };
    window.addEventListener('territorial:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('territorial:unauthorized', handleUnauthorized);
  }, []);

  const handleSelectUser = useCallback((user: UserAccount) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('territorial_auth_user', JSON.stringify(user));
    } catch (e) {
      console.error('Error saving user in localStorage', e);
    }
    // Refresh automático inmediato al cambiar de usuario
    window.location.reload();
  }, []);

  const handleLogout = useCallback(() => {
    try {
      localStorage.removeItem('territorial_auth_user');
      localStorage.removeItem('territorial_auth_token');
    } catch (e) {
      console.error('Error removing auth user', e);
    }
    setCurrentUser(null);
    // Refresh automático inmediato al cerrar sesión
    window.location.reload();
  }, []);

  // Modal de Alta Manual de Usuario
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);

  // Estados SaaS Superadmin: Impersonación de sesión ("Entrar a su cuenta") y Tickets
  const [impersonatingAdminUser, setImpersonatingAdminUser] = useState<UserAccount | null>(() => {
    try {
      const saved = sessionStorage.getItem('saas_impersonating_admin');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });

  const [isCampanaTicketsModalOpen, setIsCampanaTicketsModalOpen] = useState(false);

  // Carga inicial y sincronización de cuentas de usuario desde el servidor (PostgreSQL)
  useEffect(() => {
    fetchUserAccountsApi()
      .then(serverAccounts => {
        const serverList = Array.isArray(serverAccounts) ? serverAccounts : [];
        const serverIds = new Set(serverList.map((a: any) => a.id));
        const serverEmails = new Set(serverList.map((a: any) => String(a.email || '').toLowerCase()));

        // Sincronizar hacia el servidor cualquier cuenta local que no esté en PostgreSQL
        try {
          const rawLocal = localStorage.getItem('territorial_custom_accounts');
          if (rawLocal) {
            const parsedLocal = JSON.parse(rawLocal);
            if (Array.isArray(parsedLocal)) {
              parsedLocal.forEach((locAcc: UserAccount) => {
                const locEmail = String(locAcc.email || '').toLowerCase();
                if (!serverIds.has(locAcc.id) && !serverEmails.has(locEmail)) {
                  saveUserAccountApi(locAcc).catch(() => {});
                }
              });
            }
          }
        } catch {}

        if (serverList.length > 0) {
          setAccounts(prev => {
            const map = new Map<string, UserAccount>();
            prev.forEach(a => map.set(a.id, a));
            serverList.forEach(a => {
              const existing = map.get(a.id);
              map.set(a.id, { ...existing, ...a, password: existing?.password || a.password });
            });
            const merged = Array.from(map.values());
            try {
              localStorage.setItem('territorial_custom_accounts', JSON.stringify(merged));
            } catch (e) {}
            return merged;
          });
        }
      })
      .catch(e => console.warn('Could not fetch server accounts', e));
  }, []);

  const handleImpersonate = useCallback(async (coordinatorAccount: UserAccount) => {
    if (currentUser) {
      setImpersonatingAdminUser(currentUser);
      sessionStorage.setItem('saas_impersonating_admin', JSON.stringify(currentUser));
      const currentToken = getAuthToken();
      if (currentToken) {
        sessionStorage.setItem('saas_admin_auth_token', currentToken);
      }
    }

    try {
      const impRes = await impersonateUserApi(coordinatorAccount.id, coordinatorAccount.leaderId);
      if (impRes?.token) {
        setAuthToken(impRes.token);
        const resolvedUser = { ...coordinatorAccount, ...impRes.user };
        setCurrentUser(resolvedUser);
        localStorage.setItem('territorial_auth_user', JSON.stringify(resolvedUser));
      } else {
        setCurrentUser(coordinatorAccount);
        localStorage.setItem('territorial_auth_user', JSON.stringify(coordinatorAccount));
      }
    } catch {
      setCurrentUser(coordinatorAccount);
      try {
        localStorage.setItem('territorial_auth_user', JSON.stringify(coordinatorAccount));
      } catch (e) {}
    }

    setActiveNav('escritorio');
  }, [currentUser]);

  const handleExitImpersonation = useCallback(() => {
    if (impersonatingAdminUser) {
      const adminToken = sessionStorage.getItem('saas_admin_auth_token');
      if (adminToken) {
        setAuthToken(adminToken);
      }
      setCurrentUser(impersonatingAdminUser);
      try {
        localStorage.setItem('territorial_auth_user', JSON.stringify(impersonatingAdminUser));
      } catch (e) {}
      setImpersonatingAdminUser(null);
      sessionStorage.removeItem('saas_impersonating_admin');
      sessionStorage.removeItem('saas_admin_auth_token');
      setActiveNav('escritorio');
    }
  }, [impersonatingAdminUser]);

  const handleSaveNewCoordinator = useCallback(async (leader: TerritorialLeader, account: UserAccount) => {
    const savedLeader = await saveLeaderApi(leader, false);
    await saveUserAccountApi(account);

    setLeadersData(prev => {
      const updated = [savedLeader, ...prev.filter(l => l.id !== savedLeader.id)];
      try {
        localStorage.setItem('territorial_leaders_data', JSON.stringify(updated));
      } catch (e) {}
      return calculateHierarchyAggregates(updated);
    });

    setAccounts(prev => {
      const updated = [account, ...prev.filter(a => a.id !== account.id)];
      try {
        localStorage.setItem('territorial_custom_accounts', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    setTopSuccessNotice(`¡Jefe de Campaña "${leader.name}" dado de alta con éxito!`);
  }, []);

  const handleSaveNewTerritorialCoordinator = useCallback(async (leader: TerritorialLeader, account: UserAccount) => {
    const savedLeader = await saveLeaderApi(leader, false);
    await saveUserAccountApi(account);

    setLeadersData(prev => {
      const updated = [savedLeader, ...prev.filter(l => l.id !== savedLeader.id)];
      try {
        localStorage.setItem('territorial_leaders_data', JSON.stringify(updated));
      } catch (e) {}
      return calculateHierarchyAggregates(updated);
    });

    setAccounts(prev => {
      const updated = [account, ...prev.filter(a => a.id !== account.id)];
      try {
        localStorage.setItem('territorial_custom_accounts', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    setTopSuccessNotice(`¡${leader.role} "${leader.name}" dado de alta con éxito!`);
    setActiveNav('usuarios');
  }, []);

  // Registered Electoral Sections with multi-structures
  const [sectionsData, setSectionsData] = useState<ElectoralSection[]>(() => {
    try {
      const saved = localStorage.getItem('territorial_user_sections');
      if (saved) {
        const parsed = JSON.parse(saved);
        const hasLegacy = Array.isArray(parsed) && parsed.some((s: any) => 
          (s.structures || []).some((st: any) => 
            st.leaderName?.includes('Elena Ramos') || 
            st.leaderName?.includes('Fernando May') ||
            st.leaderName?.includes('Carlos Eduardo')
          )
        );
        if (hasLegacy) {
          localStorage.removeItem('territorial_user_sections');
        } else if (Array.isArray(parsed) && parsed.length > 0) {
          const map = new Map(parsed.map((s: ElectoralSection) => [s.sectionNumber, s]));
          return INITIAL_SECTIONS.map(s => {
            const userSec = map.get(s.sectionNumber);
            if (!userSec) return s;

            // Preserve initial registered structures from base dataset
            const savedStructures = userSec.structures || [];
            const savedIds = new Set(savedStructures.map((st: SectionStructure) => st.id));
            const missingBase = (s.structures || []).filter(st => !savedIds.has(st.id));
            const finalStructures = [...savedStructures, ...missingBase];

            return {
              ...s,
              ...userSec,
              structures: finalStructures.length > 0 ? finalStructures : (s.structures || []),
            };
          });
        }
      }
    } catch (e) {
      console.warn('Error reading saved sections', e);
    }
    return INITIAL_SECTIONS;
  });

  // Strict information access scoping for sections (RBAC):
  // 1. Super Administrador: acceso total a todas las secciones del estado
  // 2. Coordinador de Campaña: ve en el mapa únicamente el distrito, municipio o estado asignado
  // 3. Coordinador Territorial: ve en el mapa únicamente la o las secciones que tiene asignadas
  // 4. Promotor Territorial: no tiene acceso a maps ni secciones
  const scopedSections = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.isSuperAdmin || currentUser.level === 'admin') {
      return sectionsData;
    }
    if (currentUser.level === 'campana' || currentUser.level === 'estatal' || currentUser.level === 'distrital') {
      const match = currentUser.territoryName.match(/\b(?:distrito|dto)?\s*(?:local|federal)?\s*0*(\d+)\b/i);
      const distNum = match ? parseInt(match[1], 10) : 6;

      return sectionsData.filter(sec => {
        const cat = CATALOG_BY_SECTION.get(sec.sectionNumber);
        if (!cat) return true;
        return cat.localDistrict === distNum;
      });
    }
    if (currentUser.level === 'territorial' || currentUser.level === 'seccional') {
      const leaderNode = leadersData.find(l => l.id === currentUser.leaderId);
      const assigned = (currentUser.assignedSections && currentUser.assignedSections.length > 0)
        ? currentUser.assignedSections
        : (leaderNode?.assignedSections && leaderNode.assignedSections.length > 0)
          ? leaderNode.assignedSections
          : (currentUser.territoryName?.match(/\b\d{3,4}\b/g) || ['0416', '0417']);
      return sectionsData.filter(s => assigned.includes(s.sectionNumber));
    }
    if (currentUser.level === 'promotor') {
      // Promotor no tiene acceso a mapas ni catálogo de secciones
      return [];
    }
    return sectionsData;
  }, [currentUser, sectionsData]);

  // Secciones disponibles para modales de captura (asegura secciones asignadas para cualquier promotor)
  const captureAvailableSections: ElectoralSection[] = useMemo(() => {
    if (scopedSections.length > 0) return scopedSections;
    if (currentUser?.level === 'promotor') {
      const leaderNode = leadersData.find(l => l.id === currentUser.leaderId);
      const assigned = (currentUser.assignedSections && currentUser.assignedSections.length > 0)
        ? currentUser.assignedSections
        : (leaderNode?.assignedSections && leaderNode.assignedSections.length > 0)
          ? leaderNode.assignedSections
          : (currentUser.territoryName?.match(/\b\d{3,4}\b/g) || ['0416']);

      const matched = sectionsData.filter(s => assigned.includes(s.sectionNumber));
      if (matched.length > 0) return matched;
      return assigned.map(secNum => {
        const fromBase = INITIAL_SECTIONS.find(s => s.sectionNumber === secNum);
        if (fromBase) return fromBase;
        return {
          id: `sec-${secNum}`,
          sectionNumber: secNum,
          municipio: 'Centro',
          municipioId: 'MUN-004',
          distritoLocal: 'Distrito 06',
          tipo: 'Urbana' as const,
          nominalList: 2450,
          targetGoal: 150,
          structures: [],
          center: [-92.93, 17.98] as [number, number],
          bbox: [-92.95, 17.96, -92.91, 18.00] as [number, number, number, number],
          polygon: [],
        };
      });
    }
    return sectionsData;
  }, [scopedSections, currentUser, leadersData, sectionsData]);

  // Collapsed branches state
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set<string>());

  // Selected leader for drawer inspection
  const [selectedLeaderId, setSelectedLeaderId] = useState<string | null>(null);
  const [detailSectionNumber, setDetailSectionNumber] = useState<string | null>(null);

  // Active State ID
  const [activeStateId, setActiveStateId] = useState<number>(DEFAULT_STATE_ID);

  const activeStateData = useMemo(() => {
    return getStateById(activeStateId) || DEFAULT_STATE;
  }, [activeStateId]);

  const handleStateChange = useCallback((stateId: number) => {
    setActiveStateId(stateId);
  }, []);

  // Active navigation: 'escritorio' | 'estructura' | 'secciones'
  const [activeNav, setActiveNav] = useState<MainNavSection>('escritorio');
  const [settingsInitialTab, setSettingsInitialTab] = useState<'mi-perfil' | 'whatsapp-evolution'>('mi-perfil');
  const [selectedCoordinatorDetailId, setSelectedCoordinatorDetailId] = useState<string | null>(null);
  const [editingCoordinatorId, setEditingCoordinatorId] = useState<string | null>(null);
  const [selectedUserDetailId, setSelectedUserDetailId] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const handleNavChange = useCallback((nav: MainNavSection) => {
    setActiveNav(nav);
    if (nav !== 'configuracion') {
      setSettingsInitialTab('mi-perfil');
    }
    setDetailSectionNumber(null);
    setSelectedCoordinatorDetailId(null);
    setEditingCoordinatorId(null);
    setSelectedUserDetailId(null);
    setEditingUserId(null);
  }, []);
  const [structureMode, setStructureMode] = useState<StructureMode>('organigrama');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('vertex_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleSidebarCollapse = useCallback(() => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('vertex_sidebar_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const handleSaveCoordinatorEdit = useCallback(async (updatedLeader: TerritorialLeader, updatedAccount?: UserAccount) => {
    await saveLeaderApi(updatedLeader, false);
    setLeadersData(prev => prev.map(l => l.id === updatedLeader.id ? updatedLeader : l));

    if (updatedAccount) {
      await saveUserAccountApi(updatedAccount);
      setAccounts(prev => prev.map(a => a.id === updatedAccount.id ? updatedAccount : a));
    }
    setTopSuccessNotice(`Coordinador "${updatedLeader.name}" actualizado correctamente.`);
    setTimeout(() => setTopSuccessNotice(null), 4000);
  }, []);

  const isSuperAdminUser = useMemo(() => {
    if (!currentUser) return false;
    return Boolean(
      currentUser.isSuperAdmin || 
      currentUser.level === 'admin' ||
      currentUser.accountRoleLabel?.toLowerCase().includes('super') ||
      currentUser.id === 'usr-superadmin' ||
      currentUser.id === 'usr-admin' ||
      currentUser.email?.toLowerCase().includes('usrubenroqueguzman')
    );
  }, [currentUser]);

  // RBAC Navigation restrictions:
  // Promotor has no access to maps, estructura, secciones -> lock to allowed promotor pages
  // Coordinador Territorial only sees lista de promotores -> lock mode to 'lista'
  useEffect(() => {
    if (!currentUser) return;

    if (isSuperAdminUser) {
      const allowedAdminPages: MainNavSection[] = ['escritorio', 'mesa-de-ayuda', 'usuarios', 'crear-coordinador', 'crear-coordinador-territorial', 'configuracion', 'acerca-de'];
      if (!allowedAdminPages.includes(activeNav)) {
        setActiveNav('escritorio');
      }
      return;
    }

    const allowedPromotorPages: MainNavSection[] = ['escritorio', 'mis-secciones', 'capturar-promovido', 'ver-promovido', 'editar-promovido', 'configuracion', 'acerca-de'];
    if (currentUser.level === 'promotor' && !allowedPromotorPages.includes(activeNav)) {
      setActiveNav('escritorio');
    }
    const isCampana = currentUser.level === 'campana' || currentUser.level === 'estatal';
    const allowedCampanaPages: MainNavSection[] = ['escritorio', 'usuarios', 'crear-coordinador-territorial', 'configuracion', 'acerca-de'];
    if (isCampana && !allowedCampanaPages.includes(activeNav)) {
      setActiveNav('escritorio');
    }
    const isMidLevel = currentUser.level === 'distrital' || currentUser.level === 'zona' || currentUser.level === 'responsable_zona';
    const allowedMidPages: MainNavSection[] = ['escritorio', 'usuarios', 'crear-coordinador-territorial', 'estructura', 'secciones', 'configuracion', 'acerca-de'];
    if (isMidLevel && !allowedMidPages.includes(activeNav)) {
      setActiveNav('escritorio');
    }
    const isTerritorial = currentUser.level === 'territorial' || currentUser.level === 'seccional';
    const allowedTerritorialPages: MainNavSection[] = ['escritorio', 'usuarios', 'crear-coordinador-territorial', 'promotores', 'crear-promotor', 'editar-promotor', 'secciones', 'configuracion', 'acerca-de'];
    if (isTerritorial && !allowedTerritorialPages.includes(activeNav)) {
      setActiveNav('escritorio');
    }
    if (currentUser.level === 'territorial' && structureMode === 'organigrama') {
      setStructureMode('lista');
    }
  }, [currentUser, activeNav, structureMode, isSuperAdminUser]);

  // Filters state
  const [filters, setFilters] = useState<FilterOptions>({
    searchQuery: '',
    levelFilter: 'all',
    statusFilter: 'all',
    validationFilter: 'all',
    focusNodeId: null,
  });

  // Edit / Add modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingLeader, setEditingLeader] = useState<TerritorialLeader | null>(null);

  // Quick field capture modal state
  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false);
  const [quickCaptureInitialData, setQuickCaptureInitialData] = useState<ExtractedINEData | null>(null);

  // Selected citizen for view / edit in promoter pages
  const [selectedPromovidoId, setSelectedPromovidoId] = useState<string | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [topSuccessNotice, setTopSuccessNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!topSuccessNotice) return;
    const timer = setTimeout(() => {
      setTopSuccessNotice(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [topSuccessNotice]);

  const handleOpenQuickCapture = useCallback((data?: ExtractedINEData) => {
    setQuickCaptureInitialData(data || null);
    if (currentUser?.level === 'promotor') {
      setActiveNav('capturar-promovido');
      return;
    }
    setIsQuickCaptureOpen(true);
  }, [currentUser]);

  // Selected promoter for editing in territorial coordinator views
  const [selectedEditPromoterId, setSelectedEditPromoterId] = useState<string | null>(null);

  // Global Omnibox Search state & Ctrl+K shortcut
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        if (currentUser?.level === 'promotor') return;
        e.preventDefault();
        setIsGlobalSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentUser]);

  const handleSelectSectionFromSearch = useCallback((secNum: string) => {
    setDetailSectionNumber(secNum);
    setActiveNav('secciones');
    setIsGlobalSearchOpen(false);
  }, []);

  const handleSelectLeaderFromSearch = useCallback((leader: TerritorialLeader) => {
    setSelectedLeaderId(leader.id);
    setActiveNav('estructura');
    setStructureMode('organigrama');
    setFilters(f => ({ ...f, focusNodeId: leader.id }));
    setIsGlobalSearchOpen(false);
  }, []);

  // 1. Re-calculate global aggregates across the master dataset
  const allComputedLeaders = useMemo(() => {
    return calculateHierarchyAggregates(leadersData);
  }, [leadersData]);

  // 2. Strict hierarchical visibility (RBAC):
  // User can ONLY see themselves and what is below them in their descending subtree!
  const visibleLeaders = useMemo(() => {
    if (!currentUser) return [];
    return getVisibleSubtree(currentUser.leaderId, allComputedLeaders);
  }, [currentUser, allComputedLeaders]);

  // Subordinados directos con rol de promotor para el Coordinador Territorial
  const territorialPromoters = useMemo(() => {
    if (!currentUser) return [];
    return visibleLeaders.filter(l => l.level === 'promotor');
  }, [currentUser, visibleLeaders]);

  // Deselect selected leader ONLY if it was set and is no longer in the visible subtree
  useEffect(() => {
    if (selectedLeaderId !== null && !visibleLeaders.some(l => l.id === selectedLeaderId)) {
      setSelectedLeaderId(null);
    }
  }, [visibleLeaders, selectedLeaderId]);

  // 3. Filtered leaders for the directory table and flow canvas
  const filteredLeaders = useMemo(() => {
    return filterNodes(visibleLeaders, filters);
  }, [visibleLeaders, filters]);

  // 4. Overall statistics scoped strictly to the visible subtree
  const stats = useMemo(() => {
    return getHierarchyStats(visibleLeaders);
  }, [visibleLeaders]);

  // Currently selected leader object
  const selectedLeader = useMemo(() => {
    return visibleLeaders.find(l => l.id === selectedLeaderId) || null;
  }, [visibleLeaders, selectedLeaderId]);

  // Focused leader object (if focus mode active)
  const focusedLeader = useMemo(() => {
    return visibleLeaders.find(l => l.id === filters.focusNodeId) || null;
  }, [visibleLeaders, filters.focusNodeId]);

  // Handlers
  const handleToggleCollapse = useCallback((id: string) => {
    setCollapsedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleExpandAll = useCallback(() => {
    setCollapsedIds(new Set());
  }, []);

  const handleCollapseAll = useCallback(() => {
    const withKids = visibleLeaders.filter(l => (l.directTeamCount ?? 0) > 0 && l.parentId !== null);
    setCollapsedIds(new Set(withKids.map(l => l.id)));
  }, [visibleLeaders]);

  const handleSelectLeader = useCallback((leader: TerritorialLeader) => {
    setSelectedLeaderId(leader.id);
  }, []);

  const handleFocusSubtree = useCallback((leaderId: string) => {
    setFilters(prev => ({
      ...prev,
      focusNodeId: prev.focusNodeId === leaderId ? null : leaderId,
    }));
  }, []);

  const handleOpenAddModal = useCallback(() => {
    setEditingLeader(null);
    setIsEditModalOpen(true);
  }, []);

  const handleOpenEditModal = useCallback((leader: TerritorialLeader) => {
    setEditingLeader(leader);
    setIsEditModalOpen(true);
  }, []);

  const handleSaveLeader = useCallback((savedLeader: TerritorialLeader) => {
    const leaderToSave = { ...savedLeader };
    unmarkLocalDeletedId(leaderToSave.id);
    if (leaderToSave.level === 'promovido' && (!leaderToSave.parentId || leaderToSave.parentId === 'null')) {
      leaderToSave.parentId = currentUser?.leaderId || null;
    }

    setLeadersData(prev => {
      const exists = prev.some(l => l.id === leaderToSave.id);
      let updated: TerritorialLeader[];
      if (exists) {
        updated = prev.map(l => (l.id === leaderToSave.id ? leaderToSave : l));
      } else {
        updated = [...prev, leaderToSave];
      }
      try {
        localStorage.setItem('territorial_leaders_data', JSON.stringify(updated));
      } catch (e) {
        console.warn('Error saving leaders to localStorage', e);
      }
      saveLeaderApi(leaderToSave, exists)
        .then(() => {
          clearPendingOfflineId(leaderToSave.id);
          syncLeadersWithServer();
        })
        .catch(e => {
          console.warn('Sync API error, encolado para reintento offline:', e);
          markPendingOfflineId(leaderToSave.id);
        });
      return calculateHierarchyAggregates(updated);
    });
    if (leaderToSave.level !== 'promovido') {
      setSelectedLeaderId(leaderToSave.id);
    } else {
      setSelectedLeaderId(null);
    }
  }, [currentUser, syncLeadersWithServer]);

  const handleDeleteLeader = useCallback((id: string, skipConfirm = false) => {
    // 1. Regla de negocio estricta: Bloquear eliminación si tiene subordinados directos
    const target = leadersData.find(l => l.id === id);
    const directSubs = leadersData.filter(l => l.parentId === id);
    if (directSubs.length > 0) {
      alert(`No se puede eliminar a "${target?.name || 'este integrante'}": tiene ${directSubs.length} subordinado(s) directo(s). Reasigna o elimina primero a sus subordinados.`);
      return;
    }

    if (skipConfirm || window.confirm('¿Seguro que deseas eliminar este registro de la estructura territorial?')) {
      saveLocalDeletedId(id);
      clearPendingOfflineId(id);
      setLeadersData(prev => {
        const updated = prev.filter(l => l.id !== id);
        try {
          localStorage.setItem('territorial_leaders_data', JSON.stringify(updated));
        } catch (e) {
          console.warn('Error saving leaders to localStorage', e);
        }
        return calculateHierarchyAggregates(updated);
      });

      // 2. Eliminar cuenta de usuario asociada en el cliente y servidor (Phase 2 item 2.8)
      const accountToDelete = accounts.find(a => a.leaderId === id);
      if (accountToDelete) {
        setAccounts(prev => {
          const updated = prev.filter(a => a.leaderId !== id);
          try {
            localStorage.setItem('territorial_custom_accounts', JSON.stringify(updated));
          } catch {}
          return updated;
        });
        deleteUserAccountApi(accountToDelete.id).catch(() => {});
      }

      if (selectedLeaderId === id) {
        setSelectedLeaderId(null);
      }
      if (selectedPromovidoId === id) {
        setSelectedPromovidoId(null);
      }
      if (filters.focusNodeId === id) {
        setFilters(f => ({ ...f, focusNodeId: null }));
      }
      deleteLeaderApi(id)
        .then(() => syncLeadersWithServer())
        .catch(e => console.warn('Delete API error:', e));
    }
  }, [leadersData, accounts, selectedLeaderId, selectedPromovidoId, filters.focusNodeId, syncLeadersWithServer]);

  // Sections handlers
  const handleSaveSection = useCallback((savedSection: ElectoralSection) => {
    setSectionsData(prev => {
      const exists = prev.some(s => s.id === savedSection.id);
      const updated = exists
        ? prev.map(s => (s.id === savedSection.id ? savedSection : s))
        : [savedSection, ...prev];
      try {
        const custom = updated.filter(s => s.structures.length > 0 || (s.notes && s.notes.trim().length > 0));
        localStorage.setItem('territorial_user_sections', JSON.stringify(custom));
      } catch (e) {
        console.warn('Error saving sections to localStorage', e);
      }
      return updated;
    });
    saveSectionApi(savedSection).catch(e => console.warn('Save Section API error:', e));
  }, []);

  const handleAddStructureToSection = useCallback((sectionId: string, newStructure: SectionStructure) => {
    setSectionsData(prev => {
      const updated = prev.map(sec => {
        if (sec.id === sectionId) {
          return {
            ...sec,
            structures: [...sec.structures, newStructure]
          };
        }
        return sec;
      });
      try {
        const custom = updated.filter(s => s.structures.length > 0 || (s.notes && s.notes.trim().length > 0));
        localStorage.setItem('territorial_user_sections', JSON.stringify(custom));
      } catch (e) {
        console.warn('Error saving sections to localStorage', e);
      }
      return updated;
    });
    addStructureApi(sectionId, newStructure).catch(e => console.warn('Add Structure API error:', e));
  }, []);

  const handleSelectStructureToViewTree = useCallback((structure: SectionStructure, section: ElectoralSection) => {
    const matchingLeader = visibleLeaders.find(l => 
      (structure.rootLeaderId && l.id === structure.rootLeaderId) ||
      l.territoryName.includes(section.sectionNumber) ||
      (l.code && l.code.includes(section.sectionNumber)) ||
      l.name.toLowerCase().includes(structure.leaderName.toLowerCase())
    );

    if (matchingLeader) {
      setSelectedLeaderId(matchingLeader.id);
      setFilters(f => ({ ...f, focusNodeId: matchingLeader.id }));
    } else {
      setFilters(f => ({ ...f, searchQuery: section.sectionNumber }));
    }

    setActiveNav('estructura');
    setStructureMode('organigrama');
    setCollapsedIds(new Set());
  }, [visibleLeaders]);

  // Export to CSV scoped to visible subtree
  const handleExportData = useCallback(() => {
    if (!currentUser) return;
    const csvContent = exportToCSV(visibleLeaders);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `estructura_territorial_${currentUser.username}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [visibleLeaders, currentUser]);

  // Import JSON structure
  const handleImportData = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].name && parsed[0].level) {
          setLeadersData(calculateHierarchyAggregates(parsed));
          alert(`Estructura importada exitosamente con ${parsed.length} integrantes.`);
        } else {
          alert('El archivo no contiene un formato de estructura territorial válido.');
        }
      } catch (err) {
        alert('Error al leer el archivo JSON: ' + (err as Error).message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, []);

  // Handler para dar de alta un usuario manualmente en el sistema cerrado
  const handleCreateManualUser = useCallback((newUser: UserAccount, newLeader: TerritorialLeader) => {
    saveUserAccountApi(newUser).catch(() => {});
    setAccounts(prev => {
      const updated = [...prev, newUser];
      try {
        const customOnly = updated.filter(a => !MOCK_ACCOUNTS.some(m => m.id === a.id));
        localStorage.setItem('territorial_custom_accounts', JSON.stringify(customOnly));
      } catch (e) {
        console.error('Error saving custom accounts', e);
      }
      return updated;
    });

    handleSaveLeader(newLeader);
  }, [handleSaveLeader]);

  // Handlers para gestión de promotores territoriales (Coordinador Territorial)
  const handleSaveNewPromoter = useCallback((newLeader: TerritorialLeader, newUserAccount: UserAccount) => {
    saveUserAccountApi(newUserAccount).catch(() => {});
    setAccounts(prev => {
      const updated = [...prev, newUserAccount];
      try {
        const customOnly = updated.filter(a => !MOCK_ACCOUNTS.some(m => m.id === a.id));
        localStorage.setItem('territorial_custom_accounts', JSON.stringify(customOnly));
      } catch (e) {
        console.error('Error saving custom accounts', e);
      }
      return updated;
    });

    handleSaveLeader(newLeader);
  }, [handleSaveLeader]);

  const handleSaveUpdatedPromoter = useCallback((updatedLeader: TerritorialLeader, updatedAccount?: UserAccount) => {
    handleSaveLeader(updatedLeader);

    if (updatedAccount) {
      saveUserAccountApi(updatedAccount).catch(() => {});
      setAccounts(prev => {
        const updated = prev.map(a => a.id === updatedAccount.id || a.leaderId === updatedLeader.id ? updatedAccount : a);
        try {
          const customOnly = updated.filter(a => !MOCK_ACCOUNTS.some(m => m.id === a.id));
          localStorage.setItem('territorial_custom_accounts', JSON.stringify(customOnly));
        } catch (e) {
          console.error('Error saving custom accounts', e);
        }
        return updated;
      });
    }
  }, [handleSaveLeader]);

  const handleDeletePromoter = useCallback((promoterId: string) => {
    handleDeleteLeader(promoterId);
    setAccounts(prev => {
      const accountToDelete = prev.find(a => a.leaderId === promoterId);
      if (accountToDelete) {
        deleteUserAccountApi(accountToDelete.id).catch(() => {});
      }
      const updated = prev.filter(a => a.leaderId !== promoterId);
      try {
        const customOnly = updated.filter(a => !MOCK_ACCOUNTS.some(m => m.id === a.id));
        localStorage.setItem('territorial_custom_accounts', JSON.stringify(customOnly));
      } catch (e) {
        console.error('Error saving custom accounts', e);
      }
      return updated;
    });
  }, [handleDeleteLeader]);

  // Si no hay sesión activa en el sistema cerrado, mostrar pantalla de acceso
  if (!currentUser) {
    return (
      <ClosedSystemLoginScreen
        accounts={accounts}
        onLogin={handleSelectUser}
      />
    );
  }

  return (
    <div className="flex h-screen w-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
      {/* Sidebar Lateral Izquierdo Tradicional */}
      <Sidebar
        activeNav={activeNav}
        onNavChange={handleNavChange}
        structureMode={structureMode}
        onStructureModeChange={setStructureMode}
        currentUser={currentUser}
        visibleCount={visibleLeaders.length}
        sectionsCount={scopedSections.length}
        promotersCount={territorialPromoters.length}
        onOpenAddModal={handleOpenAddModal}
        onOpenQuickCapture={() => handleOpenQuickCapture()}
        onOpenCreateUser={() => setIsCreateUserModalOpen(true)}
        onExportData={handleExportData}
        onImportData={handleImportData}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        activeStateName={activeStateData.commonName}
        activeStateAbbr={activeStateData.abbr}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebarCollapse}
      />

      {/* Área Principal Derecha */}
      <div className={`flex-1 flex flex-col min-w-0 h-full ${
        currentUser?.level === 'promotor' ? 'overflow-y-auto md:overflow-hidden' : 'overflow-hidden'
      }`}>
        {/* Top Header con Breadcrumbs, Switcher de Estructura, Búsqueda y Switcher de Usuario en esquina superior derecha */}
        <TopHeader
          activeNav={activeNav}
          structureMode={structureMode}
          onStructureModeChange={setStructureMode}
          filters={filters}
          onFilterChange={setFilters}
          focusLeaderName={focusedLeader ? `${focusedLeader.name} (${focusedLeader.territoryName})` : undefined}
          onClearFocus={() => setFilters(f => ({ ...f, focusNodeId: null }))}
          onToggleMobileMenu={() => setIsMobileMenuOpen(prev => !prev)}
          onExpandAll={handleExpandAll}
          onCollapseAll={handleCollapseAll}
          activeStateName={activeStateData.commonName}
          activeStateAbbr={activeStateData.abbr}
          currentUser={currentUser}
          onSelectUser={handleSelectUser}
          visibleCount={visibleLeaders.length}
          onLogout={handleLogout}
          onOpenGlobalSearch={currentUser?.level === 'promotor' ? undefined : () => setIsGlobalSearchOpen(true)}
          accounts={accounts}
          onOpenCreateUser={() => setIsCreateUserModalOpen(true)}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleSidebarCollapse}
          onNavChange={handleNavChange}
        />

        {/* Banner de Impersonación Activa (Superadmin auditando cuenta de Coordinador de Campaña) */}
        {impersonatingAdminUser && (
          <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 px-4 sm:px-6 py-2.5 flex items-center justify-between border-b border-amber-600 shadow-md z-40 shrink-0 animate-emil-fade">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 text-slate-950 shrink-0" />
              <div>
                <span className="text-xs sm:text-sm font-bold tracking-tight">
                  MODO AUDITORÍA SAAS: Has iniciado sesión como <strong className="underline">{currentUser?.name}</strong> ({currentUser?.territoryName})
                </span>
                <span className="hidden sm:inline-block ml-2 text-[10px] bg-slate-950/20 px-2 py-0.5 rounded font-mono font-bold">
                  Sesión Superadmin en Pausa
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleExitImpersonation}
              className="px-3.5 py-1.5 bg-slate-950 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Salir y Volver al Panel Superadmin</span>
            </button>
          </div>
        )}

        {/* Barra de niveles solo activa en vista Estructura */}
        {activeNav === 'estructura' && (
          <LevelSummaryBar
            levelCounts={stats.levelCounts}
            totalCount={stats.totalPeople}
            currentFilter={filters.levelFilter}
            onSelectLevel={(level) => setFilters(f => ({ ...f, levelFilter: level }))}
          />
        )}

        {/* Notificación Superior de Registro Exitoso */}
        {topSuccessNotice && (
          <div className="bg-emerald-600 text-white px-4 sm:px-6 py-2.5 flex items-center justify-between border-b border-emerald-700 shadow-xs z-30 shrink-0">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
              <p className="text-xs sm:text-sm font-bold tracking-wide">
                {topSuccessNotice}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setTopSuccessNotice(null)}
              className="text-emerald-100 hover:text-white p-1 hover:bg-emerald-700 transition-colors cursor-pointer rounded-none"
              title="Cerrar notificación"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Contenido Dinámico */}
        <main className={`flex-1 relative flex ${
          currentUser?.level === 'promotor' ? 'overflow-visible md:overflow-hidden pb-16 md:pb-0' : 'overflow-hidden'
        }`}>
          {/* Vista de Página Completa de Edición de Coordinador de Campaña (NO MODAL) */}
          {editingCoordinatorId ? (
            (() => {
              const targetCoord = leadersData.find(l => l.id === editingCoordinatorId);
              const targetAcc = accounts.find(a => a.leaderId === editingCoordinatorId || a.username === targetCoord?.username);
              if (!targetCoord) return null;
              return (
                <CampanaCoordinatorEditPage
                  coordinator={targetCoord}
                  account={targetAcc}
                  onBack={() => setEditingCoordinatorId(null)}
                  onSave={async (updatedLeader, updatedAccount) => {
                    await handleSaveCoordinatorEdit(updatedLeader, updatedAccount);
                    setEditingCoordinatorId(null);
                  }}
                />
              );
            })()
          ) : selectedCoordinatorDetailId ? (
            (() => {
              const targetCoord = leadersData.find(l => l.id === selectedCoordinatorDetailId);
              const targetAcc = accounts.find(a => a.leaderId === selectedCoordinatorDetailId || a.username === targetCoord?.username);
              if (!targetCoord) return null;
              return (
                <CampanaCoordinatorDetailPage
                  coordinator={targetCoord}
                  account={targetAcc}
                  allLeaders={leadersData}
                  onBack={() => setSelectedCoordinatorDetailId(null)}
                  onEditCoordinator={(id) => setEditingCoordinatorId(id)}
                  onImpersonate={(acc) => {
                    setSelectedCoordinatorDetailId(null);
                    handleImpersonate(acc);
                  }}
                  onDeleteCoordinator={(id) => {
                    setSelectedCoordinatorDetailId(null);
                    handleDeleteLeader(id, false);
                  }}
                />
              );
            })()
          ) : editingUserId ? (
            (() => {
              const targetLeader = visibleLeaders.find(l => l.id === editingUserId);
              const targetAcc = accounts.find(a => a.leaderId === editingUserId || a.username === targetLeader?.username);
              if (!targetLeader) return null;
              return (
                <Suspense fallback={<div className="flex-1 flex items-center justify-center p-8 text-slate-400 font-sans text-xs">Cargando formulario...</div>}>
                  <SubordinateCreatePage
                    currentUser={currentUser!}
                    availableSections={scopedSections}
                    accounts={accounts}
                    isEditing={true}
                    initialLeader={targetLeader}
                    initialAccount={targetAcc}
                    onSaveCoordinator={async (leader, account) => {
                      await handleSaveNewTerritorialCoordinator(leader, account);
                      setEditingUserId(null);
                      setActiveNav('usuarios');
                    }}
                    onBack={() => {
                      setEditingUserId(null);
                      setActiveNav('usuarios');
                    }}
                  />
                </Suspense>
              );
            })()
          ) : selectedUserDetailId ? (
            (() => {
              const targetLeader = visibleLeaders.find(l => l.id === selectedUserDetailId);
              const targetAcc = accounts.find(a => a.leaderId === selectedUserDetailId || a.username === targetLeader?.username);
              if (!targetLeader) return null;
              return (
                <Suspense fallback={<div className="flex-1 flex items-center justify-center p-8 text-slate-400 font-sans text-xs">Cargando detalle...</div>}>
                  <UserDetailPage
                    leader={targetLeader}
                    account={targetAcc}
                    allLeaders={visibleLeaders}
                    currentUser={currentUser!}
                    onBack={() => {
                      setSelectedUserDetailId(null);
                      setActiveNav('usuarios');
                    }}
                    onEdit={(id) => {
                      setSelectedUserDetailId(null);
                      setEditingUserId(id);
                      setActiveNav('editar-usuario');
                    }}
                    onImpersonate={handleImpersonate}
                    onDelete={(id) => {
                      setSelectedUserDetailId(null);
                      handleDeleteLeader(id, false);
                      setActiveNav('usuarios');
                    }}
                  />
                </Suspense>
              );
            })()
          ) : detailSectionNumber ? (
            <SectionDetailPage
              sectionNumber={detailSectionNumber}
              allSections={scopedSections}
              visibleLeaders={visibleLeaders}
              onBack={() => setDetailSectionNumber(null)}
              onAddStructure={handleAddStructureToSection}
            />
          ) : (
            <Suspense fallback={<div className="flex-1 flex items-center justify-center p-8 text-slate-400 font-sans text-xs">Cargando vista...</div>}>
              {/* WIZARD INDEPENDIENTE PARA CREAR COORDINADOR DE CAMPAÑA (NO MODAL) */}
              {activeNav === 'crear-coordinador' && (
                <CreateCampanaCoordinatorWizardPage
                  onBack={() => setActiveNav('escritorio')}
                  onSaveCoordinator={handleSaveNewCoordinator}
                  onImpersonate={handleImpersonate}
                />
              )}

              {/* MESA DE AYUDA Y TICKETS PARA SUPERADMIN (PANTALLA COMPLETA) */}
              {activeNav === 'mesa-de-ayuda' && (
                <SuperadminTicketsPage
                  currentUser={currentUser}
                  allLeaders={leadersData}
                />
              )}

              {/* 1. ESCRITORIO (Tablero SaaS para Superadmin o KPIs para Coordinadores/Promotores) */}
              {activeNav === 'escritorio' && (
                isSuperAdminUser ? (
                  <SuperadminSaasDashboard
                    currentUser={currentUser}
                    allLeaders={leadersData}
                    accounts={accounts}
                    onImpersonate={handleImpersonate}
                    onDeleteCoordinator={(id) => handleDeleteLeader(id, false)}
                    onOpenCreateCoordinatorWizard={() => setActiveNav('crear-coordinador')}
                    onViewCoordinatorDetails={(id) => setSelectedCoordinatorDetailId(id)}
                    onEditCoordinator={(id) => setEditingCoordinatorId(id)}
                    onOpenWhatsAppConfig={() => {
                      setSettingsInitialTab('whatsapp-evolution');
                      setActiveNav('configuracion');
                    }}
                  />
                ) : (
                  <ExecutiveKpiDesktop
                    currentUser={currentUser}
                    stats={stats}
                    visibleLeaders={visibleLeaders}
                    sections={scopedSections}
                    activeStateId={activeStateId}
                    onStateChange={handleStateChange}
                    onSelectLeader={handleSelectLeader}
                    onNavigateView={(view) => {
                      if (view === 'flow') {
                        setActiveNav('estructura');
                        setStructureMode('organigrama');
                      } else if (view === 'table') {
                        setActiveNav('estructura');
                        setStructureMode('lista');
                      } else if (view === 'sections') {
                        setActiveNav('secciones');
                      } else if (view === 'capturar-promovido') {
                        setActiveNav('capturar-promovido');
                      } else if (view === 'mis-secciones') {
                        setActiveNav('mis-secciones');
                      }
                    }}
                    onOpenAddModal={handleOpenAddModal}
                    onOpenQuickCapture={handleOpenQuickCapture}
                    onOpenCreateUser={() => setIsCreateUserModalOpen(true)}
                    onViewCitizen={(id) => {
                      setSelectedPromovidoId(id);
                      setActiveNav('ver-promovido');
                    }}
                    onEditCitizen={(id) => {
                      setSelectedPromovidoId(id);
                      setActiveNav('editar-promovido');
                    }}
                    onDeleteCitizen={(id) => handleDeleteLeader(id, true)}
                    onViewSectionDetail={(secNum) => {
                      const padded = secNum.padStart(4, '0');
                      const inScope = scopedSections.some(s => s.sectionNumber === secNum || s.sectionNumber === padded);
                      if (inScope) {
                        setDetailSectionNumber(secNum);
                      }
                    }}
                  />
                )
              )}

              {/* 1b. MIS SECCIONES (MAPA EN PANTALLA COMPLETA PARA PROMOTOR TERRITORIAL) */}
              {activeNav === 'mis-secciones' && currentUser?.level === 'promotor' && (
                <PromoterSectionsMapView
                  currentUser={currentUser}
                  allSections={captureAvailableSections}
                  assignedSections={currentUser.assignedSections}
                />
              )}

              {/* 2. ESTRUCTURA - MODO ORGANIGRAMA */}
              {activeNav === 'estructura' && structureMode === 'organigrama' && (
                <TerritoryFlowCanvas
                  leaders={filteredLeaders}
                  collapsedIds={collapsedIds}
                  selectedLeader={selectedLeader}
                  onToggleCollapse={handleToggleCollapse}
                  onSelectLeader={handleSelectLeader}
                  onExpandAll={handleExpandAll}
                  onCollapseAll={handleCollapseAll}
                />
              )}

              {/* 2. ESTRUCTURA - MODO LISTA (DIRECTORIO) */}
              {activeNav === 'estructura' && structureMode === 'lista' && (
                <DirectoryTableView
                  leaders={filteredLeaders}
                  allLeaders={visibleLeaders}
                  onSelectLeader={handleSelectLeader}
                  onFocusSubtree={handleFocusSubtree}
                  onEditLeader={handleOpenEditModal}
                  onDeleteLeader={handleDeleteLeader}
                />
              )}

              {/* 3. SECCIONES & MAPAS */}
              {activeNav === 'secciones' && (
                <SectionsCatalogView
                  sections={scopedSections}
                  allLeaders={visibleLeaders}
                  stateAbbr={activeStateData.abbr}
                  onSaveSection={handleSaveSection}
                  onAddStructureToSection={handleAddStructureToSection}
                  onSelectStructureToViewTree={handleSelectStructureToViewTree}
                  onViewSectionDetail={(secNum) => setDetailSectionNumber(secNum)}
                />
              )}

              {/* 4. GESTIÓN Y ADMINISTRACIÓN DE PROMOTORES */}
              {activeNav === 'promotores' && (
                <TerritorialPromotersAdminView
                  currentUser={currentUser}
                  promoters={territorialPromoters}
                  allLeaders={visibleLeaders}
                  sections={scopedSections}
                  accounts={accounts}
                  onNavigate={setActiveNav}
                  onSelectEditPromoter={(id) => {
                    setSelectedEditPromoterId(id);
                    setActiveNav('editar-promotor');
                  }}
                  onDeletePromoter={handleDeletePromoter}
                />
              )}

              {/* 5. CREAR PROMOTOR TERRITORIAL */}
              {activeNav === 'crear-promotor' && (
                <TerritorialPromoterCreatePage
                  currentUser={currentUser}
                  availableSections={scopedSections}
                  onSavePromoter={handleSaveNewPromoter}
                  onNavigate={setActiveNav}
                />
              )}

              {/* 6. EDITAR PROMOTOR TERRITORIAL */}
              {activeNav === 'editar-promotor' && (
                <TerritorialPromoterEditPage
                  selectedPromoterId={selectedEditPromoterId}
                  promoters={territorialPromoters}
                  accounts={accounts}
                  availableSections={scopedSections}
                  onSave={handleSaveUpdatedPromoter}
                  onCancel={() => setActiveNav('promotores')}
                  onSelectPromoterToEdit={setSelectedEditPromoterId}
                  onDeletePromoter={handleDeletePromoter}
                  onNavigate={setActiveNav}
                />
              )}

              {/* 7. CAPTURAR CIUDADANO PROMOVIDO (PÁGINA LIMPIA, ESQUINAS RECTAS) */}
              {activeNav === 'capturar-promovido' && currentUser && (
                <PromoterCitizenCapturePage
                  currentUser={currentUser}
                  availableSections={captureAvailableSections}
                  allLeaders={visibleLeaders}
                  defaultSectionNumber={currentUser.assignedSections?.[0] || currentUser.territoryName?.match(/\d{3,4}/)?.[0] || '0416'}
                  initialINEData={quickCaptureInitialData}
                  onSaveCitizen={(newLeader) => {
                    handleSaveLeader(newLeader);
                    setSelectedLeaderId(null);
                    setQuickCaptureInitialData(null);
                    setTopSuccessNotice(`¡Ciudadano ${newLeader.name} registrado con éxito en la Sección ${newLeader.electoralSection}!`);
                    setActiveNav('escritorio');
                  }}
                  onNavigate={setActiveNav}
                />
              )}

              {/* 8. VER EXPEDIENTE DE CIUDADANO PROMOVIDO (PÁGINA LIMPIA, ESQUINAS RECTAS) */}
              {activeNav === 'ver-promovido' && currentUser && (
                <PromoterCitizenDetailPage
                  citizenId={selectedPromovidoId || ''}
                  allLeaders={visibleLeaders}
                  onNavigate={setActiveNav}
                  onEdit={(id) => {
                    setSelectedPromovidoId(id);
                    setActiveNav('editar-promovido');
                  }}
                  onDeleteCitizen={(id) => {
                    handleDeleteLeader(id, true);
                    setActiveNav('escritorio');
                  }}
                />
              )}

              {/* 9. EDITAR CIUDADANO PROMOVIDO (PÁGINA LIMPIA, ESQUINAS RECTAS) */}
              {activeNav === 'editar-promovido' && currentUser && (
                <PromoterCitizenEditPage
                  citizenId={selectedPromovidoId || ''}
                  allLeaders={visibleLeaders}
                  availableSections={captureAvailableSections}
                  onSaveCitizen={(updatedLeader) => {
                    handleSaveLeader(updatedLeader);
                    setSelectedLeaderId(null);
                    setTopSuccessNotice(`¡Expediente de ${updatedLeader.name} actualizado con éxito!`);
                    setActiveNav('escritorio');
                  }}
                  onDeleteCitizen={(id) => {
                    handleDeleteLeader(id, true);
                    setActiveNav('escritorio');
                  }}
                  onNavigate={setActiveNav}
                />
              )}

              {/* 10. USUARIOS: ADMINISTRACIÓN DE COORDINADORES Y SUBORDINADOS */}
              {activeNav === 'usuarios' && currentUser && (
                <TerritorialCoordinatorsAdminPage
                  currentUser={currentUser}
                  allLeaders={visibleLeaders}
                  accounts={accounts}
                  scopedSections={scopedSections}
                  onNavigate={setActiveNav}
                  onDeleteCoordinator={(id) => handleDeleteLeader(id, false)}
                  onViewDetails={(id) => {
                    setSelectedUserDetailId(id);
                    setActiveNav('detalle-usuario');
                  }}
                  onEditUser={(id) => {
                    setEditingUserId(id);
                    setActiveNav('editar-usuario');
                  }}
                />
              )}

              {/* 11. ALTA DE SUBORDINADO DIRECTO (PÁGINA COMPLETA, NO MODAL) */}
              {(activeNav === 'crear-coordinador-territorial' || activeNav === 'crear-usuario') && currentUser && (
                <SubordinateCreatePage
                  currentUser={currentUser}
                  availableSections={scopedSections}
                  accounts={accounts}
                  isEditing={false}
                  onSaveCoordinator={handleSaveNewTerritorialCoordinator}
                  onBack={() => setActiveNav('usuarios')}
                />
              )}

              {/* 12. CONFIGURACIÓN */}
              {activeNav === 'configuracion' && (
                <ConfiguracionPage
                  currentUser={currentUser}
                  initialTab={settingsInitialTab}
                  onUpdateCurrentUser={(updated) => {
                    setCurrentUser(updated);
                    setAccounts((prev) =>
                      prev.map((a) => (a.id === updated.id || a.email === updated.email ? { ...a, ...updated } : a))
                    );
                  }}
                />
              )}

              {/* 13. ACERCA DE (PÁGINA EN BLANCO) */}
              {activeNav === 'acerca-de' && (
                <AcercaDePlaceholderPage />
              )}
            </Suspense>
          )}

          {/* Expediente Territorial Lateral (Drawer) */}
          {selectedLeader && (
            <NodeDetailDrawer
              leader={selectedLeader}
              allLeaders={visibleLeaders}
              onClose={() => setSelectedLeaderId(null)}
              onSelectLeader={handleSelectLeader}
              onFocusSubtree={handleFocusSubtree}
              onEditLeader={handleOpenEditModal}
              isFocused={filters.focusNodeId === selectedLeader?.id}
            />
          )}
        </main>
      </div>

      {/* Modal de Crear / Editar Líder */}
      <EditLeaderModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveLeader}
        editingLeader={editingLeader}
        allLeaders={visibleLeaders}
        currentUser={currentUser}
        availableSections={scopedSections}
      />

      {/* Modal de Búsqueda Global Omnibox (Ctrl + K) */}
      <GlobalSearchModal
        isOpen={isGlobalSearchOpen}
        onClose={() => setIsGlobalSearchOpen(false)}
        sections={scopedSections}
        leaders={visibleLeaders}
        onSelectSection={handleSelectSectionFromSearch}
        onSelectLeader={handleSelectLeaderFromSearch}
      />

      {/* Modal de Captura Rápida de Campo (Móvil / 1-Click WhatsApp) */}
      <QuickFieldCaptureModal
        isOpen={isQuickCaptureOpen}
        onClose={() => {
          setIsQuickCaptureOpen(false);
          setQuickCaptureInitialData(null);
        }}
        initialINEData={quickCaptureInitialData}
        availableSections={captureAvailableSections}
        allLeaders={visibleLeaders}
        currentUserLeaderId={currentUser?.leaderId || visibleLeaders[0]?.id || null}
        defaultSectionNumber={currentUser?.assignedSections?.[0] || currentUser?.territoryName?.match(/\d{3,4}/)?.[0] || '0416'}
        onSuccess={(newLeader) => {
          handleSaveLeader(newLeader);
          setSelectedLeaderId(null);
          setTopSuccessNotice(`¡Ciudadano ${newLeader.name} registrado con éxito!`);
        }}
      />

      {/* Modal de Alta Manual de Usuario (Sistema Cerrado) */}
      <CreateManualUserModal
        isOpen={isCreateUserModalOpen}
        onClose={() => setIsCreateUserModalOpen(false)}
        currentUser={currentUser}
        availableSections={scopedSections}
        onUserCreated={handleCreateManualUser}
      />

      {/* Modal de Soporte y Tickets para Coordinadores de Campaña */}
      {currentUser && (
        <CampanaTicketsModal
          isOpen={isCampanaTicketsModalOpen}
          onClose={() => setIsCampanaTicketsModalOpen(false)}
          currentUser={currentUser}
        />
      )}


      {/* Barra Inferior Fija para Promotor Territorial en Móvil */}
      {currentUser?.level === 'promotor' && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-6 py-2 flex items-center justify-around md:hidden shadow-lg">
          <button
            type="button"
            onClick={() => {
              setIsNotificationsOpen(false);
              if (activeNav !== 'escritorio') {
                setActiveNav('escritorio');
              }
            }}
            className={`flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-colors ${
              activeNav === 'escritorio' && !isNotificationsOpen
                ? 'text-emerald-600 font-bold'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <Users className="w-5 h-5 mb-0.5" />
            <span className="text-[11px] tracking-tight">Promovidos</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsNotificationsOpen(false);
              if (activeNav !== 'mis-secciones') {
                setActiveNav('mis-secciones');
              }
            }}
            className={`flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-colors ${
              activeNav === 'mis-secciones' && !isNotificationsOpen
                ? 'text-emerald-600 font-bold'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <MapPin className="w-5 h-5 mb-0.5" />
            <span className="text-[11px] tracking-tight">Mis Secciones</span>
          </button>

          <button
            type="button"
            onClick={() => setIsNotificationsOpen(true)}
            className={`relative flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-colors ${
              isNotificationsOpen
                ? 'text-emerald-600 font-bold'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <div className="relative">
              <Bell className="w-5 h-5 mb-0.5" />
              <span className="absolute -top-1 -right-2 w-4 h-4 bg-emerald-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                2
              </span>
            </div>
            <span className="text-[11px] tracking-tight">Notificaciones</span>
          </button>
        </nav>
      )}

      {/* Barra Inferior Fija para Super Administrador en Móvil */}
      {isSuperAdminUser && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2 flex items-center justify-around md:hidden shadow-lg">
          <button
            type="button"
            onClick={() => {
              setActiveNav('escritorio');
            }}
            className={`flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-colors ${
              activeNav === 'escritorio'
                ? 'text-[#9d2449] font-bold'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <BarChart3 className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">Escritorio</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveNav('usuarios');
            }}
            className={`flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-colors ${
              activeNav === 'usuarios' || activeNav === 'crear-coordinador' || activeNav === 'detalle-usuario'
                ? 'text-[#9d2449] font-bold'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <Users className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">Campañas</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveNav('mesa-de-ayuda');
            }}
            className={`flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-colors ${
              activeNav === 'mesa-de-ayuda'
                ? 'text-[#9d2449] font-bold'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <LifeBuoy className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">Tickets</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveNav('configuracion');
            }}
            className={`flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-colors ${
              activeNav === 'configuracion'
                ? 'text-[#9d2449] font-bold'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <Settings className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">Configuración</span>
          </button>
        </nav>
      )}

      {/* Modal de Notificaciones del Promotor */}
      {currentUser?.level === 'promotor' && (
        <PromoterNotificationsModal
          isOpen={isNotificationsOpen}
          onClose={() => setIsNotificationsOpen(false)}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}

export default App;
