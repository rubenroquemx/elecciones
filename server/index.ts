import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health Check
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
    console.error('Error fetching leaders:', err);
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

// 4. Delete a leader (with safe re-parenting of descendants)
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

// 5. Get sections with structures
app.get('/api/sections', async (req, res) => {
  try {
    const sections = await prisma.electoralSection.findMany({
      include: { structures: true },
      orderBy: { sectionNumber: 'asc' },
    });
    res.json(sections);
  } catch (err: any) {
    console.error('Error fetching sections:', err);
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

// 7. Add structure to section
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

// --- AUTH / USER LOOKUP ---
app.get('/api/auth/user', async (req, res) => {
  try {
    const email = (req.query.email as string)?.toLowerCase();
    if (!email) {
      return res.status(400).json({ error: 'Email requerido' });
    }

    const superadminEmail = (process.env.SUPERADMIN_EMAIL || 'usrubenroque@gmail.com').toLowerCase();
    if (email === superadminEmail) {
      return res.json({
        id: 'usr-superadmin',
        email,
        username: 'usrubenroque',
        name: 'Ruben Roque',
        leaderId: null,
        level: 'admin',
        territoryName: 'Tabasco Completo (Superadministrador)',
        accountRoleLabel: 'Superadministrador',
        avatarBg: 'bg-purple-700',
        isSuperAdmin: true,
      });
    }

    // Check in database UserAccount or Leader
    const userAcc = await prisma.userAccount.findUnique({ where: { email } });
    if (userAcc) {
      return res.json(userAcc);
    }

    const leader = await prisma.leader.findFirst({ where: { email } });
    if (leader) {
      return res.json({
        id: `usr-${leader.id}`,
        email: leader.email,
        username: leader.username || email.split('@')[0],
        name: leader.name,
        leaderId: leader.id,
        level: leader.level,
        territoryName: leader.territoryName,
        accountRoleLabel: leader.role,
        avatarBg: leader.avatarBg,
      });
    }

    res.status(404).json({ error: 'Usuario no encontrado en la estructura' });
  } catch (err: any) {
    console.error('Error fetching user auth:', err);
    res.status(500).json({ error: 'Error al consultar usuario', details: err.message });
  }
});

// --- SERVE COMPILED VITE CLIENT IN PRODUCTION ---
const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`=== Servidor de Producción corriendo en http://0.0.0.0:${PORT} ===`);
});
