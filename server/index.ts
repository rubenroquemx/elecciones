import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import { PrismaClient } from '@prisma/client';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const prisma = new PrismaClient();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Config pública del servidor (Sistema Cerrado)
app.get('/api/config', (req, res) => {
  res.json({
    authMode: 'closed_system',
    superadminEmail: process.env.SUPERADMIN_EMAIL || process.env.VITE_SUPERADMIN_EMAIL || 'admin@estrategia-territorial.mx'
  });
});

// Estado de disponibilidad de Inteligencia Artificial (Gemini Vision)
app.get('/api/gemini-status', (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  res.json({ available: Boolean(apiKey) });
});

// Endpoint de Extracción de Datos de INE con Inteligencia Artificial (Gemini Vision)
app.post('/api/scan-ine-ai', async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Imagen requerida' });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'API Key de IA no configurada en el servidor' });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
    const mimeMatch = imageBase64.match(/^data:(image\/[a-zA-Z+]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

    const promptText = `Eres un asistente experto en reconocimiento y extracción de credenciales de elector del INE (Instituto Nacional Electoral) de México.
Analiza con máxima precisión esta credencial (puede ser anverso, reverso o ambas).

Extrae exactamente los datos oficiales y responde ÚNICAMENTE un objeto JSON válido con estos campos:
{
  "name": "NOMBRE COMPLETO (Nombres y apellidos completos ordenados)",
  "claveElector": "CLAVE DE ELECTOR (18 caracteres alfanuméricos oficiales)",
  "curp": "CURP (18 caracteres)",
  "electoralSection": "SECCIÓN ELECTORAL (4 dígitos numéricos, ej. 0416)",
  "address": "CALLE Y NÚMERO EXTERIOR/INTERIOR",
  "colonia": "COLONIA O LOCALIDAD",
  "municipio": "MUNICIPIO O ALCALDÍA",
  "vigencia": "AÑO O RANGO DE VIGENCIA (ej. 2024-2034 o 2030)",
  "sexo": "Hombre" o "Mujer",
  "detectedSide": "anverso" | "reverso" | "ambos",
  "confidenceScore": 99
}

Reglas:
1. Si un campo no es visible en esta cara, déjalo como null o cadena vacía.
2. Si es el reverso, extrae el nombre y la sección electoral de las 3 líneas MRZ al pie (IDMEX...) o códigos QR/barras.
3. Responde únicamente con el JSON sin bloques de código ni texto adicional.`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: promptText },
            {
              inlineData: {
                mimeType,
                data: cleanBase64
              }
            }
          ]
        }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Error de Gemini API en servidor:', errText);
      return res.status(502).json({ error: 'Error del motor de IA', details: errText });
    }

    const data = await response.json();
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!replyText) {
      return res.status(500).json({ error: 'No se obtuvo respuesta de la IA' });
    }

    const parsed = JSON.parse(replyText);
    res.json(parsed);
  } catch (err: any) {
    console.error('Error en /api/scan-ine-ai:', err);
    res.status(500).json({ error: 'Error al procesar con IA', message: err.message });
  }
});

// --- LEADERS API CON RESPALDO RESILIENTE Y CAMPOS COMPLETOS ---

const STORE_DIR = path.join(__dirname, '../data');
const STORE_FILE = path.join(STORE_DIR, 'leaders_store.json');

function readBackupStore(): any[] {
  try {
    if (!fs.existsSync(STORE_DIR)) fs.mkdirSync(STORE_DIR, { recursive: true });
    if (fs.existsSync(STORE_FILE)) {
      const content = fs.readFileSync(STORE_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
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
    
    // Combinar registros asegurando que no se pierda ninguno
    const mergedMap = new Map<string, any>();
    for (const l of fileLeaders) {
      mergedMap.set(l.id, l);
    }
    for (const l of dbLeaders) {
      const existing = mergedMap.get(l.id) || {};
      mergedMap.set(l.id, { ...existing, ...l });
    }

    const result = Array.from(mergedMap.values());
    if (result.length > fileLeaders.length) {
      writeBackupStore(result);
    }

    res.json(result);
  } catch (err: any) {
    console.warn('Aviso general en /api/leaders:', err.message);
    const fallback = readBackupStore();
    res.json(fallback);
  }
});

app.post('/api/leaders', async (req, res) => {
  try {
    const data = req.body;
    if (!data.id) {
      data.id = `node-${Date.now()}`;
    }

    // 1. Guardar de inmediato en almacenamiento resiliente central
    const currentStore = readBackupStore();
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
          avatarBg: data.avatarBg || 'bg-indigo-600',
          address: data.address || null,
          colonia: data.colonia || null,
          electoralSection: data.electoralSection || null,
          curp: data.curp || null,
          electorKey: data.electorKey || null,
          inePhotoUrl: data.inePhotoUrl || null,
          vigencia: data.vigencia || null,
          changelog: data.changelog ? JSON.parse(JSON.stringify(data.changelog)) : null,
        },
        create: {
          id: data.id,
          name: data.name,
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
          avatarBg: data.avatarBg || 'bg-indigo-600',
          address: data.address || null,
          colonia: data.colonia || null,
          electoralSection: data.electoralSection || null,
          curp: data.curp || null,
          electorKey: data.electorKey || null,
          inePhotoUrl: data.inePhotoUrl || null,
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

    // 1. Actualizar en respaldo central
    const currentStore = readBackupStore();
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
      if (safeParentId) {
        const parentExists = await prisma.leader.findUnique({ where: { id: safeParentId } });
        if (!parentExists) safeParentId = null;
      }

      updatedInDb = await prisma.leader.update({
        where: { id },
        data: {
          name: data.name,
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
          avatarBg: data.avatarBg,
          address: data.address || null,
          colonia: data.colonia || null,
          electoralSection: data.electoralSection || null,
          curp: data.curp || null,
          electorKey: data.electorKey || null,
          inePhotoUrl: data.inePhotoUrl || null,
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
    const target = await prisma.leader.findUnique({ where: { id } });
    if (!target) {
      return res.status(404).json({ error: 'Líder no encontrado' });
    }

    const newParentId = target.parentId || null;
    await prisma.leader.updateMany({
      where: { parentId: id },
      data: { parentId: newParentId },
    });

    await prisma.leader.delete({ where: { id } });
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
        VITE_SUPERADMIN_EMAIL: (process.env.SUPERADMIN_EMAIL || process.env.VITE_SUPERADMIN_EMAIL || 'admin@estrategia-territorial.mx').toLowerCase(),
      };
      const envTag = `<script>window.__ENV__ = ${JSON.stringify(envData)};</script>`;
      html = html.replace('</head>', `${envTag}</head>`);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
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
    app.listen(80, '0.0.0.0', () => {
      console.log('=== Servidor también escuchando en puerto 80 ===');
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
    `);
    console.log('✓ Columnas de ciudadano verificadas en tabla Leader.');
  } catch (err: any) {
    console.warn('Aviso en ensureDbSchema:', err.message);
  }
}

async function syncDatabase() {
  if (!process.env.DATABASE_URL) {
    console.log('DATABASE_URL no configurada; operando con dataset inicial.');
    return;
  }
  try {
    await ensureDbSchema();
    console.log('Sincronizando esquema con Prisma...');
    const pushResult = await execAsync('npx prisma db push --skip-generate --accept-data-loss');
    console.log(pushResult.stdout);

    console.log('Verificando siembra inicial...');
    const seedResult = await execAsync('npx tsx prisma/seed.ts');
    console.log(seedResult.stdout);
    console.log('✓ Base de datos PostgreSQL lista y conectada.');
  } catch (error: any) {
    console.warn('Aviso en inicialización de BD:', error.message);
  }
}

setTimeout(syncDatabase, 500);

