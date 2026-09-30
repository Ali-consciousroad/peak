import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

// Role-based permissions
const rolePermissions = {
  client: {
    canManageUsers: false,
    canManageMissions: true, // Can create/edit their own missions
    canManageServices: false,
    canManagePortfolios: false,
    canManageSkills: false,
    canManageContracts: true, // Can manage their own contracts
    canManagePayments: true,
    canAccessAdminPanel: false,
    canAccessSupportPanel: false,
  },
  freelance: {
    canManageUsers: false,
    canManageMissions: false,
    canManageServices: true, // Can manage their own services
    canManagePortfolios: true, // Can manage their own portfolios
    canManageSkills: true, // Can manage their own skills
    canManageContracts: true, // Can view contracts they're involved in
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

// Helper function to get user permissions
async function getRoleNameById(roleId: string | null) {
  if (!roleId) {
    return 'client';
  }
  const role = await prisma.roles.findUnique({ where: { id: roleId } });
  return role?.name || 'client';
}

export async function getUserPermissions(userId: string) {
  const user = await prisma.users.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return null;
  }

  const role = await getRoleNameById(user.roleId || null);
  
  return rolePermissions[role as keyof typeof rolePermissions] || rolePermissions.client;
}

// Helper function to check if user has a specific role
export async function userHasRole(userId: string, roleName: string) {
  const user = await prisma.users.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return false;
  }

  const role = await getRoleNameById(user.roleId || null);
  return role === roleName;
}

// Helper function to get current user with role
export async function getCurrentUser() {
  const { userId } = await auth();
  
  if (!userId) {
    return null;
  }

  const user = await prisma.users.findUnique({
    where: { clerkId: userId },
  });

  if (!user) {
    return null;
  }

  const roleName = await getRoleNameById(user.roleId || null);
  return {
    ...user,
    role: roleName,
    permissions: rolePermissions[roleName as keyof typeof rolePermissions] || rolePermissions.client,
  };
}

// Helper function to check if current user has permission
export async function currentUserHasPermission(permission: keyof typeof rolePermissions.client) {
  const user = await getCurrentUser();
  
  if (!user) {
    return false;
  }

  return user.permissions[permission] || false;
}

// Helper function to check if current user has role
export async function currentUserHasRole(roleName: string) {
  const user = await getCurrentUser();
  
  if (!user) {
    return false;
  }

  return user.role === roleName;
} 