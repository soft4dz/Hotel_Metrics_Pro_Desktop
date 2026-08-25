import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Rôles système
  const roles = await Promise.all([
    prisma.role.upsert({
      where: { code: 'GLOBAL_ADMIN' },
      update: {},
      create: { code: 'GLOBAL_ADMIN', label: 'Administrateur global', isSystem: true },
    }),
    prisma.role.upsert({
      where: { code: 'ADMIN' },
      update: {},
      create: { code: 'ADMIN', label: 'Administrateur hôtel', isSystem: true },
    }),
    prisma.role.upsert({
      where: { code: 'MANAGER' },
      update: {},
      create: { code: 'MANAGER', label: 'Directeur', isSystem: false },
    }),
    prisma.role.upsert({
      where: { code: 'COMPTABLE' },
      update: {},
      create: { code: 'COMPTABLE', label: 'Comptable', isSystem: false },
    }),
    prisma.role.upsert({
      where: { code: 'RECEPTIONNISTE' },
      update: {},
      create: { code: 'RECEPTIONNISTE', label: 'Réceptionniste', isSystem: false },
    }),
    prisma.role.upsert({
      where: { code: 'VIEWER' },
      update: {},
      create: { code: 'VIEWER', label: 'Lecture seule', isSystem: false },
    }),
  ]);

  const globalAdminRole = roles[0];

  // Utilisateur superadmin
  const initialPassword = process.env.ADMIN_INITIAL_PASSWORD;
  if (!initialPassword || initialPassword.length < 14 || Buffer.byteLength(initialPassword, 'utf8') > 72) {
    throw new Error('ADMIN_INITIAL_PASSWORD doit contenir entre 14 caractères et 72 octets.');
  }
  const hash = await bcrypt.hash(initialPassword, 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@raqmi.local' },
    update: {},
    create: {
      email: 'admin@raqmi.local',
      passwordHash: hash,
      firstName: 'Super',
      lastName: 'Admin',
      roleId: globalAdminRole.id,
      mustChangePassword: true,
    },
  });

  console.log(`✓ Roles: ${roles.length}`);
  console.log(`✓ Admin initialisé: ${admin.email}`);
  console.log('⚠ Changez le mot de passe à la première connexion.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
