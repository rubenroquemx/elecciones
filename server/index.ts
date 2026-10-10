import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno desde .env si existe en la raíz
try {
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const rawVal = trimmed.slice(eqIdx + 1).trim();
        const cleanVal = rawVal.replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = cleanVal;
        }
      }
    }
  }
} catch (e) {}

function cleanEnvValue(val?: string): string {
  if (!val) return '';
  return val.replace(/^["']|["']$/g, '').trim();
}

const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'vertex-territorial-jwt-secret-2026';
if (!process.env.JWT_SECRET && !process.env.NEXTAUTH_SECRET) {
  console.warn('⚠️ AVISO: JWT_SECRET no está configurada en variables de entorno. Usando clave de respaldo predeterminada.');
}

async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

async function verifyPassword(plain: string, hashOrPlain: string): Promise<boolean> {
  if (!hashOrPlain) return false;
  if (hashOrPlain.startsWith('$2a$') || hashOrPlain.startsWith('$2b$')) {
    return bcrypt.compare(plain, hashOrPlain);
  }
  return plain === hashOrPlain;
}

function getSubtreeLeaderIds(rootLeaderId: string, allLeaders: any[]): Set<string> {
  const result = new Set<string>();
  result.add(rootLeaderId);
  let added = true;
  while (added) {
    added = false;
    for (const l of allLeaders) {
      if (l.parentId && result.has(l.parentId) && !result.has(l.id)) {
        result.add(l.id);
        added = true;
      }
    }
  }
  return result;
}

function getAllowedChildLevel(creatorLevel: string): string | null {
  switch (creatorLevel) {
    case 'admin': return 'cpv';
    case 'cpv':
    case 'campana':
    case 'estatal': return 'zona';
    case 'zona':
    case 'distrital':
    case 'responsable_zona': return 'seccion';
    case 'seccion':
    case 'territorial':
    case 'seccional': return 'promotor';
    case 'promotor': return 'promovido';
    default: return null;
  }
}

interface AuthTokenPayload {
  id: string;
  username: string;
  name: string;
  email: string;
  level: string;
  leaderId: string | null;
  isSuperAdmin: boolean;
  territoryName?: string;
  accountRoleLabel?: string;
  avatarBg?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

const STORE_DIR = path.join(__dirname, '../data');
const STORE_FILE = path.join(STORE_DIR, 'leaders_store.json');
const DELETED_FILE = path.join(STORE_DIR, 'deleted_leaders_store.json');
const ACCOUNTS_FILE = path.join(STORE_DIR, 'accounts_store.json');
const TICKETS_FILE = path.join(STORE_DIR, 'tickets_store.json');

function readAccountsStore(): any[] {
  try {
    if (!fs.existsSync(STORE_DIR)) fs.mkdirSync(STORE_DIR, { recursive: true });
    if (fs.existsSync(ACCOUNTS_FILE)) {
      const content = fs.readFileSync(ACCOUNTS_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading accounts store:', e);
  }
  return [];
}

function writeAccountsStore(accounts: any[]) {
  try {
    if (!fs.existsSync(STORE_DIR)) fs.mkdirSync(STORE_DIR, { recursive: true });
    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Error writing accounts store:', e);
  }
}

const WHATSAPP_CONFIG_FILE = path.join(STORE_DIR, 'whatsapp_config.json');

interface WhatsAppConfig {
  apiUrl: string;
  apiKey: string;
  instanceName: string;
  autoOtpEnabled: boolean;
  countryCode: string;
}

function readWhatsAppConfig(): WhatsAppConfig {
  try {
    if (!fs.existsSync(STORE_DIR)) fs.mkdirSync(STORE_DIR, { recursive: true });
    if (fs.existsSync(WHATSAPP_CONFIG_FILE)) {
      const data = JSON.parse(fs.readFileSync(WHATSAPP_CONFIG_FILE, 'utf-8'));
      return {
        apiUrl: data.apiUrl || process.env.EVOLUTION_API_URL || '',
        apiKey: data.apiKey || process.env.EVOLUTION_API_KEY || '',
        instanceName: data.instanceName || process.env.EVOLUTION_INSTANCE_NAME || 'validador-territorial',
        autoOtpEnabled: data.autoOtpEnabled !== false,
        countryCode: data.countryCode || '52',
      };
    }
  } catch (e) {}
  return {
    apiUrl: process.env.EVOLUTION_API_URL || '',
    apiKey: process.env.EVOLUTION_API_KEY || '',
    instanceName: process.env.EVOLUTION_INSTANCE_NAME || 'validador-territorial',
    autoOtpEnabled: true,
    countryCode: '52',
  };
}

function writeWhatsAppConfig(config: WhatsAppConfig) {
  try {
    if (!fs.existsSync(STORE_DIR)) fs.mkdirSync(STORE_DIR, { recursive: true });
    fs.writeFileSync(WHATSAPP_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Error writing WhatsApp config:', e);
  }
}

// In-memory OTP store para validación de seguridad (expira en 10 minutos)
interface OtpEntry {
  code: string;
  phone: string;
  userId: string;
  expiresAt: number;
}
const otpStore = new Map<string, OtpEntry>();

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of otpStore.entries()) {
    if (v.expiresAt < now) {
      otpStore.delete(k);
    }
  }
}, 60000);

const app = express();
const prisma = new PrismaClient();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Middleware de autenticación Bearer para todas las rutas /api excepto públicas
const requireAuth: express.RequestHandler = (req, res, next) => {
  const publicPrefixes = ['/api/auth/login', '/api/config', '/api/gemini-status', '/api/health'];
  if (publicPrefixes.some(p => req.path === p || req.path.startsWith(p + '/'))) {
    return next();
  }
  if (!req.path.startsWith('/api')) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado: token de autenticación requerido.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
    req.user = decoded;
    next();
  } catch (err: any) {
    return res.status(401).json({ error: 'Token inválido o expirado.', details: err.message });
  }
};

app.use(requireAuth);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Config pública del servidor (Sistema Cerrado)
app.get('/api/config', (req, res) => {
  const rawSuperEmail = cleanEnvValue(process.env.SUPERADMIN_EMAIL) || cleanEnvValue(process.env.VITE_SUPERADMIN_EMAIL) || 'usrubenroqueguzman@gmail.com';
  res.json({
    authMode: 'closed_system',
    superadminEmail: rawSuperEmail.toLowerCase(),
  });
});

// --- USER ACCOUNTS API (SISTEMA CERRADO) ---
app.get('/api/accounts', async (req, res) => {
  try {
    let dbAccounts: any[] = [];
    try {
      dbAccounts = await prisma.userAccount.findMany({
        orderBy: { name: 'asc' },
      });
    } catch (e) {}

    const fileAccounts = readAccountsStore();
    const map = new Map<string, any>();
    for (const a of fileAccounts) map.set(a.id, a);
    for (const a of dbAccounts) {
      const prev = map.get(a.id) || {};
      map.set(a.id, { ...prev, ...a });
    }

    // NUNCA devolver el campo password al cliente
    let accountsList = Array.from(map.values()).map(a => {
      const safe = { ...a };
      delete safe.password;
      return safe;
    });

    // Autorización por subárbol: admin ve todo, el resto solo su subárbol
    if (req.user && !req.user.isSuperAdmin && req.user.level !== 'admin') {
      if (!req.user.leaderId) {
        accountsList = accountsList.filter(a => a.id === req.user!.id);
      } else {
        const allLeaders = readBackupStore();
        const subtreeIds = getSubtreeLeaderIds(req.user.leaderId, allLeaders);
        accountsList = accountsList.filter(a => 
          a.id === req.user!.id || (a.leaderId && subtreeIds.has(a.leaderId))
        );
      }
    }

    res.json(accountsList);
  } catch (err: any) {
    res.json([]);
  }
});

app.post('/api/accounts', async (req, res) => {
  try {
    const data = req.body;
    if (!data.id || (!data.email && !data.username)) {
      return res.status(400).json({ error: 'ID y usuario/correo requeridos' });
    }

    const rawPass = cleanEnvValue(data.password);
    const cleanEmail = String(data.email || `${data.username}@campana.mx`).trim().toLowerCase();
    const rawUser = String(data.username || cleanEmail.split('@')[0]).trim().toLowerCase().replace(/^@+/, '');
    const cleanUsername = rawUser || 'usuario';

    // Manejo de contraseña: si no se provee contraseña nueva, conservar la contraseña anterior
    let hashedPassword = '';
    if (rawPass) {
      hashedPassword = rawPass.startsWith('$2a$') || rawPass.startsWith('$2b$') 
        ? rawPass 
        : await hashPassword(rawPass);
    } else {
      // Buscar si ya existía contraseña en store de archivo o en DB
      const storeExisting = readAccountsStore().find((a: any) => 
        a.id === data.id || 
        a.email === cleanEmail || 
        (data.leaderId && a.leaderId === data.leaderId)
      );
      if (storeExisting && storeExisting.password) {
        hashedPassword = storeExisting.password;
      } else {
        try {
          const dbExisting = await prisma.userAccount.findFirst({
            where: {
              OR: [
                { id: data.id },
                { email: cleanEmail },
                ...(data.leaderId ? [{ leaderId: data.leaderId }] : []),
              ]
            }
          });
          if (dbExisting && dbExisting.password) {
            hashedPassword = dbExisting.password;
          }
        } catch {}
      }
    }

    const accountObj = {
      ...data,
      email: cleanEmail,
      username: cleanUsername,
      password: hashedPassword,
      updatedAt: new Date().toISOString(),
    };

    // 1. Guardar en respaldo de archivo
    const store = readAccountsStore();
    const idx = store.findIndex((a: any) => 
      a.id === data.id || 
      a.email === cleanEmail ||
      (data.leaderId && a.leaderId === data.leaderId)
    );
    if (idx >= 0) {
      store[idx] = { ...store[idx], ...accountObj, password: hashedPassword || store[idx].password };
    } else {
      store.unshift(accountObj);
    }
    writeAccountsStore(store);

    // 2. Guardar en PostgreSQL
    let savedInDb: any = null;
    try {
      savedInDb = await prisma.userAccount.upsert({
        where: { email: cleanEmail },
        update: {
          username: cleanUsername,
          name: data.name,
          ...(hashedPassword ? { password: hashedPassword } : {}),
          leaderId: data.leaderId || null,
          level: data.level || 'campana',
          territoryName: data.territoryName || '',
          accountRoleLabel: data.accountRoleLabel || 'Jefe de Campaña',
          avatarBg: data.avatarBg || 'bg-[#9d2449]',
          phone: data.phone || null,
          aboutMe: data.aboutMe || null,
          picture: data.picture || null,
          isSuperAdmin: Boolean(data.isSuperAdmin),
        },
        create: {
          id: data.id,
          email: cleanEmail,
          username: cleanUsername,
          name: data.name,
          password: hashedPassword || null,
          leaderId: data.leaderId || null,
          level: data.level || 'campana',
          territoryName: data.territoryName || '',
          accountRoleLabel: data.accountRoleLabel || 'Jefe de Campaña',
          avatarBg: data.avatarBg || 'bg-[#9d2449]',
          phone: data.phone || null,
          aboutMe: data.aboutMe || null,
          picture: data.picture || null,
          isSuperAdmin: Boolean(data.isSuperAdmin),
        },
      });
    } catch (e: any) {
      console.warn('Aviso guardando cuenta en PostgreSQL:', e.message);
    }

    const responseObj = { ...(savedInDb || accountObj) };
    delete responseObj.password;
    res.status(201).json(responseObj);
  } catch (err: any) {
    res.status(500).json({ error: 'Error al registrar cuenta', message: err.message });
  }
});

// Eliminar cuenta de usuario
app.delete('/api/accounts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'ID requerido' });

    // Eliminar de PostgreSQL
    try {
      await prisma.userAccount.deleteMany({ 
        where: { 
          OR: [
            { id },
            { leaderId: id }
          ]
        } 
      });
    } catch (e) {}

    // Eliminar de archivo local
    const store = readAccountsStore();
    const filtered = store.filter((a: any) => a.id !== id && a.leaderId !== id);
    writeAccountsStore(filtered);

    res.json({ success: true, deletedId: id });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al eliminar cuenta', message: err.message });
  }
});

// --- RUTAS DE PERFIL DE USUARIO Y VALIDACIÓN POR WHATSAPP (EVOLUTION API) ---

// Actualizar datos del perfil de usuario (Nombre, Usuario, Teléfono, Correo, Acerca de mí, Foto selfie)
app.put('/api/profile', async (req, res) => {
  try {
    const userId = req.user?.id || req.body.id;
    if (!userId) {
      return res.status(401).json({ error: 'No autorizado o ID no provisto' });
    }

    const { name, username, email, phone, aboutMe, picture } = req.body;
    const cleanUser = username !== undefined ? String(username).trim().toLowerCase().replace(/^@+/, '') : undefined;
    const cleanEmail = email !== undefined ? String(email).trim().toLowerCase() : undefined;
    const cleanPhone = phone !== undefined ? String(phone).trim() : undefined;
    const cleanName = name !== undefined ? String(name).trim() : undefined;
    const cleanAbout = aboutMe !== undefined ? String(aboutMe).trim() : undefined;

    // 1. Actualizar en PostgreSQL
    let updatedInDb: any = null;
    try {
      updatedInDb = await prisma.userAccount.update({
        where: { id: userId },
        data: {
          ...(cleanName ? { name: cleanName } : {}),
          ...(cleanUser ? { username: cleanUser } : {}),
          ...(cleanEmail ? { email: cleanEmail } : {}),
          ...(cleanPhone !== undefined ? { phone: cleanPhone } : {}),
          ...(cleanAbout !== undefined ? { aboutMe: cleanAbout } : {}),
          ...(picture !== undefined ? { picture } : {}),
        }
      });
    } catch (e: any) {
      if (cleanEmail) {
        try {
          updatedInDb = await prisma.userAccount.update({
            where: { email: cleanEmail },
            data: {
              ...(cleanName ? { name: cleanName } : {}),
              ...(cleanUser ? { username: cleanUser } : {}),
              ...(cleanPhone !== undefined ? { phone: cleanPhone } : {}),
              ...(cleanAbout !== undefined ? { aboutMe: cleanAbout } : {}),
              ...(picture !== undefined ? { picture } : {}),
            }
          });
        } catch {}
      }
    }

    // 2. Actualizar en accounts_store.json
    const accounts = readAccountsStore();
    const accIdx = accounts.findIndex((a: any) => a.id === userId || (cleanEmail && a.email === cleanEmail));
    if (accIdx >= 0) {
      accounts[accIdx] = {
        ...accounts[accIdx],
        ...(cleanName ? { name: cleanName } : {}),
        ...(cleanUser ? { username: cleanUser } : {}),
        ...(cleanEmail ? { email: cleanEmail } : {}),
        ...(cleanPhone !== undefined ? { phone: cleanPhone } : {}),
        ...(cleanAbout !== undefined ? { aboutMe: cleanAbout } : {}),
        ...(picture !== undefined ? { picture } : {}),
        updatedAt: new Date().toISOString(),
      };
      writeAccountsStore(accounts);
    }

    // 3. Sincronizar en líder si tiene leaderId asociado
    const leaderId = updatedInDb?.leaderId || accounts[accIdx]?.leaderId;
    if (leaderId) {
      try {
        await prisma.leader.update({
          where: { id: leaderId },
          data: {
            ...(cleanName ? { name: cleanName } : {}),
            ...(cleanPhone !== undefined ? { phone: cleanPhone } : {}),
            ...(cleanEmail ? { email: cleanEmail } : {}),
            ...(cleanUser ? { username: cleanUser } : {}),
            ...(picture !== undefined ? { photoUrl: picture } : {}),
          }
        });
      } catch {}

      const leadersStore = readBackupStore();
      const lIdx = leadersStore.findIndex((l: any) => l.id === leaderId);
      if (lIdx >= 0) {
        leadersStore[lIdx] = {
          ...leadersStore[lIdx],
          ...(cleanName ? { name: cleanName } : {}),
          ...(cleanPhone !== undefined ? { phone: cleanPhone } : {}),
          ...(cleanEmail ? { email: cleanEmail } : {}),
          ...(cleanUser ? { username: cleanUser } : {}),
          ...(picture !== undefined ? { photoUrl: picture } : {}),
        };
        writeBackupStore(leadersStore);
      }
    }

    const result = updatedInDb || (accIdx >= 0 ? accounts[accIdx] : { id: userId, ...req.body });
    const safeResult = { ...result };
    delete safeResult.password;
    res.json({ success: true, user: safeResult });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al actualizar perfil', message: err.message });
  }
});

// Solicitar código OTP de 6 dígitos por WhatsApp
app.post('/api/auth/profile/send-otp', async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId;
    if (!userId) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    let targetUser: any = null;
    try {
      targetUser = await prisma.userAccount.findUnique({ where: { id: userId } });
    } catch {}
    if (!targetUser) {
      const store = readAccountsStore();
      targetUser = store.find((a: any) => a.id === userId);
    }

    const rawPhone = req.body.phone || targetUser?.phone;
    const digits = String(rawPhone || '').replace(/\D/g, '');

    if (!digits || digits.length < 10) {
      return res.status(400).json({ 
        error: 'El usuario no tiene un número telefónico válido de 10 dígitos asignado. Por favor guarda tu teléfono primero en el perfil.' 
      });
    }

    const otpCode = String(Math.floor(100000 + Math.random() * 900000));
    otpStore.set(userId, {
      code: otpCode,
      phone: digits,
      userId,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    const maskedPhone = digits.slice(-4).padStart(digits.length, '*');
    const config = readWhatsAppConfig();
    const apiUrl = (config.apiUrl || '').trim().replace(/\/+$/, '');
    const apiKey = (config.apiKey || '').trim();
    const instanceName = (config.instanceName || 'validador-territorial').trim();

    let sentViaEvolution = false;
    let evolutionError: string | null = null;

    if (apiUrl && apiKey) {
      try {
        let fullNumber = digits;
        if (digits.length === 10) {
          fullNumber = `${config.countryCode || '52'}${digits}`;
        }

        const msgText = `🔐 *VERTEX ELECTORAL - CÓDIGO DE SEGURIDAD*\n\n` +
          `Tu código de verificación para reestablecer tu contraseña es:\n\n` +
          `👉 *${otpCode}*\n\n` +
          `⏱️ Válido durante 10 minutos.\n` +
          `Por tu seguridad, no compartas este código con nadie.`;

        const waRes = await fetch(`${apiUrl}/message/sendText/${encodeURIComponent(instanceName)}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': apiKey,
          },
          body: JSON.stringify({
            number: fullNumber,
            text: msgText,
          }),
        });

        if (waRes.ok) {
          sentViaEvolution = true;
        } else {
          evolutionError = await waRes.text().catch(() => 'Error de respuesta en Evolution API');
        }
      } catch (e: any) {
        evolutionError = e.message;
      }
    }

    if (sentViaEvolution) {
      res.json({
        success: true,
        method: 'evolution',
        message: `Código enviado exitosamente a tu WhatsApp (${maskedPhone}).`,
        maskedPhone,
      });
    } else {
      const waFallbackLink = `https://wa.me/52${digits.slice(-10)}?text=${encodeURIComponent(`VERTEX - Tu código de verificación es: ${otpCode}`)}`;
      res.json({
        success: true,
        method: 'fallback',
        message: 'Evolution API no está conectado aún en el servidor. Puedes verificar con tu contraseña actual o enviar el código con WhatsApp Web.',
        waLink: waFallbackLink,
        maskedPhone,
        debugError: evolutionError,
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: 'Error al generar código OTP', message: err.message });
  }
});

// Reestablecer contraseña con OTP o Contraseña Actual
app.post('/api/auth/profile/reset-password', async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId;
    if (!userId) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const { currentPassword, otpCode, newPassword } = req.body;
    if (!newPassword || String(newPassword).trim().length < 6) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }

    let currentUser: any = null;
    try {
      currentUser = await prisma.userAccount.findUnique({ where: { id: userId } });
    } catch {}
    if (!currentUser) {
      const store = readAccountsStore();
      currentUser = store.find((a: any) => a.id === userId);
    }

    if (!currentUser) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    let isAuthorized = false;
    if (otpCode) {
      const entry = otpStore.get(userId);
      if (entry && entry.expiresAt > Date.now() && entry.code === String(otpCode).trim()) {
        isAuthorized = true;
        otpStore.delete(userId);
      } else {
        return res.status(400).json({ error: 'Código de verificación de WhatsApp incorrecto o expirado' });
      }
    } else if (currentPassword) {
      const currentHashOrPlain = currentUser.password;
      if (!currentHashOrPlain) {
        isAuthorized = true;
      } else {
        isAuthorized = await verifyPassword(String(currentPassword).trim(), currentHashOrPlain);
        if (!isAuthorized) {
          return res.status(400).json({ error: 'La contraseña actual ingresada es incorrecta' });
        }
      }
    } else {
      return res.status(400).json({ 
        error: 'Debes proporcionar el código de WhatsApp recibido o tu contraseña actual para autorizar el cambio' 
      });
    }

    const cleanNewPass = String(newPassword).trim();
    const newHash = await hashPassword(cleanNewPass);

    try {
      await prisma.userAccount.update({
        where: { id: userId },
        data: { password: newHash }
      });
    } catch (e: any) {
      try {
        await prisma.userAccount.update({
          where: { email: currentUser.email },
          data: { password: newHash }
        });
      } catch {}
    }

    const accounts = readAccountsStore();
    const accIdx = accounts.findIndex((a: any) => a.id === userId || a.email === currentUser.email);
    if (accIdx >= 0) {
      accounts[accIdx].password = newHash;
      accounts[accIdx].updatedAt = new Date().toISOString();
      writeAccountsStore(accounts);
    }

    res.json({ success: true, message: 'Contraseña actualizada con éxito' });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al cambiar contraseña', message: err.message });
  }
});

// Configuración de Evolution API
app.get('/api/whatsapp/config', (_req, res) => {
  try {
    const config = readWhatsAppConfig();
    res.json({
      apiUrl: config.apiUrl,
      instanceName: config.instanceName,
      hasApiKey: Boolean(config.apiKey),
      isConfigured: Boolean(config.apiUrl && config.apiKey),
      countryCode: config.countryCode,
      autoOtpEnabled: config.autoOtpEnabled,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al leer configuración de WhatsApp', message: err.message });
  }
});

app.post('/api/whatsapp/config', (req, res) => {
  try {
    const { apiUrl, apiKey, instanceName, countryCode, autoOtpEnabled } = req.body;
    const current = readWhatsAppConfig();
    const updated: WhatsAppConfig = {
      apiUrl: apiUrl !== undefined ? String(apiUrl).trim().replace(/\/+$/, '') : current.apiUrl,
      apiKey: apiKey !== undefined ? String(apiKey).trim() : current.apiKey,
      instanceName: instanceName !== undefined ? String(instanceName).trim() : current.instanceName,
      countryCode: countryCode !== undefined ? String(countryCode).trim() : current.countryCode,
      autoOtpEnabled: autoOtpEnabled !== undefined ? Boolean(autoOtpEnabled) : current.autoOtpEnabled,
    };
    writeWhatsAppConfig(updated);
    res.json({ success: true, config: { ...updated, apiKey: '***' } });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al guardar configuración de WhatsApp', message: err.message });
  }
});

// Iniciar conexión y obtener Código QR de Evolution API
app.post('/api/whatsapp/instance/connect', async (_req, res) => {
  try {
    const config = readWhatsAppConfig();
    const apiUrl = (config.apiUrl || '').trim().replace(/\/+$/, '');
    const apiKey = (config.apiKey || '').trim();
    const instanceName = (config.instanceName || 'validador-territorial').trim();

    if (!apiUrl || !apiKey) {
      return res.status(400).json({ 
        error: 'Evolution API no configurada. Por favor ingresa la URL y la API Key en el panel.' 
      });
    }

    try {
      await fetch(`${apiUrl}/instance/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': apiKey,
        },
        body: JSON.stringify({
          instanceName: instanceName,
          token: apiKey,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
        }),
      });
    } catch (e: any) {
      console.warn('Aviso en instance/create (puede que ya exista):', e.message);
    }

    const connectRes = await fetch(`${apiUrl}/instance/connect/${encodeURIComponent(instanceName)}`, {
      method: 'GET',
      headers: {
        'apikey': apiKey,
      },
    });

    if (!connectRes.ok) {
      const errTxt = await connectRes.text();
      return res.status(connectRes.status).json({ 
        error: `Error al conectar con Evolution API (${connectRes.status}): ${errTxt}` 
      });
    }

    const data: any = await connectRes.json();
    const qrBase64 = data.base64 || data.qrcode?.base64 || (data.code?.startsWith('data:image') ? data.code : null);
    const pairingCode = data.pairingCode || data.code || null;
    const isAlreadyOpen = data.instance?.state === 'open' || data.state === 'open';

    res.json({
      success: true,
      instanceName,
      qrcode: qrBase64,
      pairingCode,
      isAlreadyOpen,
      raw: data,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al solicitar QR en Evolution API', message: err.message });
  }
});

// Consultar estado de conexión de la instancia
app.get('/api/whatsapp/instance/status', async (_req, res) => {
  try {
    const config = readWhatsAppConfig();
    const apiUrl = (config.apiUrl || '').trim().replace(/\/+$/, '');
    const apiKey = (config.apiKey || '').trim();
    const instanceName = (config.instanceName || 'validador-territorial').trim();

    if (!apiUrl || !apiKey) {
      return res.json({ configured: false, state: 'unconfigured', isConnected: false });
    }

    const stateRes = await fetch(`${apiUrl}/instance/connectionState/${encodeURIComponent(instanceName)}`, {
      headers: { 'apikey': apiKey },
    });

    if (!stateRes.ok) {
      return res.json({ configured: true, state: 'close', isConnected: false, statusHttp: stateRes.status });
    }

    const data: any = await stateRes.json();
    const state = data.instance?.state || data.state || 'close';
    res.json({
      configured: true,
      instanceName,
      state,
      isConnected: state === 'open',
    });
  } catch (err: any) {
    res.json({ configured: true, state: 'error', isConnected: false, error: err.message });
  }
});

// Desconectar o cerrar sesión de la instancia de WhatsApp
app.post('/api/whatsapp/instance/disconnect', async (_req, res) => {
  try {
    const config = readWhatsAppConfig();
    const apiUrl = (config.apiUrl || '').trim().replace(/\/+$/, '');
    const apiKey = (config.apiKey || '').trim();
    const instanceName = (config.instanceName || 'validador-territorial').trim();

    if (!apiUrl || !apiKey) {
      return res.status(400).json({ error: 'Evolution API no configurada.' });
    }

    const discRes = await fetch(`${apiUrl}/instance/logout/${encodeURIComponent(instanceName)}`, {
      method: 'DELETE',
      headers: { 'apikey': apiKey },
    });

    res.json({ success: discRes.ok, message: 'Instancia desconectada' });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al desconectar instancia', message: err.message });
  }
});

// Enviar mensaje de prueba por WhatsApp
app.post('/api/whatsapp/test-message', async (req, res) => {
  try {
    const { number, message } = req.body;
    if (!number) return res.status(400).json({ error: 'Número de teléfono requerido' });

    const config = readWhatsAppConfig();
    const apiUrl = (config.apiUrl || '').trim().replace(/\/+$/, '');
    const apiKey = (config.apiKey || '').trim();
    const instanceName = (config.instanceName || 'validador-territorial').trim();

    if (!apiUrl || !apiKey) {
      return res.status(400).json({ error: 'Evolution API no configurada.' });
    }

    let digits = String(number).replace(/\D/g, '');
    if (digits.length === 10) {
      digits = `${config.countryCode || '52'}${digits}`;
    }

    const sendRes = await fetch(`${apiUrl}/message/sendText/${encodeURIComponent(instanceName)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: JSON.stringify({
        number: digits,
        text: message || '✅ Prueba de conexión exitosa desde VERTEX Electoral.',
      }),
    });

    if (!sendRes.ok) {
      const errTxt = await sendRes.text();
      return res.status(sendRes.status).json({ error: `Error enviando mensaje (${sendRes.status}): ${errTxt}` });
    }

    const data = await sendRes.json();
    res.json({ success: true, result: data });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al enviar mensaje de prueba', message: err.message });
  }
});

// Restablecer contraseña con clave temporal aleatoria de 10 caracteres
app.post('/api/accounts/:id/reset-password', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'ID requerido' });

    const rawId = String(id).trim();
    const cleanId = rawId.toLowerCase();
    const unprefixedId = cleanId.replace(/^@+/, '');
    const prefixedId = '@' + unprefixedId;

    // Generar contraseña aleatoria de 10 caracteres segura
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let tempPass = '';
    for (let i = 0; i < 10; i++) {
      tempPass += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const hashed = await hashPassword(tempPass);

    // 1. Actualizar en PostgreSQL
    let updatedInDbCount = 0;
    try {
      const updateResult = await prisma.userAccount.updateMany({
        where: {
          OR: [
            { id: rawId },
            { id: cleanId },
            { id: `usr-${rawId}` },
            { leaderId: rawId },
            { leaderId: cleanId },
            { email: { equals: cleanId, mode: 'insensitive' } },
            { email: { equals: unprefixedId, mode: 'insensitive' } },
            { username: { equals: cleanId, mode: 'insensitive' } },
            { username: { equals: unprefixedId, mode: 'insensitive' } },
            { username: { equals: prefixedId, mode: 'insensitive' } },
          ]
        },
        data: { password: hashed },
      });
      updatedInDbCount = updateResult.count;
    } catch (e: any) {
      console.warn('Aviso al actualizar contraseña en PostgreSQL:', e.message);
    }

    // 2. Actualizar en archivo local
    const store = readAccountsStore();
    let updatedInStore = false;
    for (let i = 0; i < store.length; i++) {
      const a = store[i];
      const match = 
        a.id === rawId || 
        a.id === cleanId || 
        a.id === `usr-${rawId}` ||
        a.leaderId === rawId || 
        a.leaderId === cleanId ||
        String(a.email || '').toLowerCase() === cleanId ||
        String(a.email || '').toLowerCase() === unprefixedId ||
        String(a.username || '').toLowerCase() === cleanId ||
        String(a.username || '').toLowerCase() === unprefixedId ||
        String(a.username || '').toLowerCase().replace(/^@+/, '') === unprefixedId;
      if (match) {
        store[i].password = hashed;
        store[i].updatedAt = new Date().toISOString();
        updatedInStore = true;
      }
    }

    // 3. Si no existía o no se actualizó, upsertar la cuenta con los datos provistos en el body o del líder
    const bodyData = req.body || {};
    const bodyEmail = String(bodyData.email || '').trim().toLowerCase();
    const bodyUsername = String(bodyData.username || '').trim().toLowerCase().replace(/^@+/, '');
    const bodyName = String(bodyData.name || '').trim();
    const bodyLeaderId = String(bodyData.leaderId || '').trim();
    const bodyPhone = String(bodyData.phone || '').trim();
    const bodyLevel = String(bodyData.level || 'campana').trim();
    const bodyTerritory = String(bodyData.territoryName || '').trim();
    const bodyRole = String(bodyData.role || 'Jefe de Campaña').trim();

    let leader: any = null;
    try {
      leader = await prisma.leader.findFirst({
        where: {
          OR: [
            { id: rawId },
            ...(bodyLeaderId ? [{ id: bodyLeaderId }] : []),
            { email: { equals: cleanId, mode: 'insensitive' } },
            ...(bodyEmail ? [{ email: { equals: bodyEmail, mode: 'insensitive' } }] : []),
            { username: { equals: cleanId, mode: 'insensitive' } },
            { username: { equals: unprefixedId, mode: 'insensitive' } },
          ]
        }
      });
    } catch (e) {}

    if (!leader) {
      const backupStore = readBackupStore();
      leader = backupStore.find((l: any) => 
        l.id === rawId || 
        (bodyLeaderId && l.id === bodyLeaderId) ||
        String(l.email || '').toLowerCase() === cleanId ||
        (bodyEmail && String(l.email || '').toLowerCase() === bodyEmail) ||
        String(l.username || '').toLowerCase() === cleanId ||
        String(l.username || '').toLowerCase().replace(/^@+/, '') === unprefixedId
      );
    }

    const finalEmail = bodyEmail || (leader?.email ? String(leader.email).toLowerCase() : (cleanId.includes('@') ? cleanId : `${unprefixedId || 'usuario'}@campana.mx`));
    const finalUsername = bodyUsername || (leader?.username ? String(leader.username).toLowerCase().replace(/^@+/, '') : (cleanId.includes('@') ? cleanId.split('@')[0] : unprefixedId || 'usuario'));
    const finalName = bodyName || (leader ? leader.name : finalUsername);
    const finalLeaderId = bodyLeaderId || (leader ? leader.id : rawId);
    const finalPhone = bodyPhone || (leader ? leader.phone : undefined);
    const finalLevel = bodyLevel || (leader ? leader.level : 'campana');
    const finalTerritory = bodyTerritory || (leader ? leader.territoryName : '');
    const finalRole = bodyRole || (leader ? leader.role : 'Jefe de Campaña');

    // Siempre garantizar que la cuenta exista en PostgreSQL con la nueva clave temporal
    try {
      await prisma.userAccount.upsert({
        where: { email: finalEmail },
        update: {
          username: finalUsername,
          name: finalName,
          password: hashed,
          leaderId: finalLeaderId || null,
          level: finalLevel,
          territoryName: finalTerritory,
          accountRoleLabel: finalRole,
          avatarBg: 'bg-[#9d2449]',
        },
        create: {
          id: `usr-${finalLeaderId || Date.now()}`,
          email: finalEmail,
          username: finalUsername,
          name: finalName,
          password: hashed,
          leaderId: finalLeaderId || null,
          level: finalLevel,
          territoryName: finalTerritory,
          accountRoleLabel: finalRole,
          avatarBg: 'bg-[#9d2449]',
          isSuperAdmin: false,
        }
      });
      console.log(`✓ Contraseña de cuenta actualizada/creada en PostgreSQL para: ${finalEmail} (@${finalUsername})`);
    } catch (e: any) {
      console.warn('Aviso guardando userAccount en reset-password:', e.message);
    }

    // Siempre garantizar que la cuenta exista en accounts_store.json con la nueva clave temporal
    const finalStore = readAccountsStore();
    const accIdx = finalStore.findIndex((a: any) => 
      String(a.email || '').toLowerCase() === finalEmail || 
      String(a.username || '').toLowerCase() === finalUsername || 
      (finalLeaderId && a.leaderId === finalLeaderId) ||
      a.id === rawId
    );
    const newAccountObj = {
      id: `usr-${finalLeaderId || Date.now()}`,
      email: finalEmail,
      username: finalUsername,
      name: finalName,
      password: hashed,
      leaderId: finalLeaderId || null,
      level: finalLevel,
      territoryName: finalTerritory,
      accountRoleLabel: finalRole,
      avatarBg: 'bg-[#9d2449]',
      isSuperAdmin: false,
      phone: finalPhone,
      updatedAt: new Date().toISOString(),
    };
    if (accIdx >= 0) {
      finalStore[accIdx] = { ...finalStore[accIdx], ...newAccountObj, password: hashed };
    } else {
      finalStore.unshift(newAccountObj);
    }
    writeAccountsStore(finalStore);

    res.json({ success: true, temporaryPassword: tempPass });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al restablecer contraseña', message: err.message });
  }
});

// Autenticación en Sistema Cerrado con JWT (12 horas)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { identifier, password, accountHint } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Usuario o correo y contraseña requeridos' });
    }

    const rawId = String(identifier).trim();
    const cleanId = rawId.toLowerCase();
    const unprefixedId = cleanId.replace(/^@+/, '').trim();
    const prefixedId = '@' + unprefixedId;
    const phoneDigits = rawId.replace(/\D/g, '');
    const cleanPass = String(password).trim();

    const rawSuperEmail = cleanEnvValue(process.env.SUPERADMIN_EMAIL) || cleanEnvValue(process.env.VITE_SUPERADMIN_EMAIL) || 'usrubenroqueguzman@gmail.com';
    const envSuperadminEmail = rawSuperEmail.toLowerCase();
    const envSuperadminUsername = envSuperadminEmail.includes('@') ? envSuperadminEmail.split('@')[0] : envSuperadminEmail;
    const envSuperadminPass = cleanEnvValue(process.env.SUPERADMIN_PASSWORD) || cleanEnvValue(process.env.VITE_SUPERADMIN_PASSWORD) || '';

    // 1. Verificación de credenciales de Super Administrador (desde env)
    const isSuperIdMatch = 
      cleanId === envSuperadminEmail || 
      unprefixedId === envSuperadminUsername || 
      cleanId === 'usrubenroqueguzman@gmail.com' || 
      unprefixedId === 'usrubenroqueguzman';

    if (isSuperIdMatch) {
      if (!envSuperadminPass) {
        return res.status(500).json({ error: 'SUPERADMIN_PASSWORD no configurado en el servidor' });
      }
      const isPassMatch = await verifyPassword(cleanPass, envSuperadminPass);
      if (isPassMatch) {
        const safeUser = {
          id: 'usr-superadmin',
          username: envSuperadminUsername || 'usrubenroqueguzman',
          name: 'Super Administrador',
          email: envSuperadminEmail || 'usrubenroqueguzman@gmail.com',
          leaderId: null,
          level: 'admin',
          territoryName: 'Nivel Central (Acceso Total)',
          accountRoleLabel: 'Super Administrador',
          avatarBg: 'bg-[#9d2449]',
          isSuperAdmin: true,
        };

        const token = jwt.sign(safeUser, JWT_SECRET, { expiresIn: '12h' });
        return res.json({ user: safeUser, token });
      }
    }

    // 2. Verificación de usuarios creados en PostgreSQL o en accounts_store.json
    let usersFromDb: any[] = [];
    try {
      usersFromDb = await prisma.userAccount.findMany({
        where: {
          OR: [
            { email: { equals: cleanId, mode: 'insensitive' } },
            { email: { equals: unprefixedId, mode: 'insensitive' } },
            { username: { equals: cleanId, mode: 'insensitive' } },
            { username: { equals: unprefixedId, mode: 'insensitive' } },
            { username: { equals: prefixedId, mode: 'insensitive' } },
            { id: rawId },
            { leaderId: rawId },
          ]
        }
      });
    } catch (e: any) {
      console.warn('Aviso consultando userAccount en PostgreSQL:', e.message);
    }

    const fileAccounts = readAccountsStore();
    const usersFromFile = fileAccounts.filter((a: any) => {
      const aEmail = String(a.email || '').toLowerCase();
      const aUser = String(a.username || '').toLowerCase();
      const aUserClean = aUser.replace(/^@+/, '');
      const aPhone = String(a.phone || '').replace(/\D/g, '');
      return (
        aEmail === cleanId ||
        aEmail === unprefixedId ||
        aUser === cleanId ||
        aUser === unprefixedId ||
        aUserClean === unprefixedId ||
        a.id === rawId ||
        a.leaderId === rawId ||
        (phoneDigits.length >= 7 && aPhone.includes(phoneDigits))
      );
    });

    // Si aún no encontramos registros de cuenta, buscar en la tabla de Líderes por teléfono, email o usuario
    if (usersFromDb.length === 0 && usersFromFile.length === 0) {
      let leadersFound: any[] = [];
      try {
        leadersFound = await prisma.leader.findMany({
          where: {
            OR: [
              { email: { equals: cleanId, mode: 'insensitive' } },
              { email: { equals: unprefixedId, mode: 'insensitive' } },
              { username: { equals: cleanId, mode: 'insensitive' } },
              { username: { equals: unprefixedId, mode: 'insensitive' } },
              { username: { equals: prefixedId, mode: 'insensitive' } },
              ...(phoneDigits.length >= 7 ? [{ phone: { contains: phoneDigits } }] : [])
            ]
          }
        });
      } catch (e) {}

      if (leadersFound.length === 0) {
        const backupStore = readBackupStore();
        leadersFound = backupStore.filter((l: any) => {
          const lEmail = String(l.email || '').toLowerCase();
          const lUser = String(l.username || '').toLowerCase();
          const lUserClean = lUser.replace(/^@+/, '');
          const lPhone = String(l.phone || '').replace(/\D/g, '');
          return (
            lEmail === cleanId ||
            lEmail === unprefixedId ||
            lUser === cleanId ||
            lUser === unprefixedId ||
            lUserClean === unprefixedId ||
            (phoneDigits.length >= 7 && lPhone.includes(phoneDigits))
          );
        });
      }

      for (const ld of leadersFound) {
        const matchAcc = fileAccounts.find((a: any) => a.leaderId === ld.id || a.email === ld.email);
        if (matchAcc && !usersFromFile.includes(matchAcc)) {
          usersFromFile.push(matchAcc);
        }
      }
    }

    // Reunir todos los candidatos encontrados
    const candidateMap = new Map<string, any>();
    for (const u of [...usersFromDb, ...usersFromFile]) {
      if (u && u.id) candidateMap.set(u.id, { ...(candidateMap.get(u.id) || {}), ...u });
    }
    const candidates = Array.from(candidateMap.values());

    // Probar contraseña contra los candidatos
    let validUser: any = null;
    let matchedHash = '';

    for (const cand of candidates) {
      const candidatePass = cleanEnvValue(cand.password);
      if (!candidatePass) continue;
      const isMatch = await verifyPassword(cleanPass, candidatePass);
      if (isMatch) {
        validUser = cand;
        matchedHash = candidatePass;
        break;
      }
    }

    // Si no coincidió con los candidatos cargados, verificar con accountHint (resiliencia ante reinicio o desincronización)
    if (!validUser && accountHint) {
      const hintEmail = String(accountHint.email || '').trim().toLowerCase();
      const hintUser = String(accountHint.username || '').trim().toLowerCase().replace(/^@+/, '');
      const isHintIdentifierMatch = 
        hintEmail === cleanId || 
        hintEmail === unprefixedId ||
        hintUser === cleanId ||
        hintUser === unprefixedId;

      if (isHintIdentifierMatch) {
        const hintPass = cleanEnvValue(accountHint.password);
        let hintMatches = false;
        if (hintPass) {
          hintMatches = await verifyPassword(cleanPass, hintPass);
        } else {
          // Si el usuario ingresa la clave temporal de 10 caracteres recién generada
          hintMatches = cleanPass.length >= 6;
        }

        if (hintMatches) {
          const finalHash = await hashPassword(cleanPass);
          const newUserId = accountHint.id || `usr-${Date.now()}`;
          const newLeaderId = accountHint.leaderId || null;
          const newName = accountHint.name || hintUser;

          try {
            await prisma.userAccount.upsert({
              where: { email: hintEmail },
              update: {
                username: hintUser,
                name: newName,
                password: finalHash,
                leaderId: newLeaderId,
                level: accountHint.level || 'campana',
                territoryName: accountHint.territoryName || '',
                accountRoleLabel: accountHint.accountRoleLabel || 'Jefe de Campaña',
                avatarBg: accountHint.avatarBg || 'bg-[#9d2449]',
              },
              create: {
                id: newUserId,
                email: hintEmail,
                username: hintUser,
                name: newName,
                password: finalHash,
                leaderId: newLeaderId,
                level: accountHint.level || 'campana',
                territoryName: accountHint.territoryName || '',
                accountRoleLabel: accountHint.accountRoleLabel || 'Jefe de Campaña',
                avatarBg: accountHint.avatarBg || 'bg-[#9d2449]',
                isSuperAdmin: false,
              }
            });
            console.log(`✓ Cuenta recreada exitosamente en PostgreSQL desde hint para: ${hintEmail}`);
          } catch (e: any) {
            console.warn('Aviso recreando cuenta desde accountHint en DB:', e.message);
          }

          const storeAccObj = {
            ...accountHint,
            id: newUserId,
            email: hintEmail,
            username: hintUser,
            password: finalHash,
            updatedAt: new Date().toISOString(),
          };
          const fAccounts = readAccountsStore();
          const fIdx = fAccounts.findIndex((a: any) => a.email === hintEmail || a.id === newUserId);
          if (fIdx >= 0) {
            fAccounts[fIdx] = { ...fAccounts[fIdx], ...storeAccObj };
          } else {
            fAccounts.unshift(storeAccObj);
          }
          writeAccountsStore(fAccounts);

          validUser = storeAccObj;
          matchedHash = finalHash;
        }
      }
    }

    if (validUser) {
      let currentHash = matchedHash;
      if (!currentHash.startsWith('$2a$') && !currentHash.startsWith('$2b$')) {
        currentHash = await hashPassword(cleanPass);
      }

      // Sincronizar de inmediato la contraseña correcta a PostgreSQL y al store de archivo
      try {
        await prisma.userAccount.updateMany({
          where: {
            OR: [
              { id: validUser.id },
              { email: validUser.email },
              ...(validUser.leaderId ? [{ leaderId: validUser.leaderId }] : [])
            ]
          },
          data: { password: currentHash }
        });
      } catch {}

      const storeIdx = fileAccounts.findIndex((a: any) => a.id === validUser.id || a.email === validUser.email);
      if (storeIdx >= 0) {
        fileAccounts[storeIdx].password = currentHash;
        writeAccountsStore(fileAccounts);
      } else {
        fileAccounts.unshift({ ...validUser, password: currentHash });
        writeAccountsStore(fileAccounts);
      }

      const safeUser = { ...validUser };
      delete safeUser.password;

      const tokenPayload: AuthTokenPayload = {
        id: safeUser.id,
        username: safeUser.username,
        name: safeUser.name,
        email: safeUser.email,
        level: safeUser.level || 'campana',
        leaderId: safeUser.leaderId || null,
        isSuperAdmin: Boolean(safeUser.isSuperAdmin),
        territoryName: safeUser.territoryName || '',
        accountRoleLabel: safeUser.accountRoleLabel || 'Jefe de Campaña',
        avatarBg: safeUser.avatarBg || 'bg-[#9d2449]',
      };

      const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '12h' });
      return res.json({ user: safeUser, token });
    }

    return res.status(401).json({ error: 'Credenciales incorrectas. Verifica tu usuario/correo y contraseña.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Error en autenticación', message: err.message });
  }
});

// Endpoint para que el Super Administrador obtenga un token firmado para impersonar
app.post('/api/auth/impersonate', async (req, res) => {
  try {
    if (!req.user || (!req.user.isSuperAdmin && req.user.level !== 'admin')) {
      return res.status(403).json({ error: 'Solo el Super Administrador puede impersonar cuentas.' });
    }

    const { accountId, leaderId } = req.body;
    if (!accountId && !leaderId) {
      return res.status(400).json({ error: 'accountId o leaderId requerido' });
    }

    let targetAcc: any = null;
    try {
      targetAcc = await prisma.userAccount.findFirst({
        where: {
          OR: [
            ...(accountId ? [{ id: accountId }] : []),
            ...(leaderId ? [{ leaderId: leaderId }, { id: leaderId }] : [])
          ]
        }
      });
    } catch {}

    if (!targetAcc) {
      const fileStore = readAccountsStore();
      targetAcc = fileStore.find((a: any) => 
        (accountId && a.id === accountId) || 
        (leaderId && (a.leaderId === leaderId || a.id === leaderId))
      );
    }

    if (!targetAcc && leaderId) {
      const leadersStore = readBackupStore();
      const leader = leadersStore.find((l: any) => l.id === leaderId);
      if (leader) {
        targetAcc = {
          id: `usr-${leader.id}`,
          username: leader.username || 'usuario',
          name: leader.name,
          email: leader.email || `${leader.username || 'usuario'}@campana.mx`,
          leaderId: leader.id,
          level: leader.level || 'campana',
          territoryName: leader.territoryName || '',
          accountRoleLabel: leader.role || 'Jefe de Campaña',
          avatarBg: leader.avatarBg || 'bg-[#9d2449]',
          isSuperAdmin: false,
        };
      }
    }

    if (!targetAcc) {
      return res.status(404).json({ error: 'Usuario no encontrado para impersonar' });
    }

    const safeUser = { ...targetAcc };
    delete safeUser.password;

    const tokenPayload: AuthTokenPayload = {
      id: safeUser.id,
      username: safeUser.username,
      name: safeUser.name,
      email: safeUser.email,
      level: safeUser.level || 'campana',
      leaderId: safeUser.leaderId || null,
      isSuperAdmin: false,
      territoryName: safeUser.territoryName || '',
      accountRoleLabel: safeUser.accountRoleLabel || 'Jefe de Campaña',
      avatarBg: safeUser.avatarBg || 'bg-[#9d2449]',
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '6h' });
    res.json({ user: safeUser, token });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al impersonar usuario', message: err.message });
  }
});

// Estado de disponibilidad de OCR (Servicio Autohospedado en Servidor Propio)
app.get('/api/gemini-status', (req, res) => {
  res.json({ available: true, mode: 'local_paddleocr' });
});

// Endpoint de Extracción de Datos de INE con PaddleOCR Autohospedado ($0 costo)
app.post('/api/scan-ine-ai', async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Imagen requerida' });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
    const mimeMatch = imageBase64.match(/^data:(image\/[a-zA-Z+]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

    const ocrServerUrl = process.env.LOCAL_OCR_URL || 'https://legislab-paddle-ocr.ewar01.easypanel.host';
    const buffer = Buffer.from(cleanBase64, 'base64');
    const blob = new Blob([buffer], { type: mimeType });
    const formData = new FormData();
    formData.append('file', blob, 'ine.jpg');

    const ocrRes = await fetch(`${ocrServerUrl.replace(/\/$/, '')}/scan-ine`, {
      method: 'POST',
      body: formData,
    });

    if (!ocrRes.ok) {
      const errText = await ocrRes.text();
      console.error('Error al conectar con el servidor OCR:', errText);
      return res.status(502).json({ error: 'Error en el servidor de OCR', details: errText });
    }

    const ocrData: any = await ocrRes.json();
    return res.json({
      isValidINE: Boolean(ocrData.isValidINE),
      isReadable: Boolean(ocrData.isReadable ?? (ocrData.rawTexts && ocrData.rawTexts.length > 1)),
      name: ocrData.name || ocrData.fullName || '',
      claveElector: ocrData.claveElector || '',
      curp: ocrData.curp || '',
      electoralSection: ocrData.electoralSection || '',
      address: ocrData.address || '',
      colonia: ocrData.colonia || '',
      municipio: ocrData.municipio || '',
      vigencia: ocrData.vigencia || '',
      sexo: ocrData.sexo || '',
      detectedSide: ocrData.detectedSide || 'anverso',
      confidenceScore: 95,
      source: 'paddleocr-selfhosted'
    });
  } catch (err: any) {
    console.error('Error en /api/scan-ine-ai:', err);
    res.status(500).json({ error: 'Error al procesar la imagen con OCR', message: err.message });
  }
});

// --- LEADERS API CON RESPALDO RESILIENTE Y CAMPOS COMPLETOS ---

function readDeletedStore(): Set<string> {
  try {
    if (!fs.existsSync(STORE_DIR)) fs.mkdirSync(STORE_DIR, { recursive: true });
    if (fs.existsSync(DELETED_FILE)) {
      const content = fs.readFileSync(DELETED_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return new Set(parsed);
    }
  } catch (e) {
    console.warn('Error reading deleted store:', e);
  }
  return new Set();
}

function addDeletedId(id: string) {
  try {
    const deletedSet = readDeletedStore();
    deletedSet.add(id);
    if (!fs.existsSync(STORE_DIR)) fs.mkdirSync(STORE_DIR, { recursive: true });
    fs.writeFileSync(DELETED_FILE, JSON.stringify(Array.from(deletedSet), null, 2), 'utf-8');
  } catch (e) {
    console.warn('Error writing deleted store:', e);
  }
}

function removeDeletedId(id: string) {
  try {
    const deletedSet = readDeletedStore();
    if (deletedSet.has(id)) {
      deletedSet.delete(id);
      fs.writeFileSync(DELETED_FILE, JSON.stringify(Array.from(deletedSet), null, 2), 'utf-8');
    }
  } catch (e) {}
}

function readBackupStore(): any[] {
  try {
    if (!fs.existsSync(STORE_DIR)) fs.mkdirSync(STORE_DIR, { recursive: true });
    if (fs.existsSync(STORE_FILE)) {
      const content = fs.readFileSync(STORE_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading backup store:', e);
  }
  return [];
}

function writeBackupStore(leaders: any[]) {
  try {
    if (!fs.existsSync(STORE_DIR)) fs.mkdirSync(STORE_DIR, { recursive: true });
    fs.writeFileSync(STORE_FILE, JSON.stringify(leaders, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Error writing backup store:', e);
  }
}

app.get('/api/leaders', async (req, res) => {
  try {
    let dbLeaders: any[] = [];
    try {
      dbLeaders = await prisma.leader.findMany({
        orderBy: [{ levelIndex: 'asc' }, { name: 'asc' }],
      });
    } catch (dbErr: any) {
      console.warn('Aviso al consultar PostgreSQL:', dbErr.message);
    }

    const fileLeaders = readBackupStore();
    const deletedSet = readDeletedStore();
    
    // Combinar registros reales asegurando que no se pierda ninguno y omitir eliminados
    const mergedMap = new Map<string, any>();
    for (const l of fileLeaders) {
      if (!deletedSet.has(l.id)) {
        mergedMap.set(l.id, l);
      }
    }
    for (const l of dbLeaders) {
      if (!deletedSet.has(l.id)) {
        const existing = mergedMap.get(l.id) || {};
        mergedMap.set(l.id, { ...existing, ...l });
      }
    }

    // Vincular promovidos sin padre asignado al promotor responsable de su sección
    for (const [id, item] of mergedMap.entries()) {
      if (item.level === 'promovido' && (!item.parentId || item.parentId === 'null')) {
        const promoter = Array.from(mergedMap.values()).find(l => 
          l.level === 'promotor' && 
          (
            (Array.isArray(l.assignedSections) && l.assignedSections.includes(item.electoralSection)) ||
            l.electoralSection === item.electoralSection
          )
        );
        if (promoter) {
          mergedMap.set(id, { ...item, parentId: promoter.id });
        }
      }
    }

    let result = Array.from(mergedMap.values()).filter(l => !deletedSet.has(l.id));
    if (result.length > fileLeaders.length) {
      writeBackupStore(result);
    }

    // Autorización por subárbol: admin ve todo, el resto solo su subárbol
    if (req.user && !req.user.isSuperAdmin && req.user.level !== 'admin') {
      if (!req.user.leaderId) {
        result = [];
      } else {
        const subtreeIds = getSubtreeLeaderIds(req.user.leaderId, result);
        result = result.filter(l => subtreeIds.has(l.id));
      }
    }

    res.json(result);
  } catch (err: any) {
    console.warn('Aviso general en /api/leaders:', err.message);
    const fallback = readBackupStore();
    const deletedSet = readDeletedStore();
    let safeFallback = fallback.filter(l => !deletedSet.has(l.id));
    if (req.user && !req.user.isSuperAdmin && req.user.level !== 'admin') {
      if (!req.user.leaderId) {
        safeFallback = [];
      } else {
        const subtreeIds = getSubtreeLeaderIds(req.user.leaderId, safeFallback);
        safeFallback = safeFallback.filter(l => subtreeIds.has(l.id));
      }
    }
    res.json(safeFallback);
  }
});

// Endpoint para sincronizar registros eliminados entre dispositivos (Tombstones)
app.get('/api/deleted-leaders', (req, res) => {
  try {
    const deletedSet = readDeletedStore();
    res.json(Array.from(deletedSet));
  } catch (err: any) {
    res.json([]);
  }
});

// Restaurar líder eliminado (Solo Admin)
app.post('/api/leaders/:id/restore', async (req, res) => {
  try {
    if (req.user && !req.user.isSuperAdmin && req.user.level !== 'admin') {
      return res.status(403).json({ error: 'Solo el Super Administrador puede restaurar integrantes.' });
    }
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'ID requerido' });
    removeDeletedId(id);
    res.json({ success: true, restoredId: id });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al restaurar líder', message: err.message });
  }
});

app.post('/api/leaders', async (req, res) => {
  try {
    const data = req.body;
    if (!data.id) {
      data.id = `node-${Date.now()}`;
    }

    // Regla de jerarquía estricta obligatoria
    if (req.user) {
      if (req.user.level === 'admin' || req.user.isSuperAdmin) {
        if (data.level !== 'cpv' && data.level !== 'campana') {
          return res.status(403).json({ error: 'El Super Administrador solo puede dar de alta Coordinador de Promoción al Voto (CPV).' });
        }
        data.parentId = null;
      } else {
        const allowedChild = getAllowedChildLevel(req.user.level);
        const isMatch = data.level === allowedChild ||
          (allowedChild === 'cpv' && data.level === 'campana') ||
          (allowedChild === 'seccion' && (data.level === 'territorial' || data.level === 'seccional'));
        if (!isMatch) {
          return res.status(403).json({ error: `Tu nivel solo puede crear subordinados directos de nivel "${allowedChild}".` });
        }
        data.parentId = req.user.leaderId;
      }
    }

    const deletedSet = readDeletedStore();
    // Bloquear resurrección de registros eliminados desde clientes desactualizados
    if (deletedSet.has(data.id) && !data.reRegister) {
      console.warn(`Resurrección bloqueada para registro eliminado: ${data.id}`);
      return res.status(409).json({ error: 'Registro eliminado previamente', id: data.id, deleted: true });
    }

    if (data.reRegister) {
      removeDeletedId(data.id);
    }

    // 1. Guardar de inmediato en almacenamiento resiliente central
    const currentStore = readBackupStore();

    if (data.level === 'promovido' && (!data.parentId || data.parentId === 'null')) {
      const matchPromoter = currentStore.find((l: any) => 
        l.level === 'promotor' && 
        (
          (Array.isArray(l.assignedSections) && l.assignedSections.includes(data.electoralSection)) ||
          l.electoralSection === data.electoralSection
        )
      );
      if (matchPromoter) {
        data.parentId = matchPromoter.id;
      }
    }
    const existingIndex = currentStore.findIndex((l: any) => l.id === data.id);
    if (existingIndex >= 0) {
      currentStore[existingIndex] = { ...currentStore[existingIndex], ...data };
    } else {
      currentStore.push(data);
    }
    writeBackupStore(currentStore);

    // 2. Persistir en PostgreSQL
    let createdInDb = null;
    try {
      // Validar si el padre existe antes de asignar parentId para evitar violación de FK
      let safeParentId = data.parentId || null;
      if (safeParentId) {
        const parentExists = await prisma.leader.findUnique({ where: { id: safeParentId } });
        if (!parentExists) safeParentId = null;
      }

      createdInDb = await prisma.leader.upsert({
        where: { id: data.id },
        update: {
          name: data.name,
          firstName: data.firstName || null,
          paternalLastName: data.paternalLastName || null,
          maternalLastName: data.maternalLastName || null,
          role: data.role,
          level: data.level,
          levelIndex: Number(data.levelIndex) || 0,
          parentId: safeParentId,
          territoryName: data.territoryName,
          code: data.code || null,
          phone: data.phone || null,
          email: data.email || null,
          username: data.username || null,
          hasAccount: data.hasAccount ?? (data.level !== 'promovido'),
          metaGoal: Number(data.metaGoal) || 0,
          currentCount: Number(data.currentCount) || 0,
          status: data.status || 'en_progreso',
          validationStatus: data.validationStatus || 'validado',
          notes: data.notes || null,
          notesHistory: data.notesHistory ? JSON.parse(JSON.stringify(data.notesHistory)) : null,
          avatarBg: data.avatarBg || 'bg-indigo-600',
          address: data.address || null,
          colonia: data.colonia || null,
          postalCode: data.postalCode || null,
          electoralSection: data.electoralSection || null,
          assignedSections: Array.isArray(data.assignedSections) ? data.assignedSections : [],
          curp: data.curp || null,
          electorKey: data.electorKey || null,
          inePhotoUrl: data.inePhotoUrl || null,
          ineAnversoUrl: data.ineAnversoUrl || null,
          ineReversoUrl: data.ineReversoUrl || null,
          photoUrl: data.photoUrl || data.inePhotoUrl || null,
          vigencia: data.vigencia || null,
          changelog: data.changelog ? JSON.parse(JSON.stringify(data.changelog)) : null,
        },
        create: {
          id: data.id,
          name: data.name,
          firstName: data.firstName || null,
          paternalLastName: data.paternalLastName || null,
          maternalLastName: data.maternalLastName || null,
          role: data.role,
          level: data.level,
          levelIndex: Number(data.levelIndex) || 0,
          parentId: safeParentId,
          territoryName: data.territoryName,
          code: data.code || null,
          phone: data.phone || null,
          email: data.email || null,
          username: data.username || null,
          hasAccount: data.hasAccount ?? (data.level !== 'promovido'),
          metaGoal: Number(data.metaGoal) || 0,
          currentCount: Number(data.currentCount) || 0,
          status: data.status || 'en_progreso',
          validationStatus: data.validationStatus || 'validado',
          notes: data.notes || null,
          notesHistory: data.notesHistory ? JSON.parse(JSON.stringify(data.notesHistory)) : null,
          avatarBg: data.avatarBg || 'bg-indigo-600',
          address: data.address || null,
          colonia: data.colonia || null,
          postalCode: data.postalCode || null,
          electoralSection: data.electoralSection || null,
          assignedSections: Array.isArray(data.assignedSections) ? data.assignedSections : [],
          curp: data.curp || null,
          electorKey: data.electorKey || null,
          inePhotoUrl: data.inePhotoUrl || null,
          ineAnversoUrl: data.ineAnversoUrl || null,
          ineReversoUrl: data.ineReversoUrl || null,
          photoUrl: data.photoUrl || data.inePhotoUrl || null,
          vigencia: data.vigencia || null,
          changelog: data.changelog ? JSON.parse(JSON.stringify(data.changelog)) : null,
        },
      });
    } catch (dbErr: any) {
      console.warn('Aviso guardando en PostgreSQL (respaldo en archivo activo):', dbErr.message);
    }

    res.status(201).json(createdInDb || data);
  } catch (err: any) {
    console.error('Error creating leader:', err);
    res.status(500).json({ error: 'Error al registrar líder', details: err.message });
  }
});

app.put('/api/leaders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const currentStore = readBackupStore();

    // Validar autorización: admin o superior directo
    if (req.user && !req.user.isSuperAdmin && req.user.level !== 'admin') {
      const target = currentStore.find((l: any) => l.id === id);
      if (target && target.parentId !== req.user.leaderId) {
        return res.status(403).json({ error: 'Solo puedes editar a tus subordinados directos.' });
      }
    }

    const deletedSet = readDeletedStore();
    if (deletedSet.has(id) && !data.reRegister) {
      console.warn(`Intento de actualización bloqueado para registro eliminado: ${id}`);
      return res.status(409).json({ error: 'Registro eliminado previamente', id, deleted: true });
    }

    if (data.reRegister) {
      removeDeletedId(id);
    }

    // 1. Actualizar en respaldo central
    const idx = currentStore.findIndex((l: any) => l.id === id);
    if (idx >= 0) {
      currentStore[idx] = { ...currentStore[idx], ...data };
    } else {
      currentStore.push({ ...data, id });
    }
    writeBackupStore(currentStore);

    // 2. Actualizar en PostgreSQL
    let updatedInDb = null;
    try {
      let safeParentId = data.parentId || null;
      if ((!safeParentId || safeParentId === 'null') && data.level === 'promovido') {
        const matchPromoter = currentStore.find((l: any) => 
          l.level === 'promotor' && 
          (
            (Array.isArray(l.assignedSections) && l.assignedSections.includes(data.electoralSection)) ||
            l.electoralSection === data.electoralSection
          )
        );
        if (matchPromoter) {
          safeParentId = matchPromoter.id;
        }
      }
      if (safeParentId) {
        const parentExists = await prisma.leader.findUnique({ where: { id: safeParentId } });
        if (!parentExists) safeParentId = null;
      }

      updatedInDb = await prisma.leader.update({
        where: { id },
        data: {
          name: data.name,
          firstName: data.firstName || null,
          paternalLastName: data.paternalLastName || null,
          maternalLastName: data.maternalLastName || null,
          role: data.role,
          level: data.level,
          levelIndex: Number(data.levelIndex) || 0,
          parentId: safeParentId,
          territoryName: data.territoryName,
          code: data.code || null,
          phone: data.phone || null,
          email: data.email || null,
          username: data.username || null,
          hasAccount: data.hasAccount ?? (data.level !== 'promovido'),
          metaGoal: Number(data.metaGoal) || 0,
          currentCount: Number(data.currentCount) || 0,
          status: data.status,
          validationStatus: data.validationStatus,
          notes: data.notes || null,
          notesHistory: data.notesHistory ? JSON.parse(JSON.stringify(data.notesHistory)) : null,
          avatarBg: data.avatarBg,
          address: data.address || null,
          colonia: data.colonia || null,
          postalCode: data.postalCode || null,
          electoralSection: data.electoralSection || null,
          assignedSections: Array.isArray(data.assignedSections) ? data.assignedSections : [],
          curp: data.curp || null,
          electorKey: data.electorKey || null,
          inePhotoUrl: data.inePhotoUrl || null,
          ineAnversoUrl: data.ineAnversoUrl || null,
          ineReversoUrl: data.ineReversoUrl || null,
          photoUrl: data.photoUrl || data.inePhotoUrl || null,
          vigencia: data.vigencia || null,
          changelog: data.changelog ? JSON.parse(JSON.stringify(data.changelog)) : null,
        },
      });
    } catch (dbErr: any) {
      console.warn('Aviso actualizando en PostgreSQL (respaldo en archivo activo):', dbErr.message);
    }

    res.json(updatedInDb || data);
  } catch (err: any) {
    console.error('Error updating leader:', err);
    res.status(500).json({ error: 'Error al actualizar líder', details: err.message });
  }
});

app.delete('/api/leaders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const currentStore = readBackupStore();

    // Validar autorización: admin o superior directo
    if (req.user && !req.user.isSuperAdmin && req.user.level !== 'admin') {
      const target = currentStore.find((l: any) => l.id === id);
      if (target && target.parentId !== req.user.leaderId) {
        return res.status(403).json({ error: 'Solo puedes eliminar a tus subordinados directos.' });
      }
    }

    // Regla estricta: Bloquear si tiene subordinados directos (no reasignar al abuelo)
    const directSubs = currentStore.filter((l: any) => l.parentId === id);
    if (directSubs.length > 0) {
      return res.status(400).json({ 
        error: `Reasigna o elimina primero a sus ${directSubs.length} subordinados.` 
      });
    }

    // 1. Marcar como borrado definitivo (tombstone)
    addDeletedId(id);

    // 2. Eliminar de almacenamiento central resiliente
    const filteredStore = currentStore.filter((l: any) => l.id !== id);
    writeBackupStore(filteredStore);

    // 3. Eliminar cuenta de usuario asociada en backend (Phase 2 item 2.8)
    try {
      await prisma.userAccount.deleteMany({ where: { leaderId: id } });
    } catch {}
    const accStore = readAccountsStore();
    const filteredAcc = accStore.filter((a: any) => a.leaderId !== id);
    writeAccountsStore(filteredAcc);

    // 4. Eliminar de PostgreSQL si existe (usando deleteMany para no fallar si no existe en la BD)
    try {
      await prisma.leader.deleteMany({ where: { id } });
    } catch (dbErr: any) {
      console.warn('Aviso eliminando en PostgreSQL:', dbErr.message);
    }

    res.json({ success: true, deletedId: id });
  } catch (err: any) {
    console.error('Error deleting leader:', err);
    res.status(500).json({ error: 'Error al eliminar líder', details: err.message });
  }
});

// --- SECTIONS API ---

app.get('/api/sections', async (req, res) => {
  try {
    const sections = await prisma.electoralSection.findMany({
      include: { structures: true },
      orderBy: { sectionNumber: 'asc' },
    });
    res.json(sections);
  } catch (err: any) {
    res.status(500).json({ error: 'Error al obtener secciones', details: err.message });
  }
});

app.post('/api/sections', async (req, res) => {
  try {
    const data = req.body;
    const created = await prisma.electoralSection.create({
      data: {
        id: data.id || `sec-${data.sectionNumber}`,
        sectionNumber: data.sectionNumber,
        district: data.district,
        municipality: data.municipality,
        nominalList: Number(data.nominalList) || 0,
        geometry: data.geometry ? data.geometry : undefined,
      },
      include: { structures: true },
    });
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: 'Error al crear sección', details: err.message });
  }
});

app.post('/api/sections/:id/structures', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const createdStructure = await prisma.sectionStructure.create({
      data: {
        id: data.id || `struct-${Date.now()}`,
        sectionId: id,
        name: data.name,
        leaderName: data.leaderName,
        targetCount: Number(data.targetCount) || 0,
        currentCount: Number(data.currentCount) || 0,
        status: data.status || 'en_progreso',
        rootLeaderId: data.rootLeaderId || null,
        color: data.color || 'bg-sky-500',
      },
    });

    res.status(201).json(createdStructure);
  } catch (err: any) {
    res.status(500).json({ error: 'Error al agregar estructura', details: err.message });
  }
});

// --- NATIONAL ELECTORAL CATALOG API ---

// Lista de Estados y Resumen Nacional
app.get('/api/catalog/states', async (req, res) => {
  try {
    const statesJsonPath = path.resolve(__dirname, '../src/data/nationalStatesSummary.json');
    if (fs.existsSync(statesJsonPath)) {
      const data = JSON.parse(fs.readFileSync(statesJsonPath, 'utf-8'));
      return res.json(data);
    }

    const states = await prisma.electoralSectionCatalog.groupBy({
      by: ['stateId', 'stateName'],
      _count: { section: true },
      _sum: {
        nominalTotal: true,
        nominalMen: true,
        nominalWomen: true,
        nominalNonBinary: true,
      },
      orderBy: { stateId: 'asc' },
    });
    res.json(states);
  } catch (err: any) {
    res.status(500).json({ error: 'Error al consultar estados', details: err.message });
  }
});

// Secciones del Catálogo con Filtros por Estado, Municipio y Búsqueda
app.get('/api/catalog/sections', async (req, res) => {
  try {
    const stateId = req.query.stateId ? Number(req.query.stateId) : 27; // Default 27 (Tabasco)
    const municipalityName = req.query.municipality as string;
    const localDistrict = req.query.localDistrict ? Number(req.query.localDistrict) : undefined;
    const federalDistrict = req.query.federalDistrict ? Number(req.query.federalDistrict) : undefined;
    const search = req.query.search as string;
    const limit = req.query.limit ? Number(req.query.limit) : 200;

    // Fallback a JSON local para Tabasco si la BD aún está sembrando
    if (stateId === 27) {
      const tabJsonPath = path.resolve(__dirname, '../src/data/tabascoCatalog.json');
      if (fs.existsSync(tabJsonPath)) {
        let sections = JSON.parse(fs.readFileSync(tabJsonPath, 'utf-8'));
        if (municipalityName && municipalityName !== 'all') {
          sections = sections.filter((s: any) => s.municipalityName === municipalityName);
        }
        if (localDistrict) {
          sections = sections.filter((s: any) => s.localDistrict === localDistrict);
        }
        if (federalDistrict) {
          sections = sections.filter((s: any) => s.federalDistrict === federalDistrict);
        }
        if (search) {
          const q = search.trim().toLowerCase();
          sections = sections.filter((s: any) => s.section.includes(q) || s.municipalityName.toLowerCase().includes(q));
        }
        return res.json(sections.slice(0, limit));
      }
    }

    const where: any = { stateId };
    if (municipalityName && municipalityName !== 'all') where.municipalityName = municipalityName;
    if (localDistrict) where.localDistrict = localDistrict;
    if (federalDistrict) where.federalDistrict = federalDistrict;
    if (search) {
      where.OR = [
        { section: { contains: search } },
        { municipalityName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const sections = await prisma.electoralSectionCatalog.findMany({
      where,
      take: limit,
      orderBy: { section: 'asc' },
    });
    res.json(sections);
  } catch (err: any) {
    res.status(500).json({ error: 'Error al consultar catálogo de secciones', details: err.message });
  }
});

// --- SUPPORT TICKETS API (SAAS SUPERADMIN <-> COORDINADORES DE CAMPAÑA) ---

function readTicketsStore(): any[] {
  try {
    if (!fs.existsSync(STORE_DIR)) fs.mkdirSync(STORE_DIR, { recursive: true });
    if (fs.existsSync(TICKETS_FILE)) {
      const content = fs.readFileSync(TICKETS_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Error reading tickets store:', e);
  }
  return [];
}

function writeTicketsStore(tickets: any[]) {
  try {
    if (!fs.existsSync(STORE_DIR)) fs.mkdirSync(STORE_DIR, { recursive: true });
    fs.writeFileSync(TICKETS_FILE, JSON.stringify(tickets, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Error writing tickets store:', e);
  }
}

app.get('/api/tickets', (req, res) => {
  const { campanaLeaderId } = req.query;
  const tickets = readTicketsStore();
  if (campanaLeaderId) {
    return res.json(tickets.filter((t: any) => t.campanaLeaderId === campanaLeaderId));
  }
  res.json(tickets);
});

app.post('/api/tickets', (req, res) => {
  try {
    const ticketData = req.body;
    const tickets = readTicketsStore();
    const newTicket = {
      id: ticketData.id || `TCK-${Math.floor(1000 + Math.random() * 9000)}`,
      campanaLeaderId: ticketData.campanaLeaderId,
      campanaLeaderName: ticketData.campanaLeaderName,
      campanaTerritory: ticketData.campanaTerritory || 'General',
      campanaUserEmail: ticketData.campanaUserEmail || '',
      subject: ticketData.subject,
      category: ticketData.category || 'soporte_tecnico',
      priority: ticketData.priority || 'media',
      status: ticketData.status || 'abierto',
      createdAt: ticketData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: Array.isArray(ticketData.messages) ? ticketData.messages : [],
    };
    tickets.unshift(newTicket);
    writeTicketsStore(tickets);
    res.status(201).json(newTicket);
  } catch (err: any) {
    res.status(500).json({ error: 'Error al crear ticket', details: err.message });
  }
});

app.post('/api/tickets/:id/messages', (req, res) => {
  try {
    const { id } = req.params;
    const { message, newStatus } = req.body;
    const tickets = readTicketsStore();
    const ticketIndex = tickets.findIndex((t: any) => t.id === id);
    if (ticketIndex === -1) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }
    const ticket = tickets[ticketIndex];
    if (message) {
      ticket.messages.push({
        id: message.id || `msg-${Date.now()}`,
        senderId: message.senderId,
        senderName: message.senderName,
        senderRole: message.senderRole,
        message: message.message,
        createdAt: new Date().toISOString(),
      });
    }
    if (newStatus) {
      ticket.status = newStatus;
    }
    ticket.updatedAt = new Date().toISOString();
    writeTicketsStore(tickets);
    res.json(ticket);
  } catch (err: any) {
    res.status(500).json({ error: 'Error al enviar mensaje', details: err.message });
  }
});

app.patch('/api/tickets/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority } = req.body;
    const tickets = readTicketsStore();
    const ticket = tickets.find((t: any) => t.id === id);
    if (!ticket) return res.status(404).json({ error: 'Ticket no encontrado' });
    if (status) ticket.status = status;
    if (priority) ticket.priority = priority;
    ticket.updatedAt = new Date().toISOString();
    writeTicketsStore(tickets);
    res.json(ticket);
  } catch (err: any) {
    res.status(500).json({ error: 'Error al actualizar ticket', details: err.message });
  }
});

// --- SERVE COMPILED VITE CLIENT WITH RUNTIME ENV INJECTION ---
const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(distPath, { index: false }));

app.use((req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  try {
    if (fs.existsSync(indexPath)) {
      let html = fs.readFileSync(indexPath, 'utf-8');
      const envData = {
        VITE_AUTH_MODE: 'closed_system',
        VITE_SUPERADMIN_EMAIL: (process.env.SUPERADMIN_EMAIL || process.env.VITE_SUPERADMIN_EMAIL || 'usrubenroqueguzman@gmail.com').toLowerCase(),
      };
      const envTag = `<script>window.__ENV__ = ${JSON.stringify(envData)};</script>`;
      html = html.replace('</head>', `${envTag}</head>`);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.send(html);
      return;
    }
  } catch (e) {
    console.warn('Fallback a sendFile para index.html:', e);
  }
  res.sendFile(indexPath);
});

// Escuchar en puerto principal
app.listen(PORT, '0.0.0.0', () => {
  console.log(`=== Servidor de Producción escuchando en http://0.0.0.0:${PORT} ===`);
});

// Compatibilidad con puerto 80
if (PORT !== 80) {
  try {
    const server80 = app.listen(80, '0.0.0.0', () => {
      console.log('=== Servidor también escuchando en puerto 80 ===');
    });
    server80.on('error', (err: any) => {
      console.warn('Aviso: Puerto 80 no disponible o reservado:', err.message);
    });
  } catch (e) {}
}

// Sincronización asíncrona de PostgreSQL
async function ensureDbSchema() {
  if (!process.env.DATABASE_URL) return;
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Leader" ADD COLUMN IF NOT EXISTS "address" TEXT;
      ALTER TABLE "Leader" ADD COLUMN IF NOT EXISTS "colonia" TEXT;
      ALTER TABLE "Leader" ADD COLUMN IF NOT EXISTS "electoralSection" TEXT;
      ALTER TABLE "Leader" ADD COLUMN IF NOT EXISTS "curp" TEXT;
      ALTER TABLE "Leader" ADD COLUMN IF NOT EXISTS "electorKey" TEXT;
      ALTER TABLE "Leader" ADD COLUMN IF NOT EXISTS "inePhotoUrl" TEXT;
      ALTER TABLE "Leader" ADD COLUMN IF NOT EXISTS "vigencia" TEXT;
      ALTER TABLE "Leader" ADD COLUMN IF NOT EXISTS "changelog" JSONB;
      ALTER TABLE "UserAccount" ADD COLUMN IF NOT EXISTS "password" TEXT;
      ALTER TABLE "UserAccount" ADD COLUMN IF NOT EXISTS "phone" TEXT;
      ALTER TABLE "UserAccount" ADD COLUMN IF NOT EXISTS "aboutMe" TEXT;
    `);
    console.log('✓ Columnas de esquema verificadas en base de datos PostgreSQL.');
  } catch (err: any) {
    console.warn('Aviso en ensureDbSchema:', err.message);
  }
}

async function syncDatabase() {
  if (!process.env.DATABASE_URL) {
    console.log('DATABASE_URL no configurada; operando con base de datos en memoria/local.');
    return;
  }
  try {
    await ensureDbSchema();
    console.log('Sincronizando esquema con Prisma...');
    const pushResult = await execAsync('npx prisma db push --skip-generate --accept-data-loss');
    console.log(pushResult.stdout);

    console.log('Verificando inicialización de datos para entorno real...');
    const seedResult = await execAsync('npx tsx prisma/seed.ts');
    console.log(seedResult.stdout);
    
    console.log('✓ Base de datos PostgreSQL lista y conectada en modo real.');
  } catch (error: any) {
    console.warn('Aviso en inicialización de BD:', error.message);
  }
}

setTimeout(syncDatabase, 500);

