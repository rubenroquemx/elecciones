import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { INITIAL_TERRITORY_DATA } from '../src/data/mockTerritoryData';
import { INITIAL_SECTIONS } from '../src/data/mockSectionsData';
import { MOCK_ACCOUNTS } from '../src/data/mockAuthData';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const prisma = new PrismaClient();


async function main() {
  console.log('--- Iniciando verificación de Base de Datos PostgreSQL ---');

  // 1. Seed Leaders
  const leaderCount = await prisma.leader.count();
  console.log(`Líderes en base de datos: ${leaderCount}`);

  if (leaderCount === 0) {
    console.log(`Sembrando ${INITIAL_TERRITORY_DATA.length} líderes territoriales en Tabasco...`);

    // Insert level by level to respect foreign keys (0: distrital, 1: territorial, 2: seccional, 3: promotor, 4: promovido)
    for (let levelIdx = 0; levelIdx <= 4; levelIdx++) {
      const nodesAtLevel = INITIAL_TERRITORY_DATA.filter((n) => (n.levelIndex ?? 0) === levelIdx);
      console.log(`Insertando nivel ${levelIdx} (${nodesAtLevel.length} registros)...`);

      for (const node of nodesAtLevel) {
        await prisma.leader.create({
          data: {
            id: node.id,
            name: node.name,
            role: node.role,
            level: node.level,
            levelIndex: node.levelIndex ?? levelIdx,
            parentId: node.parentId,
            territoryName: node.territoryName,
            code: node.code || null,
            phone: node.phone || null,
            email: node.email || null,
            username: node.username || null,
            hasAccount: node.hasAccount ?? (node.level !== 'promovido'),
            metaGoal: node.metaGoal ?? 0,
            currentCount: node.currentCount ?? 0,
            status: node.status || 'en_progreso',
            validationStatus: node.validationStatus || 'validado',
            notes: node.notes || null,
            avatarBg: node.avatarBg || 'bg-indigo-600',
          },
        });
      }
    }
    console.log('✓ Líderes territoriales sembrados correctamente.');
  }

  // 2. Seed Electoral Sections & Structures
  const sectionCount = await prisma.electoralSection.count();
  console.log(`Secciones electorales en base de datos: ${sectionCount}`);

  if (sectionCount === 0) {
    console.log(`Sembrando ${INITIAL_SECTIONS.length} secciones electorales con cartografía...`);
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
            create: sec.structures.map((st) => ({
              id: st.id,
              name: st.name,
              leaderName: st.leaderName,
              targetCount: st.targetCount,
              currentCount: st.currentCount,
              status: st.status,
              rootLeaderId: st.rootLeaderId || null,
              color: st.color || 'bg-sky-500',
            })),
          },
        },
      });
    }
    console.log('✓ Secciones electorales sembradas correctamente.');
  }

  // 3. Seed Accounts
  const userCount = await prisma.userAccount.count();
  console.log(`Cuentas de usuario en base de datos: ${userCount}`);

  if (userCount === 0) {
    console.log('Sembrando cuentas de usuario y Superadministrador...');
    // Seed Superadmin
    const superadminEmail = (process.env.SUPERADMIN_EMAIL || 'usrubenroque@gmail.com').toLowerCase();
    await prisma.userAccount.upsert({
      where: { email: superadminEmail },
      update: {},
      create: {
        id: 'usr-superadmin',
        email: superadminEmail,
        username: 'usrubenroque',
        name: 'Ruben Roque',
        leaderId: null,
        level: 'admin',
        territoryName: 'Tabasco Completo (Acceso Total)',
        avatarBg: 'bg-purple-700',
        accountRoleLabel: 'Superadministrador',
        isSuperAdmin: true,
      },
    });

    // Seed mock accounts
    for (const acc of MOCK_ACCOUNTS) {
      await prisma.userAccount.upsert({
        where: { email: acc.email.toLowerCase() },
        update: {},
        create: {
          id: acc.id,
          email: acc.email.toLowerCase(),
          username: acc.username,
          name: acc.name,
          leaderId: acc.leaderId,
          level: acc.level,
          territoryName: acc.territoryName,
          avatarBg: acc.avatarBg,
          accountRoleLabel: acc.accountRoleLabel,
          isSuperAdmin: acc.level === 'admin',
        },
      });
    }
    console.log('✓ Cuentas de usuario sembradas correctamente.');
  }

  // 4. Seed National Electoral Catalog
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

        // CLAVE_ENTIDAD,NOMBRE_ENTIDAD,DISTRITO_FEDERAL,CABECERA_DISTRITAL,DISTRITO_LOCAL,CLAVE_MUNICIPIO,NOMBRE_MUNICIPIO,SECCION,TIPO_SECCION,LISTA_HOMBRES,LISTA_MUJERES,LISTA_NO_BINARIO,LISTA_NOMINAL
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
      console.log(`✓ Catálogo Nacional sembrado exitosamente (${totalInserted} secciones).`);
    }
  }

  console.log('--- Proceso de inicialización de Base de Datos completado con éxito ---');

}

main()
  .catch((e) => {
    console.error('Error durante la siembra de base de datos:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
