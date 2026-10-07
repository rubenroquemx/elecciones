import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { INITIAL_SECTIONS } from '../src/data/mockSectionsData';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const prisma = new PrismaClient();

async function main() {
  console.log('--- Iniciando verificación y configuración para Entorno Real ---');

  // 1. Limpieza de datos de prueba en tabla Leader
  try {
    const deletedLeaders = await prisma.leader.deleteMany({});
    console.log(`✓ Eliminados ${deletedLeaders.count} registros de líderes/promovidos de ejemplo. Tabla Leader limpia.`);
  } catch (err: any) {
    console.warn('Aviso limpiando líderes:', err.message);
  }

  // 2. Configuración exclusiva de la cuenta Super Administrador desde variables de entorno
  const superadminEmail = (process.env.SUPERADMIN_EMAIL || process.env.VITE_SUPERADMIN_EMAIL || 'usrubenroqueguzman@gmail.com').toLowerCase();
  const superadminPassword = process.env.SUPERADMIN_PASSWORD || process.env.VITE_SUPERADMIN_PASSWORD || 'admin123';
  const superadminUsername = superadminEmail.includes('@') ? superadminEmail.split('@')[0] : superadminEmail;

  try {
    const deletedUsers = await prisma.userAccount.deleteMany({
      where: {
        email: { not: superadminEmail }
      }
    });
    console.log(`✓ Eliminadas ${deletedUsers.count} cuentas de prueba. Solo existe la cuenta de Super Administrador.`);

    await prisma.userAccount.upsert({
      where: { email: superadminEmail },
      update: {
        username: superadminUsername,
        name: 'Super Administrador',
        password: superadminPassword,
        level: 'admin',
        territoryName: 'Nivel Central (Acceso Total)',
        accountRoleLabel: 'Super Administrador',
        isSuperAdmin: true,
        avatarBg: 'bg-[#9d2449]',
      },
      create: {
        id: 'usr-superadmin',
        email: superadminEmail,
        username: superadminUsername,
        name: 'Super Administrador',
        password: superadminPassword,
        leaderId: null,
        level: 'admin',
        territoryName: 'Nivel Central (Acceso Total)',
        avatarBg: 'bg-[#9d2449]',
        accountRoleLabel: 'Super Administrador',
        isSuperAdmin: true,
      },
    });
    console.log(`✓ Cuenta Super Administrador configurada: ${superadminEmail} / [password configurada desde env]`);
  } catch (err: any) {
    console.warn('Aviso configurando cuenta Super Administrador:', err.message);
  }

  // 3. Verificar Secciones Electorales Geográficas (Cartografía Real INE)
  const sectionCount = await prisma.electoralSection.count();
  console.log(`Secciones electorales en base de datos: ${sectionCount}`);

  if (sectionCount === 0) {
    console.log(`Sembrando ${INITIAL_SECTIONS.length} secciones electorales con cartografía oficial...`);
    for (const sec of INITIAL_SECTIONS) {
      await prisma.electoralSection.create({
        data: {
          id: sec.id,
          sectionNumber: sec.sectionNumber,
          district: sec.district,
          municipality: sec.municipality,
          nominalList: sec.nominalList,
          geometry: sec.geometry ? (sec.geometry as any) : undefined,
          structures: {
            create: [],
          },
        },
      });
    }
    console.log('✓ Secciones electorales cartográficas listas.');
  }

  // 4. Catálogo Nacional Electoral
  const catalogCount = await prisma.electoralSectionCatalog.count();
  console.log(`Catálogo de secciones electorales en base de datos: ${catalogCount}`);

  if (catalogCount === 0) {
    const csvPath = path.join(__dirname, 'data/catalogo_nacional_electoral.csv');
    if (fs.existsSync(csvPath)) {
      console.log('Sembrando Catálogo Nacional Electoral...');
      const readline = await import('readline');
      const fileStream = fs.createReadStream(csvPath, { encoding: 'utf-8' });
      const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

      let isHeader = true;
      let batch: any[] = [];
      let totalInserted = 0;

      for await (const line of rl) {
        if (isHeader) {
          isHeader = false;
          continue;
        }
        if (!line.trim()) continue;

        const parts = line.split(',');
        if (parts.length >= 13) {
          batch.push({
            stateId: parseInt(parts[0], 10),
            stateName: parts[1],
            federalDistrict: parseInt(parts[2], 10) || 0,
            districtHead: parts[3] || null,
            localDistrict: parseInt(parts[4], 10) || 0,
            municipalityId: parseInt(parts[5], 10) || 0,
            municipalityName: parts[6],
            section: parts[7],
            sectionType: parts[8],
            nominalMen: parseInt(parts[9], 10) || 0,
            nominalWomen: parseInt(parts[10], 10) || 0,
            nominalNonBinary: parseInt(parts[11], 10) || 0,
            nominalTotal: parseInt(parts[12], 10) || 0,
          });

          if (batch.length >= 5000) {
            await prisma.electoralSectionCatalog.createMany({
              data: batch,
              skipDuplicates: true,
            });
            totalInserted += batch.length;
            console.log(`  -> Insertadas ${totalInserted} secciones...`);
            batch = [];
          }
        }
      }

      if (batch.length > 0) {
        await prisma.electoralSectionCatalog.createMany({
          data: batch,
          skipDuplicates: true,
        });
        totalInserted += batch.length;
      }
      console.log(`✓ Catálogo Nacional listo (${totalInserted} secciones).`);
    }
  }

  console.log('--- Base de datos preparada en modo real. Solo superadmin activo. ---');
}

main()
  .catch((e) => {
    console.error('Error durante la inicialización de base de datos:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
