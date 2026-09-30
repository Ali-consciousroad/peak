import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;

async function getRoleNameById(roleId: string | null) {
  if (!roleId) {
    return 'client';
  }
  const role = await prisma.roles.findUnique({ where: { id: roleId } });
  return role?.name || 'client';
}

// Utility to get user by Clerk user ID
export async function getUserByClerkId(clerkUserId: string) {
  return prisma.users.findUnique({
    where: { clerkId: clerkUserId },
  });
}

// Utility to get user with role by Clerk user ID
export async function getUserWithRoleByClerkId(clerkUserId: string) {
  const user = await prisma.users.findUnique({
    where: { clerkId: clerkUserId },
  });
  if (!user) {
    return null;
  }
  const role = await getRoleNameById(user.roleId || null);
  return { ...user, role };
}

// Utility to check if user has specific role
export async function userHasRole(clerkUserId: string, roleName: string) {
  const user = await prisma.users.findUnique({
    where: { clerkId: clerkUserId },
  });

  if (!user) {
    return false;
  }
  const role = await getRoleNameById(user.roleId || null);
  return role === roleName;
}

// Utility to get user permissions
export async function getUserPermissions(clerkUserId: string) {
  const user = await prisma.users.findUnique({
    where: { clerkId: clerkUserId },
  });

  if (!user) {
    return null;
  }

  // Define permissions based on role
  const permissions = {
    client: {
      canManageUsers: false,
      canManageMissions: true,
      canManageServices: false,
      canManagePortfolios: false,
      canManageSkills: false,
      canManageContracts: true,
      canManagePayments: true,
      canAccessAdminPanel: false,
      canAccessSupportPanel: false,
    },
    freelance: {
      canManageUsers: false,
      canManageMissions: false,
      canManageServices: true,
      canManagePortfolios: true,
      canManageSkills: true,
      canManageContracts: true,
      canManagePayments: false,
      canAccessAdminPanel: false,
      canAccessSupportPanel: false,
    },
    admin: {
      canManageUsers: true,
      canManageMissions: true,
      canManageServices: true,
      canManagePortfolios: true,
      canManageSkills: true,
      canManageContracts: true,
      canManagePayments: true,
      canAccessAdminPanel: true,
      canAccessSupportPanel: true,
    },
    support: {
      canManageUsers: false,
      canManageMissions: true,
      canManageServices: false,
      canManagePortfolios: false,
      canManageSkills: false,
      canManageContracts: true,
      canManagePayments: false,
      canAccessAdminPanel: false,
      canAccessSupportPanel: true,
    },
  };

  const role = await getRoleNameById(user.roleId || null);
  return permissions[role as keyof typeof permissions] || permissions.client;
}
 