import express from 'express';
import cors from 'cors';
import path from 'path';
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

// Health Check inmediato para Easypanel / Traefik
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- LEADERS API ---

// 1. Get all leaders
app.get('/api/leaders', async (req, res) => {
  try {
    const leaders = await prisma.leader.findMany({
      orderBy: [{ levelIndex: 'asc' }, { name: 'asc' }],
    });
    res.json(leaders);
  } catch (err: any) {
    console.warn('Aviso al consultar líderes en BD (usando fallback en frontend si aplica):', err.message);
    res.status(500).json({ error: 'Error al obtener líderes territoriales', details: err.message });
  }
});

// 2. Create a leader
app.post('/api/leaders', async (req, res) => {
  try {
    const data = req.body;
    if (!data.id) {
      data.id = `node-${Date.now()}`;
    }

    const created = await prisma.leader.create({
      data: {
        id: data.id,
        name: data.name,
        role: data.role,
        level: data.level,
        levelIndex: Number(data.levelIndex) || 0,
        parentId: data.parentId || null,
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
      },
    });

    res.status(201).json(created);
  } catch (err: any) {
    console.error('Error creating leader:', err);
    res.status(500).json({ error: 'Error al registrar líder territorial', details: err.message });
  }
});

// 3. Update a leader
app.put('/api/leaders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const updated = await prisma.leader.update({
      where: { id },
      data: {
        name: data.name,
        role: data.role,
        level: data.level,
        levelIndex: Number(data.levelIndex) || 0,
        parentId: data.parentId || null,
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
      },
    });

    res.json(updated);
  } catch (err: any) {
    console.error('Error updating leader:', err);
    res.status(500).json({ error: 'Error al actualizar líder territorial', details: err.message });
  }
});

// 4. Delete a leader
app.delete('/api/leaders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const target = await prisma.leader.findUnique({ where: { id } });
    if (!target) {
      return res.status(404).json({ error: 'Líder no encontrado' });
    }

    const newParentId = target.parentId || null;

    // Re-parent children to parent of deleted node
    await prisma.leader.updateMany({
      where: { parentId: id },
      data: { parentId: newParentId },
    });

    await prisma.leader.delete({ where: { id } });

    res.json({ success: true, deletedId: id, reparentedTo: newParentId });
  } catch (err: any) {
    console.error('Error deleting leader:', err);
    res.status(500).json({ error: 'Error al eliminar líder territorial', details: err.message });
  }
});

// --- ELECTORAL SECTIONS API ---

// 5. Get sections
app.get('/api/sections', async (req, res) => {
  try {
    const sections = await prisma.electoralSection.findMany({
      include: { structures: true },
      orderBy: { sectionNumber: 'asc' },
    });
    res.json(sections);
  } catch (err: any) {
    console.warn('Aviso al consultar secciones en BD:', err.message);
    res.status(500).json({ error: 'Error al obtener secciones electorales', details: err.message });
  }
});

// 6. Create section
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
    console.error('Error creating section:', err);
    res.status(500).json({ error: 'Error al crear sección electoral', details: err.message });
  }
});

// 7. Add structure
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
    console.error('Error adding structure to section:', err);
    res.status(500).json({ error: 'Error al agregar estructura territorial', details: err.message });
  }
});

// --- SERVE COMPILED VITE CLIENT ---
const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Iniciar servidor inmediatamente para satisfacer healthcheck de Easypanel / Traefik
app.listen(PORT, '0.0.0.0', () => {
  console.log(`=== Servidor de Producción escuchando en http://0.0.0.0:${PORT} ===`);
});

// Compatibilidad: si el puerto no es 80, también escuchar en el 80 si está libre
if (PORT !== 80) {
  try {
    app.listen(80, '0.0.0.0', () => {
      console.log('=== Servidor también escuchando en puerto 80 para enrutamiento directo ===');
    });
  } catch (e) {
    // Ignorar si el puerto 80 está reservado
  }
}

// Inicializar la base de datos de manera asíncrona y segura (sin tirar el contenedor si hay espera de red)
async function syncDatabase() {
  if (!process.env.DATABASE_URL) {
    console.log('DATABASE_URL no configurada; operando con dataset base.');
    return;
  }
  try {
    console.log('Iniciando sincronización de esquema PostgreSQL con Prisma...');
    const pushResult = await execAsync('npx prisma db push --skip-generate --accept-data-loss');
    console.log(pushResult.stdout);

    console.log('Verificando siembra inicial de datos...');
    const seedResult = await execAsync('npx tsx prisma/seed.ts');
    console.log(seedResult.stdout);
    console.log('✓ Base de datos sincronizada y lista.');
  } catch (error: any) {
    console.warn('Aviso en inicialización de base de datos:', error.message);
  }
}

setTimeout(syncDatabase, 500);
