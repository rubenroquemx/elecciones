import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import { PrismaClient } from '@prisma/client';
import { INITIAL_TERRITORY_DATA } from '../src/data/mockTerritoryData';

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

const STORE_DIR = path.join(__dirname, '../data');
const STORE_FILE = path.join(STORE_DIR, 'leaders_store.json');
const DELETED_FILE = path.join(STORE_DIR, 'deleted_leaders_store.json');

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
    const deletedSet = readDeletedStore();
    
    // Combinar registros asegurando que no se pierda ninguno y omitir eliminados
    const mergedMap = new Map<string, any>();
    for (const b of INITIAL_TERRITORY_DATA) {
      if (!deletedSet.has(b.id)) {
        mergedMap.set(b.id, b);
      }
    }
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

    // Vincular promovidos de sección 0416 o 0417 a prom-ruben-roque si no tienen padre asignado
    for (const [id, item] of mergedMap.entries()) {
      if (
        item.level === 'promovido' &&
        (!item.parentId || item.parentId === 'null') &&
        (item.electoralSection === '0416' || item.electoralSection === '0417' || item.id.startsWith('promovido-ruben-') || item.id.startsWith('field-promovido-'))
      ) {
        mergedMap.set(id, { ...item, parentId: 'prom-ruben-roque' });
      }
    }

    const result = Array.from(mergedMap.values()).filter(l => !deletedSet.has(l.id));
    if (result.length > fileLeaders.length) {
      writeBackupStore(result);
    }

    res.json(result);
  } catch (err: any) {
    console.warn('Aviso general en /api/leaders:', err.message);
    const fallback = readBackupStore();
    const deletedSet = readDeletedStore();
    const safeFallback = fallback.filter(l => !deletedSet.has(l.id));
    res.json(safeFallback.length > 0 ? safeFallback : INITIAL_TERRITORY_DATA);
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

app.post('/api/leaders', async (req, res) => {
  try {
    const data = req.body;
    if (!data.id) {
      data.id = `node-${Date.now()}`;
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

    if (data.level === 'promovido' && (!data.parentId || data.parentId === 'null') && (data.electoralSection === '0416' || data.electoralSection === '0417')) {
      data.parentId = 'prom-ruben-roque';
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
        let parentExists = await prisma.leader.findUnique({ where: { id: safeParentId } });
        if (!parentExists) {
          const baseParent = INITIAL_TERRITORY_DATA.find(b => b.id === safeParentId);
          if (baseParent) {
            try {
              await prisma.leader.upsert({
                where: { id: baseParent.id },
                update: {},
                create: {
                  id: baseParent.id,
                  name: baseParent.name,
                  role: baseParent.role,
                  level: baseParent.level,
                  levelIndex: baseParent.levelIndex ?? 2,
                  parentId: baseParent.parentId,
                  territoryName: baseParent.territoryName,
                  code: baseParent.code || null,
                  phone: baseParent.phone || null,
                  email: baseParent.email || null,
                  username: baseParent.username || null,
                  hasAccount: true,
                  status: 'en_progreso',
                  validationStatus: 'validado',
                  notes: baseParent.notes || null,
                  avatarBg: baseParent.avatarBg || 'bg-emerald-600',
                  address: baseParent.address || null,
                  colonia: baseParent.colonia || null,
                  electoralSection: baseParent.electoralSection || null,
                  curp: baseParent.curp || null,
                  electorKey: baseParent.electorKey || null,
                },
              });
              parentExists = await prisma.leader.findUnique({ where: { id: safeParentId } });
            } catch (err: any) {
              console.warn('Aviso auto-creando padre base:', err.message);
            }
          }
        }
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

    const deletedSet = readDeletedStore();
    if (deletedSet.has(id) && !data.reRegister) {
      console.warn(`Intento de actualización bloqueado para registro eliminado: ${id}`);
      return res.status(409).json({ error: 'Registro eliminado previamente', id, deleted: true });
    }

    if (data.reRegister) {
      removeDeletedId(id);
    }

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
      if ((!safeParentId || safeParentId === 'null') && data.level === 'promovido' && (data.electoralSection === '0416' || data.electoralSection === '0417')) {
        safeParentId = 'prom-ruben-roque';
      }
      if (safeParentId) {
        let parentExists = await prisma.leader.findUnique({ where: { id: safeParentId } });
        if (!parentExists) {
          const baseParent = INITIAL_TERRITORY_DATA.find(b => b.id === safeParentId);
          if (baseParent) {
            try {
              await prisma.leader.upsert({
                where: { id: baseParent.id },
                update: {},
                create: {
                  id: baseParent.id,
                  name: baseParent.name,
                  role: baseParent.role,
                  level: baseParent.level,
                  levelIndex: baseParent.levelIndex ?? 2,
                  parentId: baseParent.parentId,
                  territoryName: baseParent.territoryName,
                  code: baseParent.code || null,
                  phone: baseParent.phone || null,
                  email: baseParent.email || null,
                  username: baseParent.username || null,
                  hasAccount: true,
                  status: 'en_progreso',
                  validationStatus: 'validado',
                  notes: baseParent.notes || null,
                  avatarBg: baseParent.avatarBg || 'bg-emerald-600',
                  address: baseParent.address || null,
                  colonia: baseParent.colonia || null,
                  electoralSection: baseParent.electoralSection || null,
                  curp: baseParent.curp || null,
                  electorKey: baseParent.electorKey || null,
                },
              });
              parentExists = await prisma.leader.findUnique({ where: { id: safeParentId } });
            } catch (err: any) {
              console.warn('Aviso auto-creando padre base en PUT:', err.message);
            }
          }
        }
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

    // 1. Marcar como borrado definitivo (tombstone)
    addDeletedId(id);

    // 2. Eliminar de almacenamiento central resiliente
    const currentStore = readBackupStore();
    const filteredStore = currentStore.filter((l: any) => l.id !== id);
    writeBackupStore(filteredStore);

    // 3. Eliminar de PostgreSQL si existe
    try {
      const target = await prisma.leader.findUnique({ where: { id } });
      if (target) {
        const newParentId = target.parentId || null;
        await prisma.leader.updateMany({
          where: { parentId: id },
          data: { parentId: newParentId },
        });
        await prisma.leader.delete({ where: { id } });
      }
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

async function ensureCoreHierarchyAndLinkages() {
  try {
    const deletedSet = readDeletedStore();
    for (let levelIdx = 0; levelIdx <= 4; levelIdx++) {
      const nodesAtLevel = INITIAL_TERRITORY_DATA.filter((n) => (n.levelIndex ?? 0) === levelIdx && !deletedSet.has(n.id));
      for (const node of nodesAtLevel) {
        let safeParentId = node.parentId || null;
        if (safeParentId) {
          const parentExists = await prisma.leader.findUnique({ where: { id: safeParentId } });
          if (!parentExists) safeParentId = null;
        }

        await prisma.leader.upsert({
          where: { id: node.id },
          update: {
            name: node.name,
            role: node.role,
            level: node.level,
            levelIndex: node.levelIndex ?? levelIdx,
            parentId: safeParentId,
            territoryName: node.territoryName,
          },
          create: {
            id: node.id,
            name: node.name,
            role: node.role,
            level: node.level,
            levelIndex: node.levelIndex ?? levelIdx,
            parentId: safeParentId,
            territoryName: node.territoryName,
            code: node.code || null,
            phone: node.phone || null,
            email: node.email || null,
            username: node.username || null,
            hasAccount: node.hasAccount ?? (node.level !== 'promovido'),
            metaGoal: Number(node.metaGoal) || 0,
            currentCount: Number(node.currentCount) || 0,
            status: node.status || 'en_progreso',
            validationStatus: node.validationStatus || 'validado',
            notes: node.notes || null,
            avatarBg: node.avatarBg || 'bg-indigo-600',
            address: node.address || null,
            colonia: node.colonia || null,
            electoralSection: node.electoralSection || null,
            curp: node.curp || null,
            electorKey: node.electorKey || null,
            inePhotoUrl: node.inePhotoUrl || null,
            vigencia: node.vigencia || null,
            changelog: node.changelog ? JSON.parse(JSON.stringify(node.changelog)) : null,
          },
        });
      }
    }

    // Vincular todos los promovidos de la sección 0416 o de Ruben Roque a prom-ruben-roque
    await prisma.leader.updateMany({
      where: {
        parentId: null,
        level: 'promovido',
        OR: [
          { id: { startsWith: 'promovido-ruben-' } },
          { id: { startsWith: 'field-promovido-' } },
          { electoralSection: '0416' },
          { electoralSection: '0417' },
        ],
      },
      data: {
        parentId: 'prom-ruben-roque',
      },
    });

    console.log('✓ Jerarquía base garantizada y promovidos vinculados a prom-ruben-roque.');
  } catch (err: any) {
    console.warn('Aviso en ensureCoreHierarchyAndLinkages:', err.message);
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
    
    await ensureCoreHierarchyAndLinkages();
    console.log('✓ Base de datos PostgreSQL lista y conectada.');
  } catch (error: any) {
    console.warn('Aviso en inicialización de BD:', error.message);
  }
}

setTimeout(syncDatabase, 500);

